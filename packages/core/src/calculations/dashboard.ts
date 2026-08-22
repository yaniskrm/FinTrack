import type { Transaction } from "../types/index.js";

export interface CategoryExpense {
  categoryId: string | null;
  total: number; // EUR
}

/**
 * Sums expense amount_eur per category (income/transfers ignored), sorted
 * descending by total. Uncategorised expenses are grouped under categoryId null.
 */
export function groupExpensesByCategory(transactions: Transaction[]): CategoryExpense[] {
  const map = new Map<string | null, number>();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.category_id;
    map.set(key, (map.get(key) ?? 0) + tx.amount_eur);
  }

  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);
}

export interface BalancePoint {
  date: string; // YYYY-MM-DD
  balance: number; // cumulative EUR up to and including this day
}

/**
 * Running net balance per day (income adds, expenses subtract), sorted
 * chronologically. One point per day that has at least one transaction —
 * ideal for a sparkline of net worth over time.
 */
export function cumulativeBalanceByDay(transactions: Transaction[]): BalancePoint[] {
  const dailyNet = new Map<string, number>();

  for (const tx of transactions) {
    let delta = 0;
    if (tx.type === "income") delta = tx.amount_eur;
    else if (tx.type === "expense") delta = -tx.amount_eur;
    dailyNet.set(tx.date, (dailyNet.get(tx.date) ?? 0) + delta);
  }

  const days = [...dailyNet.keys()].sort();
  let running = 0;
  return days.map((date) => {
    running += dailyNet.get(date) ?? 0;
    return { date, balance: Math.round(running * 100) / 100 };
  });
}
