import { createClient } from "../supabase/client";
import type { CategoryRow, TransactionRow } from "../transactions/types";
import type { RecurringRuleRow } from "../recurring/types";
import type { AccountRow } from "../accounts/types";
import type { BankConnectionRow } from "../banking/types";
import type { BudgetRow } from "../budgets/types";
import type { GoalRow } from "../goals/types";
import type { InvestmentRow, InvestmentValuationRow } from "../investments/types";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}

/** Transactions within [from, to] (inclusive, YYYY-MM-DD) — CSV export, period-scoped. */
export async function fetchTransactionsForExport(
  from: string,
  to: string,
): Promise<{ transactions: TransactionRow[]; categories: CategoryRow[] }> {
  const supabase = createClient();
  const [transactions, categories] = await Promise.all([
    supabase.from("transactions").select("*").gte("date", from).lte("date", to).order("date", { ascending: true }),
    supabase.from("categories").select("*"),
  ]);
  return { transactions: unwrap(transactions), categories: unwrap(categories) };
}

export interface FullExportData {
  userEmail: string | null;
  profile: { default_currency: string; locale: string; display_name: string | null; created_at: string } | null;
  accounts: AccountRow[];
  bankConnections: Omit<BankConnectionRow, "session_id" | "state" | "enable_account_uid" | "updated_at" | "workspace_id">[];
  transactions: TransactionRow[];
  recurringRules: RecurringRuleRow[];
  categories: CategoryRow[];
  budgets: BudgetRow[];
  goals: GoalRow[];
  investments: InvestmentRow[];
  investmentValuations: InvestmentValuationRow[];
}

/** Everything in the workspace — RGPD "export complet" (droit d'accès / portabilité). */
export async function fetchFullExportData(): Promise<FullExportData> {
  const supabase = createClient();
  const [
    transactions,
    recurringRules,
    categories,
    budgets,
    goals,
    investments,
    investmentValuations,
    accounts,
    bankConnections,
    profile,
    authUser,
  ] = await Promise.all([
      supabase.from("transactions").select("*"),
      supabase.from("recurring_rules").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("budgets").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("investments").select("*"),
      supabase.from("investment_valuations").select("*"),
      supabase.from("accounts").select("*"),
      // Explicit columns: the provider's technical correlators stay out of the export.
      supabase
        .from("bank_connections")
        .select("id, account_id, aspsp_name, aspsp_country, iban, currency, status, valid_until, last_synced_at, created_at"),
      supabase.from("profiles").select("default_currency, locale, display_name, created_at").maybeSingle(),
      supabase.auth.getUser(),
    ]);

  return {
    userEmail: authUser.data.user?.email ?? null,
    profile: unwrap(profile),
    accounts: unwrap(accounts),
    bankConnections: unwrap(bankConnections),
    transactions: unwrap(transactions),
    recurringRules: unwrap(recurringRules),
    categories: unwrap(categories),
    budgets: unwrap(budgets),
    goals: unwrap(goals),
    investments: unwrap(investments),
    investmentValuations: unwrap(investmentValuations),
  };
}

/** One calendar month of transactions + categories + budgets — PDF monthly report. */
export async function fetchMonthlyReportData(
  yearMonth: string,
): Promise<{ transactions: TransactionRow[]; categories: CategoryRow[]; budgets: BudgetRow[] }> {
  const from = `${yearMonth}-01`;
  const [year, month] = yearMonth.split("-").map(Number);
  const to = new Date(Date.UTC(year ?? 2026, (month ?? 1), 0)).toISOString().slice(0, 10);

  const supabase = createClient();
  const [transactions, categories, budgets] = await Promise.all([
    supabase.from("transactions").select("*").gte("date", from).lte("date", to).order("date", { ascending: true }),
    supabase.from("categories").select("*"),
    supabase.from("budgets").select("*"),
  ]);

  return { transactions: unwrap(transactions), categories: unwrap(categories), budgets: unwrap(budgets) };
}
