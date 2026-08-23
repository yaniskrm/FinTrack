"use server";

import { budgetInputSchema } from "@fintrack/core";
import type { BudgetFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { BudgetRow } from "./types";

export type BudgetMutationResult =
  | { ok: true; budget: BudgetRow }
  | { ok: false; error: string };

export type DeleteResult = { ok: true } | { ok: false; error: string };

// Postgres unique_violation — one budget per (workspace, category, period).
const UNIQUE_VIOLATION = "23505";
const DUPLICATE_ERROR = "Un budget existe déjà pour cette catégorie sur cette période.";

export async function createBudgetAction(values: BudgetFormValues): Promise<BudgetMutationResult> {
  const parsed = budgetInputSchema.safeParse(values);
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

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      workspace_id: workspace.id,
      category_id: input.categoryId,
      amount_eur: input.amountEur,
      period: input.period,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.code === UNIQUE_VIOLATION ? DUPLICATE_ERROR : "Enregistrement impossible." };
  }
  return { ok: true, budget: data };
}

export async function updateBudgetAction(
  id: string,
  values: BudgetFormValues,
): Promise<BudgetMutationResult> {
  const parsed = budgetInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .update({
      category_id: input.categoryId,
      amount_eur: input.amountEur,
      period: input.period,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.code === UNIQUE_VIOLATION ? DUPLICATE_ERROR : "Mise à jour impossible." };
  }
  return { ok: true, budget: data };
}

export async function deleteBudgetAction(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible." };
  }
  return { ok: true };
}
