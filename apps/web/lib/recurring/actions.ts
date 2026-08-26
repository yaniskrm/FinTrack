"use server";

import { recurringInputSchema } from "@fintrack/core";
import type { RecurringFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { RecurringRuleRow } from "./types";

export type RecurringMutationResult =
  | { ok: true; rule: RecurringRuleRow }
  | { ok: false; error: string };

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function createRecurringRuleAction(
  values: RecurringFormValues,
): Promise<RecurringMutationResult> {
  const parsed = recurringInputSchema.safeParse(values);
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
    .from("recurring_rules")
    .insert({
      workspace_id: workspace.id,
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      label: input.label,
      frequency: input.frequency,
      start_date: input.startDate,
      end_date: input.endDate,
      // Generation cursor starts at start_date; the daily job advances it.
      next_occurrence: input.startDate,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, rule: data };
}

export async function updateRecurringRuleAction(
  id: string,
  values: RecurringFormValues,
): Promise<RecurringMutationResult> {
  const parsed = recurringInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  // start_date and next_occurrence are intentionally not updated — the
  // generation cursor is system-managed; editing a rule must not re-backfill.
  const { data, error } = await supabase
    .from("recurring_rules")
    .update({
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      type: input.type,
      label: input.label,
      frequency: input.frequency,
      end_date: input.endDate,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, rule: data };
}

export async function deleteRecurringRuleAction(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  // Generated transactions are kept (FK is ON DELETE SET NULL).
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible." };
  }
  return { ok: true };
}
