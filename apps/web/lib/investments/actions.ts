"use server";

import { closeInvestmentSchema, investmentInputSchema, investmentValuationInputSchema } from "@fintrack/core";
import type { CloseInvestmentFormValues, InvestmentFormValues, InvestmentValuationFormValues } from "@fintrack/core";
import { createClient } from "../supabase/server";
import type { InvestmentRow, InvestmentValuationRow } from "./types";

export type InvestmentMutationResult = { ok: true; investment: InvestmentRow } | { ok: false; error: string };
export type ValuationMutationResult = { ok: true; valuation: InvestmentValuationRow; investment: InvestmentRow } | { ok: false; error: string };
export type DeleteResult = { ok: true } | { ok: false; error: string };

async function currentWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const { data: workspace, error } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
  if (error || !workspace) {
    return { ok: false, error: "Espace introuvable." };
  }
  return { ok: true, workspaceId: workspace.id };
}

export async function createInvestmentAction(values: InvestmentFormValues): Promise<InvestmentMutationResult> {
  const parsed = investmentInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const workspace = await currentWorkspaceId(supabase);
  if (!workspace.ok) return workspace;

  const { data, error } = await supabase
    .from("investments")
    .insert({
      workspace_id: workspace.workspaceId,
      name: input.name,
      asset_type: input.assetType,
      ticker: input.ticker,
      broker: input.broker,
      quantity: input.quantity,
      buy_price_eur: input.buyPriceEur,
      current_price_eur: input.currentPriceEur,
      currency: input.currency,
      opened_at: input.openedAt,
      notes: input.notes,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, investment: data };
}

export async function updateInvestmentAction(
  id: string,
  values: InvestmentFormValues,
): Promise<InvestmentMutationResult> {
  const parsed = investmentInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .update({
      name: input.name,
      asset_type: input.assetType,
      ticker: input.ticker,
      broker: input.broker,
      quantity: input.quantity,
      buy_price_eur: input.buyPriceEur,
      current_price_eur: input.currentPriceEur,
      currency: input.currency,
      opened_at: input.openedAt,
      notes: input.notes,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Mise à jour impossible." };
  }
  return { ok: true, investment: data };
}

export async function deleteInvestmentAction(id: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("investments").delete().eq("id", id);

  if (error) {
    return { ok: false, error: "Suppression impossible." };
  }
  return { ok: true };
}

/**
 * Records a valuation snapshot (history for the time-series chart) AND
 * refreshes `investments.current_price_eur` so it stays a fast, join-free
 * "latest known value" cache for portfolio totals and allocation charts.
 */
export async function addInvestmentValuationAction(
  values: InvestmentValuationFormValues,
): Promise<ValuationMutationResult> {
  const parsed = investmentValuationInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const workspace = await currentWorkspaceId(supabase);
  if (!workspace.ok) return workspace;

  const { data: valuation, error: valuationError } = await supabase
    .from("investment_valuations")
    .insert({
      workspace_id: workspace.workspaceId,
      investment_id: input.investmentId,
      price_eur: input.priceEur,
      recorded_at: input.recordedAt,
    })
    .select("*")
    .single();

  if (valuationError) {
    return { ok: false, error: "Enregistrement de la valorisation impossible." };
  }

  const { data: investment, error: investmentError } = await supabase
    .from("investments")
    .update({ current_price_eur: input.priceEur })
    .eq("id", input.investmentId)
    .select("*")
    .single();

  if (investmentError) {
    return { ok: false, error: "Mise à jour du prix actuel impossible." };
  }

  return { ok: true, valuation, investment };
}

/** Closes (sells) a position: sets closed_at + sale_price_eur together. */
export async function closeInvestmentAction(values: CloseInvestmentFormValues): Promise<InvestmentMutationResult> {
  const parsed = closeInvestmentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .update({ closed_at: input.closedAt, sale_price_eur: input.salePriceEur })
    .eq("id", input.investmentId)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: "Clôture de la position impossible." };
  }
  return { ok: true, investment: data };
}
