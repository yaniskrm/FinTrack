"use server";

import { goalInputSchema } from "@fintrack/core";
import type { GoalFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { GoalRow } from "./types";

export type GoalMutationResult = { ok: true; goal: GoalRow } | { ok: false; error: string };

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function createGoalAction(values: GoalFormValues): Promise<GoalMutationResult> {
  const parsed = goalInputSchema.safeParse(values);
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
    .from("goals")
    .insert({
      workspace_id: workspace.id,
      name: input.name,
      target_amount_eur: input.targetAmountEur,
      current_amount_eur: input.currentAmountEur,
      deadline: input.deadline,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, goal: data };
}

export async function updateGoalAction(
  id: string,
  values: GoalFormValues,
): Promise<GoalMutationResult> {
  const parsed = goalInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .update({
      name: input.name,
      target_amount_eur: input.targetAmountEur,
      current_amount_eur: input.currentAmountEur,
      deadline: input.deadline,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, goal: data };
}

export async function deleteGoalAction(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible." };
  }
  return { ok: true };
}
