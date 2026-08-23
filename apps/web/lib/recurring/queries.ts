import { createClient } from "../supabase/client";
import type { RecurringRuleRow } from "./types";

/** Client-side read. RLS scopes rows to the user's workspace. */
export async function fetchRecurringRules(): Promise<RecurringRuleRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .order("next_occurrence", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
