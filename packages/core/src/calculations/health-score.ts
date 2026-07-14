import type { Budget, Goal, Transaction } from "../types/index.js";
import { calculateBudgetStatuses } from "./budget.js";

export interface HealthScore {
  score: number;        // 0–100
  label: "critical" | "poor" | "fair" | "good" | "excellent";
  breakdown: {
    savingsRate: number;      // 0–100 points
    budgetAdherence: number;  // 0–100 points
    goalProgress: number;     // 0–100 points
  };
}

/**
 * Computes a financial health score (0–100) from transactions, budgets and goals.
 * Weighted: savings 40%, budgets 40%, goals 20%.
 */
export function calculateHealthScore(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
): HealthScore {
  // Savings rate (income vs expenses)
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount_eur;
    else if (tx.type === "expense") expenses += tx.amount_eur;
  }
  const savingsRate =
    income > 0 ? Math.min(100, Math.max(0, ((income - expenses) / income) * 100)) : 0;

  // Budget adherence — penalise exceeded budgets
  const statuses = calculateBudgetStatuses(budgets, transactions);
  const budgetAdherence =
    statuses.length > 0
      ? statuses.reduce((sum, s) => sum + (s.isExceeded ? 0 : 100 - s.percentage), 0) /
        statuses.length
      : 100; // no budgets set → neutral

  // Goal progress — average progress across all goals
  const goalProgress =
    goals.length > 0
      ? goals.reduce((sum, g) => {
          const pct =
            g.target_amount_eur > 0
              ? Math.min(100, (g.current_amount_eur / g.target_amount_eur) * 100)
              : 0;
          return sum + pct;
        }, 0) / goals.length
      : 100; // no goals → neutral

  const score = Math.round(savingsRate * 0.4 + budgetAdherence * 0.4 + goalProgress * 0.2);

  const label =
    score >= 85
      ? "excellent"
      : score >= 70
        ? "good"
        : score >= 50
          ? "fair"
          : score >= 30
            ? "poor"
            : "critical";

  return {
    score,
    label,
    breakdown: {
      savingsRate: Math.round(savingsRate),
      budgetAdherence: Math.round(budgetAdherence),
      goalProgress: Math.round(goalProgress),
    },
  };
}
