import type { Metadata } from "next";
import { createClient } from "../../../../lib/supabase/server";
import { AccountView } from "../../../../components/accounts/account-view";

export const metadata: Metadata = {
  title: "Comptes — FinTrack",
};

export default async function AccountsSettingsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("transactions").select("*"),
  ]);

  return <AccountView initialAccounts={accounts ?? []} transactions={transactions ?? []} />;
}
