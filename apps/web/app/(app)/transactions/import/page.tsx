import type { Metadata } from "next";
import { createClient } from "../../../../lib/supabase/server";
import { ImportView } from "../../../../components/transactions/import-view";

export const metadata: Metadata = {
  title: "Importer un relevé — FinTrack",
};

export default async function ImportTransactionsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ImportView
      accounts={accounts ?? []}
      categories={categories ?? []}
      transactions={transactions ?? []}
    />
  );
}
