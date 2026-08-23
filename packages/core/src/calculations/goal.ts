import type { Goal } from "../types/index.js";

export type GoalStatus = "achieved" | "on_track" | "overdue" | "no_deadline";

export interface GoalProgress {
  percentage: number; // 0-100
  remaining: number; // EUR still needed, 0 if achieved
  monthsRemaining: number | null; // null when there's no deadline
  requiredMonthlyContribution: number | null; // null only when no deadline and not yet achieved
  status: GoalStatus;
}

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  );
}

/**
 * Progress toward a savings goal: percentage complete, remaining amount, and
 * the monthly contribution required to hit the deadline. `today` is
 * injectable for deterministic tests.
 */
export function calculateGoalProgress(goal: Goal, today: Date = new Date()): GoalProgress {
  const percentage =
    goal.target_amount_eur > 0
      ? Math.min(100, (goal.current_amount_eur / goal.target_amount_eur) * 100)
      : 0;
  const remaining = Math.max(0, Math.round((goal.target_amount_eur - goal.current_amount_eur) * 100) / 100);

  if (remaining <= 0) {
    return { percentage: 100, remaining: 0, monthsRemaining: 0, requiredMonthlyContribution: 0, status: "achieved" };
  }

  if (!goal.deadline) {
    return { percentage, remaining, monthsRemaining: null, requiredMonthlyContribution: null, status: "no_deadline" };
  }

  const deadline = new Date(`${goal.deadline}T00:00:00Z`);
  if (deadline < today) {
    return { percentage, remaining, monthsRemaining: 0, requiredMonthlyContribution: remaining, status: "overdue" };
  }

  // At least 1 month, even if the deadline lands within the current month.
  const monthsRemaining = Math.max(1, monthsBetween(today, deadline));
  const requiredMonthlyContribution = Math.round((remaining / monthsRemaining) * 100) / 100;

  return { percentage, remaining, monthsRemaining, requiredMonthlyContribution, status: "on_track" };
}
