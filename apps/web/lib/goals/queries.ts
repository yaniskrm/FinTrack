import { createClient } from "../supabase/client";
import type { GoalRow } from "./types";

/** Client-side read. RLS scopes rows to the user's workspace. */
export async function fetchGoals(): Promise<GoalRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
