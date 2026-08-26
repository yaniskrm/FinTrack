import { describe, expect, it } from "vitest";
import { cumulativeBalanceByDay, groupExpensesByCategory } from "./dashboard.js";
import type { Transaction } from "../types/index.js";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: "t",
    workspace_id: "w",
    account_id: "acc1",
    to_account_id: null,
    category_id: null,
    amount: 0,
    currency: "EUR",
    amount_eur: 0,
    type: "expense",
    label: "x",
    note: null,
    date: "2026-01-01",
    recurring_rule_id: null,
    merchant: null,
    reimbursement_status: "none",
    reimbursement_contact: null,
    settled_transaction_id: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("groupExpensesByCategory", () => {
  it("sums expenses per category, descending, ignoring income/transfer", () => {
    const result = groupExpensesByCategory([
      tx({ type: "expense", category_id: "a", amount_eur: 10 }),
      tx({ type: "expense", category_id: "a", amount_eur: 5 }),
      tx({ type: "expense", category_id: "b", amount_eur: 30 }),
      tx({ type: "expense", category_id: null, amount_eur: 7 }),
      tx({ type: "income", category_id: "a", amount_eur: 100 }),
      tx({ type: "transfer", category_id: "b", amount_eur: 100 }),
    ]);

    expect(result).toEqual([
      { categoryId: "b", total: 30 },
      { categoryId: "a", total: 15 },
      { categoryId: null, total: 7 },
    ]);
  });

  it("returns an empty array when there are no expenses", () => {
    expect(groupExpensesByCategory([tx({ type: "income", amount_eur: 50 })])).toEqual([]);
  });
});

describe("cumulativeBalanceByDay", () => {
  it("accumulates net balance chronologically, one point per active day", () => {
    const result = cumulativeBalanceByDay([
      tx({ date: "2026-01-03", type: "expense", amount_eur: 20 }),
      tx({ date: "2026-01-01", type: "income", amount_eur: 100 }),
      tx({ date: "2026-01-01", type: "expense", amount_eur: 30 }),
      tx({ date: "2026-01-02", type: "income", amount_eur: 50 }),
    ]);

    expect(result).toEqual([
      { date: "2026-01-01", balance: 70 },
      { date: "2026-01-02", balance: 120 },
      { date: "2026-01-03", balance: 100 },
    ]);
  });

  it("returns an empty array for no transactions", () => {
    expect(cumulativeBalanceByDay([])).toEqual([]);
  });
});
