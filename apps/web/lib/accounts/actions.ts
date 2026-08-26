"use server";

import { accountInputSchema, convertToEur } from "@fintrack/core";
import type { AccountFormValues, Currency, ExchangeRate } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { AccountRow } from "./types";

export type AccountMutationResult = { ok: true; account: AccountRow } | { ok: false; error: string };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Freezes initial_balance_eur at creation time (ADR-005 pattern) — never recalculated later. */
async function freezeInitialBalanceEur(amount: number, currency: Currency): Promise<number | null> {
  if (currency === "EUR") {
    return round2(amount);
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

  const rates: ExchangeRate[] = [{ currency, rate_to_eur: rate.rate_to_eur, updated_at: rate.updated_at }];
  return round2(convertToEur(amount, currency, rates));
}

export async function createAccountAction(values: AccountFormValues): Promise<AccountMutationResult> {
  const parsed = accountInputSchema.safeParse(values);
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

  const initialBalanceEur = await freezeInitialBalanceEur(input.initialBalance, input.currency);
  if (initialBalanceEur === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      workspace_id: workspace.id,
      name: input.name,
      type: input.type,
      currency: input.currency,
      initial_balance: input.initialBalance,
      initial_balance_eur: initialBalanceEur,
      icon: input.icon,
      color: input.color,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Création impossible." };
  }
  return { ok: true, account: data };
}

export async function updateAccountAction(
  id: string,
  values: AccountFormValues,
): Promise<AccountMutationResult> {
  const parsed = accountInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const initialBalanceEur = await freezeInitialBalanceEur(input.initialBalance, input.currency);
  if (initialBalanceEur === null) {
    return { ok: false, error: "Taux de change indisponibles." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      currency: input.currency,
      initial_balance: input.initialBalance,
      initial_balance_eur: initialBalanceEur,
      icon: input.icon,
      color: input.color,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, account: data };
}

export async function setAccountActiveAction(id: string, isActive: boolean): Promise<AccountMutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, account: data };
}
