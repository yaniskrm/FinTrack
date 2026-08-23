import type { Metadata } from "next";
import { createClient } from "../../../lib/supabase/server";
import { InvestmentsView } from "../../../components/investments/investments-view";

export const metadata: Metadata = {
  title: "Investissements — FinTrack",
};

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const [{ data: investments }, { data: valuations }] = await Promise.all([
    supabase.from("investments").select("*").order("created_at", { ascending: true }),
    supabase.from("investment_valuations").select("*").order("recorded_at", { ascending: true }),
  ]);

  return <InvestmentsView initialInvestments={investments ?? []} initialValuations={valuations ?? []} />;
}
