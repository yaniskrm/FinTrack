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

  const frozen = await freezeAmountEur(input.amount, input.currency);
  if (frozen === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      workspace_id: workspace.id,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: frozen.amountEur,
      rate_approximate: frozen.approximate,
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

  const frozen = await freezeAmountEur(input.amount, input.currency);
  if (frozen === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: frozen.amountEur,
      rate_approximate: frozen.approximate,
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

// A rate older than this is treated as stale → the frozen amount_eur is flagged
// approximate. Rates refresh daily, so this tolerates one missed day.
const RATE_STALE_MS = 48 * 60 * 60 * 1000;

interface FrozenAmount {
  amountEur: number;
  approximate: boolean;
}

/**
 * Freezes amount_eur at entry/edit time using the current stored rate
 * (ADR-005). Never recomputed retroactively on later rate changes. Flags the
 * result approximate when the stored rate is stale (rate API fallback).
 * Returns null when the currency's rate is unavailable.
 */
async function freezeAmountEur(amount: number, currency: Currency): Promise<FrozenAmount | null> {
  if (currency === "EUR") {
    return { amountEur: round2(amount), approximate: false };
  }

  const supabase = await createClient();
  const { data: rate, error } = await supabase
    .from("exchange_rates")
    .select("rate_to_eur, updated_at")
    .eq("currency", currency)
    .maybeSingle();

  if (error || !rate) {
    return null;
  }

  const rates: ExchangeRate[] = [
    { currency, rate_to_eur: rate.rate_to_eur, updated_at: rate.updated_at },
  ];
  return {
    amountEur: round2(convertToEur(amount, currency, rates)),
    approximate: Date.now() - new Date(rate.updated_at).getTime() > RATE_STALE_MS,
  };
}
