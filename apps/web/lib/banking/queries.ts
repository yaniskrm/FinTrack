import { createClient } from "../supabase/client";
import type { BankConnectionRow } from "./types";

export async function fetchBankConnections(): Promise<BankConnectionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
