import { describe, expect, it } from "vitest";
import { calculateHealthScore } from "./health-score.js";
import type { Budget, Goal, Transaction } from "../types/index.js";

const makeTx = (type: "income" | "expense", amount_eur: number): Transaction => ({
  id: crypto.randomUUID(),
  workspace_id: "ws1",
  category_id: null,
  amount: amount_eur,
  currency: "EUR",
  amount_eur,
  type,
  label: "Test",
  note: null,
  date: "2024-01-15",
  recurring_rule_id: null,
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
});

const makeBudget = (amount_eur: number, category_id = "cat1"): Budget => ({
  id: crypto.randomUUID(),
  workspace_id: "ws1",
  category_id,
  amount_eur,
  period: "monthly",
  created_at: "2024-01-01T00:00:00Z",
});

const makeGoal = (target: number, current: number): Goal => ({
  id: crypto.randomUUID(),
  workspace_id: "ws1",
  name: "Goal",
  target_amount_eur: target,
  current_amount_eur: current,
  deadline: null,
  created_at: "2024-01-01T00:00:00Z",
});

describe("calculateHealthScore", () => {
  it("returns neutral score with no data", () => {
    const result = calculateHealthScore([], [], []);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns excellent when saving 50% with budgets under control", () => {
    const txs = [makeTx("income", 2000), makeTx("expense", 1000)];
    const budgets = [makeBudget(1200)]; // 1000 spent / 1200 = 83% — warning but not exceeded
    const goals = [makeGoal(1000, 500)];
    const result = calculateHealthScore(txs, budgets, goals);
    expect(result.score).toBeGreaterThan(50);
  });

  it("returns low score when spending heavily exceeds income", () => {
    // savingsRate=0 (capped), budgetAdherence=100 (no budgets), goalProgress=100 (no goals)
    // score = 0*0.4 + 100*0.4 + 100*0.2 = 60 → "fair"
    const txs = [makeTx("income", 500), makeTx("expense", 2000)];
    const result = calculateHealthScore(txs, [], []);
    expect(result.breakdown.savingsRate).toBe(0);
    expect(result.score).toBeLessThan(70);
  });

  it("returns 0 savings rate when no income", () => {
    const txs = [makeTx("expense", 500)];
    const result = calculateHealthScore(txs, [], []);
    expect(result.breakdown.savingsRate).toBe(0);
  });

  it("caps savings rate at 100", () => {
    const txs = [makeTx("income", 1000)]; // no expenses
    const result = calculateHealthScore(txs, [], []);
    expect(result.breakdown.savingsRate).toBe(100);
  });

  it("goal progress is 100 when no goals set", () => {
    const result = calculateHealthScore([], [], []);
    expect(result.breakdown.goalProgress).toBe(100);
  });

  it("caps goal progress at 100 when overachieved", () => {
    const goals = [makeGoal(100, 200)];
    const result = calculateHealthScore([], [], goals);
    expect(result.breakdown.goalProgress).toBe(100);
  });

  it("has correct label boundaries", () => {
    const excellent = calculateHealthScore(
      [makeTx("income", 2000), makeTx("expense", 200)],
      [],
      [makeGoal(100, 100)],
    );
    expect(["excellent", "good"]).toContain(excellent.label);
  });

  it("score is always between 0 and 100", () => {
    const cases = [
      calculateHealthScore([], [], []),
      calculateHealthScore([makeTx("expense", 9999)], [], []),
      calculateHealthScore([makeTx("income", 9999)], [], []),
    ];
    for (const result of cases) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});