import { describe, expect, it } from "vitest";
import { findLikelyDuplicates } from "./duplicates.js";
import type { ParsedStatementRow } from "./bank-statement.js";
import type { Transaction } from "../types/index.js";

function makeRow(overrides: Partial<ParsedStatementRow> = {}): ParsedStatementRow {
  return {
    date: "2026-08-01",
    label: "Courses",
    amount: 45.9,
    type: "expense",
    currency: "EUR",
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    workspace_id: "ws1",
    account_id: "acc1",
    to_account_id: null,
    category_id: null,
    amount: 45.9,
    currency: "EUR",
    amount_eur: 45.9,
    type: "expense",
    label: "Courses",
    merchant: null,
    note: null,
    date: "2026-08-01",
    recurring_rule_id: null,
    reimbursement_status: "none",
    reimbursement_contact: null,
    settled_transaction_id: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("findLikelyDuplicates", () => {
  it("flags a row matching an existing transaction on date/type/currency/amount", () => {
    const rows = [makeRow()];
    const existing = [makeTx()];
    expect(findLikelyDuplicates(rows, existing)).toEqual([true]);
  });

  it("does not flag a row with no matching existing transaction", () => {
    const rows = [makeRow()];
    expect(findLikelyDuplicates(rows, [])).toEqual([false]);
  });

  it("does not flag when the date differs", () => {
    const rows = [makeRow({ date: "2026-08-02" })];
    expect(findLikelyDuplicates(rows, [makeTx({ date: "2026-08-01" })])).toEqual([false]);
  });

  it("does not flag when the amount differs beyond rounding tolerance", () => {
    const rows = [makeRow({ amount: 45.9 })];
    expect(findLikelyDuplicates(rows, [makeTx({ amount: 46.5 })])).toEqual([false]);
  });

  it("does not flag when the type differs (income vs expense)", () => {
    const rows = [makeRow({ type: "income" })];
    expect(findLikelyDuplicates(rows, [makeTx({ type: "expense" })])).toEqual([false]);
  });

  it("does not flag when the currency differs", () => {
    const rows = [makeRow({ currency: "USD" })];
    expect(findLikelyDuplicates(rows, [makeTx({ currency: "EUR" })])).toEqual([false]);
  });

  it("tolerates a sub-cent rounding difference", () => {
    const rows = [makeRow({ amount: 45.9 })];
    expect(findLikelyDuplicates(rows, [makeTx({ amount: 45.899 })])).toEqual([true]);
  });

  it("evaluates each row independently", () => {
    const rows = [makeRow({ date: "2026-08-01" }), makeRow({ date: "2026-09-01" })];
    expect(findLikelyDuplicates(rows, [makeTx({ date: "2026-08-01" })])).toEqual([true, false]);
  });
});
