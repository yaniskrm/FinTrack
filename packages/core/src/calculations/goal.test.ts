import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "./goal.js";
import type { Goal } from "../types/index.js";

function goal(partial: Partial<Goal>): Goal {
  return {
    id: "g",
    workspace_id: "w",
    name: "Voyage",
    target_amount_eur: 1000,
    current_amount_eur: 0,
    deadline: null,
    created_at: "",
    ...partial,
  };
}

describe("calculateGoalProgress", () => {
  it("reports achieved when current >= target", () => {
    const result = calculateGoalProgress(goal({ current_amount_eur: 1000 }));
    expect(result).toEqual({
      percentage: 100,
      remaining: 0,
      monthsRemaining: 0,
      requiredMonthlyContribution: 0,
      status: "achieved",
    });
  });

  it("reports achieved when current exceeds target", () => {
    expect(calculateGoalProgress(goal({ current_amount_eur: 1200 })).status).toBe("achieved");
  });

  it("reports no_deadline when there's no deadline and it's not achieved", () => {
    const result = calculateGoalProgress(goal({ current_amount_eur: 200, deadline: null }));
    expect(result.status).toBe("no_deadline");
    expect(result.percentage).toBe(20);
    expect(result.remaining).toBe(800);
    expect(result.requiredMonthlyContribution).toBeNull();
  });

  it("reports overdue when the deadline has passed and it's not achieved", () => {
    const today = new Date("2026-06-15T00:00:00Z");
    const result = calculateGoalProgress(
      goal({ current_amount_eur: 200, deadline: "2026-01-01" }),
      today,
    );
    expect(result.status).toBe("overdue");
    expect(result.monthsRemaining).toBe(0);
    expect(result.requiredMonthlyContribution).toBe(800);
  });

  it("computes the required monthly contribution for an on-track goal", () => {
    const today = new Date("2026-01-15T00:00:00Z");
    // 4 months away (Jan -> May), 800 remaining -> 200/month
    const result = calculateGoalProgress(
      goal({ current_amount_eur: 200, deadline: "2026-05-15" }),
      today,
    );
    expect(result.status).toBe("on_track");
    expect(result.monthsRemaining).toBe(4);
    expect(result.requiredMonthlyContribution).toBe(200);
  });

  it("floors monthsRemaining to 1 when the deadline is within the current month", () => {
    const today = new Date("2026-01-05T00:00:00Z");
    const result = calculateGoalProgress(
      goal({ current_amount_eur: 500, deadline: "2026-01-25" }),
      today,
    );
    expect(result.monthsRemaining).toBe(1);
    expect(result.requiredMonthlyContribution).toBe(500);
  });

  it("returns 0% for a zero target (avoids division by zero)", () => {
    const result = calculateGoalProgress(goal({ target_amount_eur: 0, current_amount_eur: 0 }));
    // remaining is also 0 here, so this is "achieved" (nothing left to save).
    expect(result.status).toBe("achieved");
  });
});
