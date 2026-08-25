"use server";

import { categoryInputSchema } from "@fintrack/core";
import type { CategoryFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { CategoryRow } from "../transactions/types";

export type CategoryMutationResult = { ok: true; category: CategoryRow } | { ok: false; error: string };

export async function createCategoryAction(values: CategoryFormValues): Promise<CategoryMutationResult> {
  const parsed = categoryInputSchema.safeParse(values);
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
    .from("categories")
    .insert({ workspace_id: workspace.id, name: input.name, icon: input.icon, color: input.color })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Création impossible." };
  }
  return { ok: true, category: data };
}

export async function updateCategoryAction(
  id: string,
  values: CategoryFormValues,
): Promise<CategoryMutationResult> {
  const parsed = categoryInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: input.name, icon: input.icon, color: input.color })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, category: data };
}

export async function setCategoryHiddenAction(id: string, hidden: boolean): Promise<CategoryMutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ hidden })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, category: data };
}
