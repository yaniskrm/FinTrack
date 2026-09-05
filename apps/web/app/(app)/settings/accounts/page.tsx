import type { Metadata } from "next";
import { createClient } from "../../../../lib/supabase/server";
import { AccountView } from "../../../../components/accounts/account-view";
import { BankConnectionsCard } from "../../../../components/accounts/bank-connections-card";

export const metadata: Metadata = {
  title: "Comptes — FinTrack",
};

export default async function AccountsSettingsPage() {
  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }, { data: bankConnections }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("transactions").select("*"),
    supabase.from("bank_connections").select("*").neq("status", "pending").order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <AccountView initialAccounts={accounts ?? []} transactions={transactions ?? []} />
      <BankConnectionsCard initialConnections={bankConnections ?? []} accounts={accounts ?? []} />
    </div>
  );
}
