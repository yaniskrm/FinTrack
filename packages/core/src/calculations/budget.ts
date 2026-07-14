import type { Budget, Transaction } from "../types/index.js";

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  isWarning: boolean;   // >= 80%
  isExceeded: boolean;  // >= 100%
}

/**
 * Computes the spending status for each budget envelope.
 * Transactions must be pre-filtered to the relevant period.
 */
export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
): BudgetStatus[] {
  return budgets.map((budget) => {
    const spent = transactions
      .filter((tx) => tx.category_id === budget.category_id && tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount_eur, 0);

    const remaining = budget.amount_eur - spent;
    const percentage = budget.amount_eur > 0 ? (spent / budget.amount_eur) * 100 : 0;

    return {
      budget,
      spent,
      remaining,
      percentage,
      isWarning: percentage >= 80,
      isExceeded: percentage >= 100,
    };
  });
}
