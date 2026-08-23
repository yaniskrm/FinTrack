import type { Metadata } from "next";
import { createClient } from "../../../lib/supabase/server";
import { BudgetView } from "../../../components/budgets/budget-view";

export const metadata: Metadata = {
  title: "Budget — FinTrack",
};

export default async function BudgetPage() {
  const supabase = await createClient();
  const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);

  const [{ data: budgets }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("budgets").select("*").order("created_at", { ascending: true }),
    supabase.from("categories").select("*").order("name"),
    // Current-year transactions cover both monthly and yearly budget windows.
    supabase.from("transactions").select("*").gte("date", startOfYear),
  ]);

  return (
    <BudgetView
      initialBudgets={budgets ?? []}
      initialCategories={categories ?? []}
      transactions={transactions ?? []}
    />
  );
}
