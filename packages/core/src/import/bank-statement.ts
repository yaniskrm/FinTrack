import { parseCsv } from "./parse-csv.js";
import { currencySchema } from "../validators/transaction-schema.js";
import type { Currency } from "../types/index.js";

export interface ParsedStatementRow {
  date: string; // ISO YYYY-MM-DD
  label: string;
  amount: number; // always positive — see `type` for direction
  type: "income" | "expense"; // never "transfer": a bank export alone can't tell us the destination is another of the user's own tracked accounts (ADR-020) — the user reclassifies manually if needed
  currency: Currency;
}

export interface ParseBankStatementResult {
  rows: ParsedStatementRow[];
  /** Rows dropped: non-final status (pending/reversed), unparsable, or a net amount of exactly 0. */
  skippedCount: number;
  error: string | null;
}

// Column names seen across French and English bank/Revolut exports. Matched
// case/accent-insensitively — see `normalizeHeader`.
const COLUMN_SYNONYMS = {
  date: ["date de debut", "date", "started date", "date operation", "date d'operation"],
  label: ["description", "libelle", "label"],
  amount: ["montant", "amount"],
  fee: ["frais", "fee"],
  currency: ["devise", "currency"],
  status: ["etat", "status", "state"],
} as const;

// Status values meaning "this row never actually settled" — importing it
// would misstate the account's balance. Matched against the whole
// (normalized) status cell, not as a label substring, so an unrelated label
// containing one of these words is never mistaken for a real status.
const NON_FINAL_STATUSES = [
  "en attente",
  "pending",
  "renvoye",
  "reversed",
  "failed",
  "declined",
  "annule",
  "cancelled",
  "canceled",
];

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function findColumn(headers: string[], field: keyof typeof COLUMN_SYNONYMS): number {
  const normalized = headers.map(normalizeHeader);
  for (const synonym of COLUMN_SYNONYMS[field]) {
    const idx = normalized.indexOf(synonym);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (iso?.[1]) return iso[1];
  const european = /^(\d{2})[/-](\d{2})[/-](\d{4})/.exec(trimmed);
  if (european?.[1] && european[2] && european[3]) {
    return `${european[3]}-${european[2]}-${european[1]}`;
  }
  return null;
}

/**
 * Parses a bank statement export (CSV — delimiter auto-detected) into
 * normalized rows ready for review/import. Never produces a "transfer" row
 * (see `ParsedStatementRow`). `fallbackCurrency` is used when the file has
 * no currency column at all (most single-currency bank exports).
 */
export function parseBankStatement(text: string, fallbackCurrency: Currency): ParseBankStatementResult {
  const table = parseCsv(text);
  if (table.length < 2) {
    return { rows: [], skippedCount: 0, error: "Fichier vide ou illisible." };
  }

  const [header, ...dataRows] = table;
  if (!header) {
    return { rows: [], skippedCount: 0, error: "Fichier vide ou illisible." };
  }

  const dateCol = findColumn(header, "date");
  const labelCol = findColumn(header, "label");
  const amountCol = findColumn(header, "amount");
  const feeCol = findColumn(header, "fee");
  const currencyCol = findColumn(header, "currency");
  const statusCol = findColumn(header, "status");

  if (dateCol === -1 || labelCol === -1 || amountCol === -1) {
    return {
      rows: [],
      skippedCount: 0,
      error: "Colonnes non reconnues — le fichier doit contenir au moins une date, un libellé et un montant.",
    };
  }

  const rows: ParsedStatementRow[] = [];
  let skippedCount = 0;

  for (const raw of dataRows) {
    const statusRaw = statusCol !== -1 ? (raw[statusCol] ?? "") : "";
    if (statusRaw && NON_FINAL_STATUSES.includes(normalizeHeader(statusRaw))) {
      skippedCount++;
      continue;
    }

    const date = parseDate(raw[dateCol] ?? "");
    const label = (raw[labelCol] ?? "").trim();
    const amountRaw = parseAmount(raw[amountCol] ?? "");
    const feeRaw = feeCol !== -1 ? (parseAmount(raw[feeCol] ?? "") ?? 0) : 0;

    if (!date || !label || amountRaw === null) {
      skippedCount++;
      continue;
    }

    // The fee is always a cost on top of whichever direction the amount
    // already moves — verified against a real Revolut export's running
    // balance column (each row's balance delta == amount - |fee| exactly).
    const net = amountRaw - Math.abs(feeRaw);
    if (net === 0) {
      skippedCount++;
      continue;
    }

    const currencyRaw = currencyCol !== -1 ? (raw[currencyCol] ?? "").trim().toUpperCase() : "";
    const currency = currencySchema.safeParse(currencyRaw).success
      ? (currencyRaw as Currency)
      : fallbackCurrency;

    rows.push({
      date,
      label,
      amount: Math.round(Math.abs(net) * 100) / 100,
      type: net > 0 ? "income" : "expense",
      currency,
    });
  }

  return { rows, skippedCount, error: null };
}
