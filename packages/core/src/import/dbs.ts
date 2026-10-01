import type { ParsedStatementRow, ParseBankStatementResult } from "./bank-statement.js";
import { currencySchema } from "../validators/transaction-schema.js";
import type { Currency } from "../types/index.js";

/**
 * DBS (Singapore) CSV export adapter. Calibrated against a real personal
 * statement (never committed — see CLAUDE.md "pièges connus"). Structurally
 * incompatible with the generic Revolut-shaped parser: an 8-line preamble
 * before the real header, amount split across separate Debit/Credit
 * columns instead of one signed column, and DBS-specific statement-code
 * vocabulary (`POS`, `ADV`) needed to clean a usable label out of the raw
 * `Description` text.
 */

const DBS_REQUIRED_HEADERS = ["transaction date", "debit amount", "credit amount"];

function normalizeCell(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Scans every row (not just row 0) for the DBS header signature, so the
 * adapter doesn't depend on the preamble always being exactly 8 lines long.
 * Returns the header row's index, or null if this doesn't look like a DBS
 * export at all (the caller falls through to the generic parser).
 */
export function detectDbsHeaderIndex(table: string[][]): number | null {
  for (let i = 0; i < table.length; i++) {
    const normalized = (table[i] ?? []).map(normalizeCell);
    if (DBS_REQUIRED_HEADERS.every((name) => normalized.includes(name))) {
      return i;
    }
  }
  return null;
}

function findDbsColumn(header: string[], name: string): number {
  return header.map(normalizeCell).indexOf(name);
}

// Targets a card PAN — 4 groups of 4 digits, separator optional (covers
// "1234-5678-9012-3456", "1234 5678 9012 3456", and a bare 16-digit run).
// Deliberately exact-width (not `\d{4,}`) so it never swallows an adjacent,
// differently-shaped reference number (e.g. DBS's 15-digit transaction
// sequence number sitting right next to the card number in `Description`).
const CARD_NUMBER_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

/** Strips any card-number-shaped substring from free text. Exported for its
 * own dedicated security test — see dbs.test.ts. */
export function scrubCardNumbers(text: string): string {
  return text.replace(CARD_NUMBER_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

function stripNoise(text: string): string {
  return scrubCardNumbers(text).replace(/\s+/g, " ").trim();
}

/** Drops whitespace-delimited tokens that are purely digits (a leftover
 * reference/billing number), without touching alphanumeric tokens like
 * "#01-29" that merely contain digits. */
function stripDigitOnlyTokens(text: string): string {
  return text
    .split(" ")
    .filter((token) => !/^\d+$/.test(token))
    .join(" ")
    .trim();
}

/**
 * POS rows: `Description`/`Supplementary Code` both look like
 * "BAT <merchant> <CITY> <CCC> <DDMMM> <card number> <ref>" — e.g.
 * "BAT HelloRide SINGAPORE SGP 28SEP 1234-5678-9012-3456 000003183851603".
 * `Supplementary Code` is preferred when present: calibration showed it's
 * already free of the trailing card number/reference block that
 * `Description` carries. `Client Reference` is deliberately never passed
 * to this function at all — on every POS row it holds the card number
 * itself, never label text, so it's kept entirely out of the label
 * pipeline rather than trusted to scrub cleanly. When cleaning yields
 * nothing (a credit/refund line with no merchant at all), the fallback is
 * `Supplementary Code Description` — a generic but always-present
 * boilerplate string ("Point-of-Sale Transaction"), confusingly NOT the
 * cleaner merchant text despite the name. Every step here still runs the
 * card scrubber regardless of source (defense in depth, never assume a
 * column is clean).
 */
function cleanPosLabel(description: string, supplementaryCode: string, supplementaryDescription: string): string {
  const source = supplementaryCode.trim() !== "" ? supplementaryCode : description;
  let s = stripNoise(source);
  s = s.replace(/^BAT\s*/i, "").trim();
  // Trailing "<2-3 letter country code> <DDMMM>", e.g. "SGP 28SEP" / "IRL 12SEP".
  s = s.replace(/\s+[A-Za-z]{2,3}\s+\d{2}[A-Za-z]{3}$/, "").trim();
  // DBS/Singapore-specific: the city token right before the country code,
  // when present, is consistently "(SINGAPORE|Singapore)" in this export.
  s = s.replace(/\s+SINGAPORE$/i, "").trim();
  s = stripDigitOnlyTokens(s);
  return s || stripNoise(supplementaryDescription);
}

/**
 * ADV rows (PayNow in/out, NETS QR): the real beneficiary/payer lives in
 * `Client Reference` as "To: <name>" / "From: <name>" — far more reliable
 * than parsing it back out of `Description`. Bank transfers (`TRF`) don't
 * carry this prefix at all in the calibration file (`Client Reference` is a
 * masked destination account fragment instead) and have no other clean
 * merchant text available, so they fall back to a generic label.
 */
function cleanAdvLabel(clientReference: string): string {
  const match = /^(?:to|from)\s*:\s*(.+)$/i.exec(clientReference.trim());
  if (match?.[1]) return stripNoise(match[1]);
  return "Virement bancaire";
}

// "Additional Reference" is sometimes populated with a fixed, generic
// transfer-method description instead of an actual per-transaction
// reference — found by re-validating against the real calibration file: two
// distinct incoming PayNow transfers from the same sender (different
// amounts) both carried the literal value "OTHR Transfer - Mobile", which
// silently collapsed them into one via the in-file dedup below before this
// was caught. Treated as "no reference available" rather than trusted.
const DBS_NON_REFERENCE_VALUES = new Set(["othr transfer - mobile"]);

/**
 * A stable per-transaction reference, prefixed by source so a future
 * Enable Banking sync (ADR-023, same pipeline) can populate this column
 * with its own identifiers without ever colliding with a CSV import.
 * `Additional Reference` covers POS (a 15-digit sequence number — proven
 * unique across otherwise-identical same-day rows on the calibration file)
 * and outgoing PayNow ADV rows (proven unique across 2 real samples, each a
 * distinct non-generic alphanumeric code). NETS QR rows leave it blank, but
 * carry an equivalent reference embedded in `Supplementary Code` instead
 * (proven unique across 4 real NETS QR rows). Bank transfers (`TRF`) and
 * incoming PayNow transfers have no provably-unique reference available at
 * all — left null on purpose, falling back to the existing exact-match
 * heuristic (ADR-021) instead of asserting an unverified guarantee.
 */
function findDbsExternalRef(additionalReference: string, supplementaryCode: string): string | null {
  const ref = additionalReference.trim();
  if (ref !== "" && !DBS_NON_REFERENCE_VALUES.has(ref.toLowerCase())) {
    return `dbs:${ref}`;
  }

  if (/NETS QR/i.test(supplementaryCode)) {
    const match = /(\d{6,})\s*$/.exec(supplementaryCode.trim());
    if (match?.[1]) return `dbs:${match[1]}`;
  }

  return null;
}

function parseDbsDate(raw: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = DBS_MONTHS[(monthName ?? "").toLowerCase()];
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

const DBS_MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/**
 * Parses the data rows of an already-CSV-tokenized DBS export (header
 * located via `detectDbsHeaderIndex`) into the same `ParsedStatementRow`
 * shape the generic parser produces, so the rest of the import pipeline
 * (review UI, duplicate detection, category suggestion, insert) never needs
 * to know which bank a file came from.
 */
export function parseDbsRows(
  table: string[][],
  headerIndex: number,
  fallbackCurrency: Currency,
): ParseBankStatementResult {
  const header = table[headerIndex] ?? [];
  const dataRows = table.slice(headerIndex + 1);

  const dateCol = findDbsColumn(header, "transaction date");
  const statementCodeCol = findDbsColumn(header, "statement code");
  const descriptionCol = findDbsColumn(header, "description");
  const supplementaryCodeCol = findDbsColumn(header, "supplementary code");
  const supplementaryDescCol = findDbsColumn(header, "supplementary code description");
  const clientRefCol = findDbsColumn(header, "client reference");
  const additionalRefCol = findDbsColumn(header, "additional reference");
  const statusCol = findDbsColumn(header, "status");
  const currencyCol = findDbsColumn(header, "currency");
  const debitCol = findDbsColumn(header, "debit amount");
  const creditCol = findDbsColumn(header, "credit amount");

  const rows: ParsedStatementRow[] = [];
  const seenRefs = new Set<string>();
  let skippedCount = 0;

  const cell = (raw: string[], col: number): string => (col !== -1 ? (raw[col] ?? "") : "");

  for (const raw of dataRows) {
    if (raw.length <= 1 && (raw[0] ?? "").trim() === "") continue;

    const status = cell(raw, statusCol).trim();
    if (status.toLowerCase() !== "settled") {
      skippedCount++;
      continue;
    }

    const date = parseDbsDate(cell(raw, dateCol));
    const debitRaw = cell(raw, debitCol).trim();
    const creditRaw = cell(raw, creditCol).trim();

    let amount: number | null = null;
    let type: "income" | "expense" | null = null;
    if (debitRaw !== "") {
      const value = Number(debitRaw);
      if (Number.isFinite(value)) {
        amount = value;
        type = "expense";
      }
    } else if (creditRaw !== "") {
      const value = Number(creditRaw);
      if (Number.isFinite(value)) {
        amount = value;
        type = "income";
      }
    }

    if (!date || amount === null || !type) {
      skippedCount++;
      continue;
    }

    const statementCode = cell(raw, statementCodeCol).trim().toUpperCase();
    const clientReference = cell(raw, clientRefCol);
    const label =
      statementCode === "POS"
        ? cleanPosLabel(cell(raw, descriptionCol), cell(raw, supplementaryCodeCol), cell(raw, supplementaryDescCol))
        : cleanAdvLabel(clientReference);

    if (!label) {
      skippedCount++;
      continue;
    }

    const externalRef = findDbsExternalRef(cell(raw, additionalRefCol), cell(raw, supplementaryCodeCol));
    if (externalRef && seenRefs.has(externalRef)) {
      // Same transaction listed twice in this export — keep only the first.
      skippedCount++;
      continue;
    }
    if (externalRef) seenRefs.add(externalRef);

    const currencyRaw = cell(raw, currencyCol).trim().toUpperCase();
    const currency = currencySchema.safeParse(currencyRaw).success ? (currencyRaw as Currency) : fallbackCurrency;

    rows.push({
      date,
      label,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      type,
      currency,
      externalRef,
    });
  }

  return { rows, skippedCount, error: null };
}
