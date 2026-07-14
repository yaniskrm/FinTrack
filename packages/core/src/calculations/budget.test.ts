import { describe, expect, it } from "vitest";
import { calculateBudgetStatuses } from "./budget.js";
import type { Budget, Transaction } from "../types/index.js";

const makeBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: "b1",
  workspace_id: "ws1",
  category_id: "cat1",
  amount_eur: 500,
  period: "monthly",
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  workspace_id: "ws1",
  category_id: "cat1",
  amount: 100,
  currency: "EUR",
  amount_eur: 100,
  type: "expense",
  label: "Test",
  note: null,
  date: "2024-01-15",
  recurring_rule_id: null,
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
  ...overrides,
});

describe("calculateBudgetStatuses", () => {
  it("returns empty array for no budgets", () => {
    expect(calculateBudgetStatuses([], [])).toEqual([]);
  });

  it("calculates spent and remaining correctly", () => {
    const budget = makeBudget({ amount_eur: 500 });
    const txs = [makeTx({ amount_eur: 200 }), makeTx({ amount_eur: 100 })];
    const [status] = calculateBudgetStatuses([budget], txs);
    expect(status?.spent).toBe(300);
    expect(status?.remaining).toBe(200);
    expect(status?.percentage).toBeCloseTo(60);
  });

  it("only counts expenses for the matching category", () => {
    const budget = makeBudget({ category_id: "cat1", amount_eur: 400 });
    const txs = [
      makeTx({ category_id: "cat1", amount_eur: 100 }),
      makeTx({ category_id: "cat2", amount_eur: 999 }), // different category
      makeTx({ category_id: "cat1", type: "income", amount_eur: 500 }), // income ignored
    ];
    const [status] = calculateBudgetStatuses([budget], txs);
    expect(status?.spent).toBe(100);
  });

  it("sets isWarning at 80%", () => {
    const budget = makeBudget({ amount_eur: 100 });
    const [status] = calculateBudgetStatuses([budget], [makeTx({ amount_eur: 80 })]);
    expect(status?.isWarning).toBe(true);
    expect(status?.isExceeded).toBe(false);
  });

  it("sets isExceeded at 100%", () => {
    const budget = makeBudget({ amount_eur: 100 });
    const [status] = calculateBudgetStatuses([budget], [makeTx({ amount_eur: 150 })]);
    expect(status?.isExceeded).toBe(true);
    expect(status?.isWarning).toBe(true);
  });

  it("returns 0% when no transactions", () => {
    const budget = makeBudget({ amount_eur: 300 });
    const [status] = calculateBudgetStatuses([budget], []);
    expect(status?.spent).toBe(0);
    expect(status?.percentage).toBe(0);
    expect(status?.isWarning).toBe(false);
  });

  it("handles zero budget amount without dividing by zero", () => {
    const budget = makeBudget({ amount_eur: 0 });
    const [status] = calculateBudgetStatuses([budget], [makeTx({ amount_eur: 50 })]);
    expect(status?.percentage).toBe(0);
  });
});
