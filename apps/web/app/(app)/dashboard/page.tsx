import { createClient } from "../../../lib/supabase/server";
import { DashboardView } from "../../../components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: transactions }, { data: categories }, { data: accounts }, { data: upcoming }, { data: investments }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase
        .from("recurring_rules")
        .select("*")
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("next_occurrence", { ascending: true })
        .limit(5),
      supabase.from("investments").select("*").order("created_at", { ascending: true }),
    ]);

  return (
    <DashboardView
      transactions={transactions ?? []}
      categories={categories ?? []}
      accounts={accounts ?? []}
      upcoming={upcoming ?? []}
      investments={investments ?? []}
    />
  );
}
