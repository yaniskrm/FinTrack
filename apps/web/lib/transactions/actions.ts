"use server";

import { convertToEur, transactionInputSchema } from "@fintrack/core";
import type { Currency, ExchangeRate, TransactionFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { TransactionRow } from "./types";

export type MutationResult =
  | { ok: true; transaction: TransactionRow }
  | { ok: false; error: string };

export type DeleteResult = { ok: true } | { ok: false; error: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function createTransactionAction(values: TransactionFormValues): Promise<MutationResult> {
  const parsed = transactionInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (workspaceError || !workspace) {
    return { ok: false, error: "Espace introuvable." };
  }

  const amountEur = await freezeAmountEur(input.amount, input.currency);
  if (amountEur === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      workspace_id: workspace.id,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: amountEur,
      type: input.type,
      label: input.label,
      note: input.note,
      date: input.date,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, transaction: data };
}

export async function updateTransactionAction(
  id: string,
  values: TransactionFormValues,
): Promise<MutationResult> {
  const parsed = transactionInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const amountEur = await freezeAmountEur(input.amount, input.currency);
  if (amountEur === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: amountEur,
      type: input.type,
      label: input.label,
      note: input.note,
      date: input.date,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, transaction: data };
}

export async function deleteTransactionAction(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible." };
  }
  return { ok: true };
}

/**
 * Freezes amount_eur at entry/edit time using the current stored rates
 * (ADR-005). Never recomputed retroactively on later rate changes.
 * Returns null when non-EUR rates are unavailable.
 */
async function freezeAmountEur(amount: number, currency: Currency): Promise<number | null> {
  if (currency === "EUR") {
    return round2(amount);
  }

  const supabase = await createClient();
  const { data: rates, error } = await supabase
    .from("exchange_rates")
    .select("currency, rate_to_eur, updated_at");

  if (error || rates.length === 0) {
    return null;
  }

  // DB stores currency as char(3), FK-constrained to valid codes.
  return round2(convertToEur(amount, currency, rates as ExchangeRate[]));
}
