import { describe, expect, it } from "vitest";
import { calculateBudgetStatuses, suggestBudgetAmount } from "./budget.js";
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
  account_id: "acc1",
  to_account_id: null,
  category_id: "cat1",
  amount: 100,
  currency: "EUR",
  amount_eur: 100,
  type: "expense",
  label: "Test",
  note: null,
  date: "2024-01-15",
  recurring_rule_id: null,
  merchant: null,
  reimbursement_status: "none",
  reimbursement_contact: null,
  settled_transaction_id: null,
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

describe("suggestBudgetAmount", () => {
  const reference = new Date("2026-04-15T00:00:00Z"); // -> window: Jan 1 to Apr 1

  it("averages the 3 prior calendar months of expenses for the category", () => {
    const txs = [
      makeTx({ category_id: "cat1", amount_eur: 100, date: "2026-01-10" }),
      makeTx({ category_id: "cat1", amount_eur: 200, date: "2026-02-10" }),
      makeTx({ category_id: "cat1", amount_eur: 300, date: "2026-03-10" }),
    ];
    expect(suggestBudgetAmount("cat1", txs, reference)).toBe(200);
  });

  it("excludes the current (in-progress) month", () => {
    const txs = [
      makeTx({ category_id: "cat1", amount_eur: 300, date: "2026-03-10" }),
      makeTx({ category_id: "cat1", amount_eur: 9999, date: "2026-04-10" }), // current month
    ];
    expect(suggestBudgetAmount("cat1", txs, reference)).toBe(100);
  });

  it("excludes other categories and income", () => {
    const txs = [
      makeTx({ category_id: "cat1", amount_eur: 150, date: "2026-03-01" }),
      makeTx({ category_id: "cat2", amount_eur: 500, date: "2026-03-01" }),
      makeTx({ category_id: "cat1", type: "income", amount_eur: 1000, date: "2026-03-01" }),
    ];
    expect(suggestBudgetAmount("cat1", txs, reference)).toBe(50);
  });

  it("returns 0 with no spending history", () => {
    expect(suggestBudgetAmount("cat1", [], reference)).toBe(0);
  });
});
