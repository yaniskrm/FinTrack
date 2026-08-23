import {
  calculateHealthScore,
  calculateTotals,
  cumulativeBalanceByDay,
  groupExpensesByCategory,
} from "@fintrack/core";
import type { HealthScore, Transaction } from "@fintrack/core";
import type { CategoryRow, TransactionRow } from "./transactions/types";

const CHART_SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
const TOP_CATEGORIES = 6;

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyPoint {
  month: string; // display label, e.g. "août 26"
  income: number;
  expenses: number;
}

export interface DashboardData {
  totals: { totalIncome: number; totalExpenses: number; netBalance: number };
  health: Pick<HealthScore, "score" | "label">;
  sparkline: { date: string; balance: number }[];
  categories: CategorySlice[];
  monthly: MonthlyPoint[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthLabel(yyyymm: string): string {
  return new Date(`${yyyymm}-01T00:00:00`).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function buildDashboard(
  transactions: TransactionRow[],
  categories: CategoryRow[],
): DashboardData {
  // Core calcs only read amount_eur / type / date / category_id; the DB row's
  // wider `currency: string` is irrelevant here, so this boundary cast is safe.
  const txs = transactions as unknown as Transaction[];

  const totals = calculateTotals(txs);
  const health = calculateHealthScore(txs, [], []);
  const sparkline = cumulativeBalanceByDay(txs);

  // Donut: top categories by expense + an "Autres" bucket.
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const grouped = groupExpensesByCategory(txs);
  const categorySlices: CategorySlice[] = grouped.slice(0, TOP_CATEGORIES).map((g, i) => ({
    name: g.categoryId ? (categoryById.get(g.categoryId)?.name ?? "Sans catégorie") : "Sans catégorie",
    value: round2(g.total),
    color: CHART_SLOTS[i] ?? "var(--chart-other)",
  }));
  const rest = grouped.slice(TOP_CATEGORIES);
  if (rest.length > 0) {
    categorySlices.push({
      name: "Autres",
      value: round2(rest.reduce((sum, g) => sum + g.total, 0)),
      color: "var(--chart-other)",
    });
  }

  // Monthly income vs expenses.
  const monthMap = new Map<string, { income: number; expenses: number }>();
  for (const tx of txs) {
    const key = tx.date.slice(0, 7);
    const entry = monthMap.get(key) ?? { income: 0, expenses: 0 };
    if (tx.type === "income") entry.income += tx.amount_eur;
    else if (tx.type === "expense") entry.expenses += tx.amount_eur;
    monthMap.set(key, entry);
  }
  const monthly: MonthlyPoint[] = [...monthMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, v]) => ({
      month: monthLabel(month),
      income: round2(v.income),
      expenses: round2(v.expenses),
    }));

  return {
    totals: {
      totalIncome: round2(totals.totalIncome),
      totalExpenses: round2(totals.totalExpenses),
      netBalance: round2(totals.netBalance),
    },
    health: { score: health.score, label: health.label },
    sparkline,
    categories: categorySlices,
    monthly,
  };
}
