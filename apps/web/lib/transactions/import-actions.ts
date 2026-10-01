"use server";

import { convertToEur, importBatchSchema } from "@fintrack/core";
import type { Currency, ExchangeRate, ImportBatchInput } from "@fintrack/core";
import { createClient } from "../supabase/server";

export type ImportResult =
  | { ok: true; imported: number; duplicatesSkipped: number }
  | { ok: false; error: string };

// A rate older than this is treated as stale — mirrors freezeAmountEur in
// ./actions.ts (kept as a separate small helper here since bulk import needs
// to batch-fetch rates for every distinct currency up front, not one query
// per row).
const RATE_STALE_MS = 48 * 60 * 60 * 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function importTransactionsAction(input: ImportBatchInput): Promise<ImportResult> {
  const parsed = importBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const { accountId, rows } = parsed.data;

  const supabase = await createClient();
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (workspaceError || !workspace) {
    return { ok: false, error: "Espace introuvable." };
  }

  // RLS would reject a cross-workspace account anyway, but a clear error
  // here beats a silent partial failure.
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();
  if (!account) {
    return { ok: false, error: "Compte introuvable." };
  }

  // Re-verify certain duplicates (external_ref) server-side rather than
  // trusting the client's review-step flags, and drop a repeated
  // external_ref within this batch too (a client bug, a second parse of the
  // same file, or a retried request) — the row-level filter below is the
  // primary defense; the upsert's ON CONFLICT further down is only the
  // last-resort safety net for a genuine race between two tabs.
  const { data: existingRefRows } = await supabase
    .from("transactions")
    .select("external_ref")
    .eq("account_id", accountId)
    .not("external_ref", "is", null);
  const existingRefs = new Set((existingRefRows ?? []).map((r) => r.external_ref));

  const seenInBatch = new Set<string>();
  let duplicatesSkipped = 0;
  const dedupedRows = rows.filter((row) => {
    if (!row.externalRef) return true;
    if (existingRefs.has(row.externalRef) || seenInBatch.has(row.externalRef)) {
      duplicatesSkipped++;
      return false;
    }
    seenInBatch.add(row.externalRef);
    return true;
  });

  if (dedupedRows.length === 0) {
    return { ok: false, error: "Toutes les lignes étaient déjà importées." };
  }

  const distinctCurrencies = [...new Set(dedupedRows.map((r) => r.currency))].filter(
    (c): c is Exclude<Currency, "EUR"> => c !== "EUR",
  );
  const { data: rates } =
    distinctCurrencies.length > 0
      ? await supabase.from("exchange_rates").select("currency, rate_to_eur, updated_at").in("currency", distinctCurrencies)
      : { data: [] };
  const rateByCurrency = new Map((rates ?? []).map((r) => [r.currency, r]));

  interface InsertRow {
    workspace_id: string;
    account_id: string;
    category_id: string | null;
    amount: number;
    currency: Currency;
    amount_eur: number;
    rate_approximate: boolean;
    type: "income" | "expense";
    label: string;
    date: string;
    external_ref: string | null;
  }

  const toInsert: InsertRow[] = [];
  for (const row of dedupedRows) {
    let amountEur: number;
    let rateApproximate = false;

    if (row.currency === "EUR") {
      amountEur = round2(row.amount);
    } else {
      const rate = rateByCurrency.get(row.currency);
      if (!rate) continue; // no rate available for this currency — skip rather than fail the whole batch
      const exchangeRates: ExchangeRate[] = [
        { currency: row.currency, rate_to_eur: rate.rate_to_eur, updated_at: rate.updated_at },
      ];
      amountEur = round2(convertToEur(row.amount, row.currency, exchangeRates));
      rateApproximate = Date.now() - new Date(rate.updated_at).getTime() > RATE_STALE_MS;
    }

    toInsert.push({
      workspace_id: workspace.id,
      account_id: accountId,
      category_id: row.categoryId,
      amount: row.amount,
      currency: row.currency,
      amount_eur: amountEur,
      rate_approximate: rateApproximate,
      type: row.type,
      label: row.label,
      date: row.date,
      external_ref: row.externalRef,
    });
  }

  if (toInsert.length === 0) {
    return { ok: false, error: "Aucune ligne n'a pu être importée (taux de change indisponibles)." };
  }

  // onConflict + ignoreDuplicates is a safety net only (a race between two
  // tabs importing the same file) — the real dedup already happened above,
  // against a fresh read. NULL external_ref rows never conflict with each
  // other (Postgres treats NULLs as distinct in a unique index), so this is
  // a no-op for every row without a reference, same as the main filter.
  const { data: inserted, error } = await supabase
    .from("transactions")
    .upsert(toInsert, { onConflict: "account_id,external_ref", ignoreDuplicates: true })
    .select("id");
  if (error) {
    return { ok: false, error: "Import impossible." };
  }
  const racedDuplicates = toInsert.length - inserted.length;
  return { ok: true, imported: inserted.length, duplicatesSkipped: duplicatesSkipped + racedDuplicates };
}
