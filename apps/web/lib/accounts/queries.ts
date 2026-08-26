import { createClient } from "../supabase/client";
import type { AccountRow } from "./types";

/** Client-side read, including archived accounts (the management UI needs to reactivate them). */
export async function fetchAccounts(): Promise<AccountRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
