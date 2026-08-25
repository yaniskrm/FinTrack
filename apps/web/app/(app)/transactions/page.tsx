import type { Metadata } from "next";
import type { Currency } from "@fintrack/core";
import { createClient } from "../../../lib/supabase/server";
import { TransactionsView } from "../../../components/transactions/transactions-view";

export const metadata: Metadata = {
  title: "Transactions — FinTrack",
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: transactions }, { data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
    user
      ? supabase.from("profiles").select("default_currency").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <TransactionsView
      initialTransactions={transactions ?? []}
      initialCategories={categories ?? []}
      defaultCurrency={(profile?.default_currency as Currency | undefined) ?? "EUR"}
    />
  );
}
