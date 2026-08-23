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

/**
 * Suggests a monthly budget for a category: the average of its actual expense
 * spend over the 3 calendar months strictly before `referenceDate` (default:
 * now). Returns 0 when there's no spending history to base a suggestion on.
 */
export function suggestBudgetAmount(
  categoryId: string,
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): number {
  const startOfCurrentMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  const windowStart = new Date(startOfCurrentMonth);
  windowStart.setUTCMonth(windowStart.getUTCMonth() - 3);

  const startStr = windowStart.toISOString().slice(0, 10);
  const endStr = startOfCurrentMonth.toISOString().slice(0, 10);

  const total = transactions
    .filter(
      (tx) =>
        tx.category_id === categoryId &&
        tx.type === "expense" &&
        tx.date >= startStr &&
        tx.date < endStr,
    )
    .reduce((sum, tx) => sum + tx.amount_eur, 0);

  return Math.round((total / 3) * 100) / 100;
}
