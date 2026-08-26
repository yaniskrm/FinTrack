import type { Metadata } from "next";
import { createClient } from "../../../lib/supabase/server";
import { RecurringView } from "../../../components/recurring/recurring-view";

export const metadata: Metadata = {
  title: "Abonnements — FinTrack",
};

export default async function SubscriptionsPage() {
  const supabase = await createClient();

  const [{ data: rules }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from("recurring_rules").select("*").order("next_occurrence", { ascending: true }),
    supabase.from("categories").select("*").order("name"),
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <RecurringView
      initialRules={rules ?? []}
      initialCategories={categories ?? []}
      initialAccounts={accounts ?? []}
    />
  );
}
