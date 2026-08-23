import { createClient } from "../supabase/client";
import type { CategoryRow, TransactionRow } from "../transactions/types";
import type { RecurringRuleRow } from "../recurring/types";
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
  const [transactions, recurringRules, categories, budgets, goals, investments, investmentValuations] =
    await Promise.all([
      supabase.from("transactions").select("*"),
      supabase.from("recurring_rules").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("budgets").select("*"),
      supabase.from("goals").select("*"),
      supabase.from("investments").select("*"),
      supabase.from("investment_valuations").select("*"),
    ]);

  return {
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
