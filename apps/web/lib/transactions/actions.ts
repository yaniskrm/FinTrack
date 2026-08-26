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
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: frozen.amountEur,
      rate_approximate: frozen.approximate,
      type: input.type,
      label: input.label,
      merchant: input.merchant,
      note: input.note,
      date: input.date,
      reimbursement_status: input.markAsReimbursable ? "pending" : "none",
      reimbursement_contact: input.markAsReimbursable ? input.reimbursementContact : null,
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

  // A settled reimbursement already has its matching income transaction
  // (settled_transaction_id) — the edit form has no way to represent that
  // third state (its checkbox only toggles pending/none), so never let an
  // edit silently downgrade a settled transaction back to pending/none.
  const { data: existing } = await supabase
    .from("transactions")
    .select("reimbursement_status")
    .eq("id", id)
    .maybeSingle();
  const reimbursementFields =
    existing?.reimbursement_status === "settled"
      ? {}
      : {
          reimbursement_status: input.markAsReimbursable ? ("pending" as const) : ("none" as const),
          reimbursement_contact: input.markAsReimbursable ? input.reimbursementContact : null,
        };

  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      amount_eur: frozen.amountEur,
      rate_approximate: frozen.approximate,
      type: input.type,
      label: input.label,
      merchant: input.merchant,
      note: input.note,
      date: input.date,
      ...reimbursementFields,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, transaction: data };
}

/**
 * Settles a pending reimbursement: creates the matching income transaction
 * (spec Module 9 — "crée une transaction de revenu correspondante") rather
 * than mutating the original expense, so its own amount_eur/history stays
 * exactly as entered. Filed under the workspace's "Remboursements" default
 * category when it exists (best-effort — a workspace that renamed/hid it
 * just gets an uncategorized income row instead of a hard failure).
 */
export async function settleReimbursementAction(id: string): Promise<MutationResult> {
  const supabase = await createClient();

  const { data: original, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !original) {
    return { ok: false, error: "Transaction introuvable." };
  }
  if (original.reimbursement_status !== "pending") {
    return { ok: false, error: "Cette transaction n'est pas en attente de remboursement." };
  }

  const { data: refundCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("workspace_id", original.workspace_id)
    .eq("name", "Remboursements")
    .maybeSingle();

  const { data: incomeTx, error: insertError } = await supabase
    .from("transactions")
    .insert({
      workspace_id: original.workspace_id,
      account_id: original.account_id,
      category_id: refundCategory?.id ?? null,
      amount: original.amount,
      currency: original.currency,
      amount_eur: original.amount_eur,
      rate_approximate: original.rate_approximate,
      type: "income",
      label: `Remboursement — ${original.label}`,
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (insertError) {
    return { ok: false, error: "Création de la transaction de remboursement impossible." };
  }

  const { data: settled, error: settleError } = await supabase
    .from("transactions")
    .update({ reimbursement_status: "settled", settled_transaction_id: incomeTx.id })
    .eq("id", id)
    .select("*")
    .single();

  if (settleError) {
    return { ok: false, error: "Impossible de marquer la transaction comme remboursée." };
  }
  return { ok: true, transaction: settled };
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
