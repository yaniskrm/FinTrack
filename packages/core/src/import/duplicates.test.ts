import { describe, expect, it } from "vitest";
import { findDuplicates } from "./duplicates.js";
import type { ParsedStatementRow } from "./bank-statement.js";
import type { Transaction } from "../types/index.js";

function makeRow(overrides: Partial<ParsedStatementRow> = {}): ParsedStatementRow {
  return {
    date: "2026-08-01",
    label: "Courses",
    amount: 45.9,
    type: "expense",
    currency: "EUR",
    externalRef: null,
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
    external_ref: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("findDuplicates — probable tier (no external_ref, exact-match fallback, ADR-021)", () => {
  it("flags a row matching an existing transaction on date/type/currency/amount", () => {
    const rows = [makeRow()];
    const existing = [makeTx()];
    expect(findDuplicates(rows, existing)).toEqual([{ isCertainDuplicate: false, isProbableDuplicate: true }]);
  });

  it("does not flag a row with no matching existing transaction", () => {
    const rows = [makeRow()];
    expect(findDuplicates(rows, [])).toEqual([{ isCertainDuplicate: false, isProbableDuplicate: false }]);
  });

  it("does not flag when the date differs", () => {
    const rows = [makeRow({ date: "2026-08-02" })];
    const result = findDuplicates(rows, [makeTx({ date: "2026-08-01" })]);
    expect(result[0]?.isProbableDuplicate).toBe(false);
  });

  it("does not flag when the amount differs beyond rounding tolerance", () => {
    const rows = [makeRow({ amount: 45.9 })];
    const result = findDuplicates(rows, [makeTx({ amount: 46.5 })]);
    expect(result[0]?.isProbableDuplicate).toBe(false);
  });

  it("does not flag when the type differs (income vs expense)", () => {
    const rows = [makeRow({ type: "income" })];
    const result = findDuplicates(rows, [makeTx({ type: "expense" })]);
    expect(result[0]?.isProbableDuplicate).toBe(false);
  });

  it("does not flag when the currency differs", () => {
    const rows = [makeRow({ currency: "USD" })];
    const result = findDuplicates(rows, [makeTx({ currency: "EUR" })]);
    expect(result[0]?.isProbableDuplicate).toBe(false);
  });

  it("tolerates a sub-cent rounding difference", () => {
    const rows = [makeRow({ amount: 45.9 })];
    const result = findDuplicates(rows, [makeTx({ amount: 45.899 })]);
    expect(result[0]?.isProbableDuplicate).toBe(true);
  });

  it("evaluates each row independently", () => {
    const rows = [makeRow({ date: "2026-08-01" }), makeRow({ date: "2026-09-01" })];
    const result = findDuplicates(rows, [makeTx({ date: "2026-08-01" })]);
    expect(result.map((r) => r.isProbableDuplicate)).toEqual([true, false]);
  });
});

describe("findDuplicates — certain tier (external_ref match)", () => {
  it("flags a row as certain when its external_ref matches an existing transaction on the same account", () => {
    const rows = [makeRow({ externalRef: "dbs:000003183851603" })];
    const existing = [makeTx({ external_ref: "dbs:000003183851603" })];
    expect(findDuplicates(rows, existing)).toEqual([{ isCertainDuplicate: true, isProbableDuplicate: false }]);
  });

  it("does not flag as certain when the external_ref doesn't match any existing transaction", () => {
    const rows = [makeRow({ externalRef: "dbs:000003183851603" })];
    const existing = [makeTx({ external_ref: "dbs:000003183851602" })];
    expect(findDuplicates(rows, existing)).toEqual([{ isCertainDuplicate: false, isProbableDuplicate: false }]);
  });

  it("never falls back to the probable heuristic once a row carries an external_ref", () => {
    // Same date/type/currency/amount as an existing transaction, but a
    // different external_ref — a real, distinct transaction (e.g. a second
    // HelloRide ride the same day), must not be flagged at all.
    const rows = [makeRow({ amount: 1, externalRef: "dbs:000003183851603" })];
    const existing = [makeTx({ amount: 1, external_ref: "dbs:000003183851602" })];
    expect(findDuplicates(rows, existing)).toEqual([{ isCertainDuplicate: false, isProbableDuplicate: false }]);
  });

  it("three legitimate same-day same-amount rows, each with a distinct external_ref, are never flagged against each other", () => {
    // The HelloRide case: 3 rides, same date/amount/currency, real DBS
    // Additional Reference values differing by 1 (see dbs.test.ts).
    const rows = [
      makeRow({ amount: 1, externalRef: "dbs:000003183851601" }),
      makeRow({ amount: 1, externalRef: "dbs:000003183851602" }),
      makeRow({ amount: 1, externalRef: "dbs:000003183851603" }),
    ];
    // First import: nothing exists yet — none are duplicates.
    expect(findDuplicates(rows, [])).toEqual([
      { isCertainDuplicate: false, isProbableDuplicate: false },
      { isCertainDuplicate: false, isProbableDuplicate: false },
      { isCertainDuplicate: false, isProbableDuplicate: false },
    ]);

    // Re-importing the same file: all 3 are now certain duplicates.
    const existing = rows.map((r, i) => makeTx({ id: `t${String(i)}`, amount: 1, external_ref: r.externalRef }));
    expect(findDuplicates(rows, existing)).toEqual([
      { isCertainDuplicate: true, isProbableDuplicate: false },
      { isCertainDuplicate: true, isProbableDuplicate: false },
      { isCertainDuplicate: true, isProbableDuplicate: false },
    ]);
  });
});
