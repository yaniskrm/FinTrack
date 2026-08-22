import type { Metadata } from "next";
import { createClient } from "../../../lib/supabase/server";
import { TransactionsView } from "../../../components/transactions/transactions-view";

export const metadata: Metadata = {
  title: "Transactions — FinTrack",
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <TransactionsView
      initialTransactions={transactions ?? []}
      initialCategories={categories ?? []}
    />
  );
}
