import { createClient } from "../supabase/client";
import type { CategoryRow, TransactionRow } from "./types";

/** Client-side reads. RLS scopes rows to the user's workspace automatically. */

export async function fetchTransactions(): Promise<TransactionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function fetchCategories(): Promise<CategoryRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
