import type { Transaction } from "../types/index.js";

/**
 * Computes the net balance (in EUR) from a list of transactions.
 * Income adds, expenses subtract, transfers are neutral (net zero).
 */
export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => {
    if (tx.type === "income") return sum + tx.amount_eur;
    if (tx.type === "expense") return sum - tx.amount_eur;
    return sum; // transfer — handled at workspace level, not double-counted
  }, 0);
}

/**
 * Groups transactions by month (YYYY-MM) and returns the net balance per month.
 */
export function calculateMonthlyBalances(
  transactions: Transaction[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7); // "YYYY-MM"
    const current = map.get(month) ?? 0;
    if (tx.type === "income") {
      map.set(month, current + tx.amount_eur);
    } else if (tx.type === "expense") {
      map.set(month, current - tx.amount_eur);
    }
  }

  return map;
}

/**
 * Returns total expenses and total income separately.
 */
export function calculateTotals(transactions: Transaction[]): {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
} {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type === "income") totalIncome += tx.amount_eur;
    else if (tx.type === "expense") totalExpenses += tx.amount_eur;
  }

  return { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses };
}
