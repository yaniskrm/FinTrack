import { createClient } from "../supabase/client";
import type { BudgetRow } from "./types";

/** Client-side read. RLS scopes rows to the user's workspace. */
export async function fetchBudgets(): Promise<BudgetRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
