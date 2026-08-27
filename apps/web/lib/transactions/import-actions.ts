"use server";

import { convertToEur, importBatchSchema } from "@fintrack/core";
import type { Currency, ExchangeRate, ImportBatchInput } from "@fintrack/core";
import { createClient } from "../supabase/server";

export type ImportResult = { ok: true; imported: number } | { ok: false; error: string };

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

  const distinctCurrencies = [...new Set(rows.map((r) => r.currency))].filter(
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
  }

  const toInsert: InsertRow[] = [];
  for (const row of rows) {
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
    });
  }

  if (toInsert.length === 0) {
    return { ok: false, error: "Aucune ligne n'a pu être importée (taux de change indisponibles)." };
  }

  const { error } = await supabase.from("transactions").insert(toInsert);
  if (error) {
    return { ok: false, error: "Import impossible." };
  }
  return { ok: true, imported: toInsert.length };
}
