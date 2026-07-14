import { describe, expect, it } from "vitest";
import { calculateBalance, calculateMonthlyBalances, calculateTotals } from "./balance.js";
import type { Transaction } from "../types/index.js";

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: "1",
  workspace_id: "ws1",
  category_id: null,
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

describe("calculateBalance", () => {
  it("returns 0 for empty list", () => {
    expect(calculateBalance([])).toBe(0);
  });

  it("adds income", () => {
    expect(calculateBalance([makeTx({ type: "income", amount_eur: 500 })])).toBe(500);
  });

  it("subtracts expenses", () => {
    expect(calculateBalance([makeTx({ type: "expense", amount_eur: 200 })])).toBe(-200);
  });

  it("ignores transfers", () => {
    expect(calculateBalance([makeTx({ type: "transfer", amount_eur: 300 })])).toBe(0);
  });

  it("handles mixed transactions", () => {
    const txs = [
      makeTx({ type: "income", amount_eur: 3000 }),
      makeTx({ type: "expense", amount_eur: 800 }),
      makeTx({ type: "expense", amount_eur: 200 }),
      makeTx({ type: "transfer", amount_eur: 500 }),
    ];
    expect(calculateBalance(txs)).toBe(2000);
  });
});

describe("calculateMonthlyBalances", () => {
  it("groups by YYYY-MM correctly", () => {
    const txs = [
      makeTx({ type: "income", amount_eur: 1000, date: "2024-01-10" }),
      makeTx({ type: "expense", amount_eur: 400, date: "2024-01-20" }),
      makeTx({ type: "income", amount_eur: 500, date: "2024-02-05" }),
    ];
    const result = calculateMonthlyBalances(txs);
    expect(result.get("2024-01")).toBe(600);
    expect(result.get("2024-02")).toBe(500);
  });
});

describe("calculateTotals", () => {
  it("separates income and expenses", () => {
    const txs = [
      makeTx({ type: "income", amount_eur: 2000 }),
      makeTx({ type: "expense", amount_eur: 500 }),
      makeTx({ type: "expense", amount_eur: 300 }),
    ];
    const result = calculateTotals(txs);
    expect(result.totalIncome).toBe(2000);
    expect(result.totalExpenses).toBe(800);
    expect(result.netBalance).toBe(1200);
  });
});
