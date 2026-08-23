import { createClient } from "../supabase/client";
import type { InvestmentRow, InvestmentValuationRow } from "./types";

/** Client-side read. RLS scopes rows to the user's workspace. */
export async function fetchInvestments(): Promise<InvestmentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** Full valuation history across all positions — the "courbe temporelle" input. */
export async function fetchInvestmentValuations(): Promise<InvestmentValuationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("investment_valuations")
    .select("*")
    .order("recorded_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
