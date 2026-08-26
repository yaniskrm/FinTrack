import { describe, expect, it } from "vitest";
import { calculateOutstandingReimbursements } from "./reimbursements.js";
import type { ReimbursementStatus, Transaction } from "../types/index.js";

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    workspace_id: "ws1",
    account_id: "acc1",
    to_account_id: null,
    category_id: null,
    amount: 20,
    currency: "EUR",
    amount_eur: 20,
    type: "expense",
    label: "Dîner partagé",
    merchant: null,
    note: null,
    date: "2026-01-10",
    recurring_rule_id: null,
    reimbursement_status: "none",
    reimbursement_contact: null,
    settled_transaction_id: null,
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
    ...overrides,
  };
}

describe("calculateOutstandingReimbursements", () => {
  it("returns zero for no transactions", () => {
    expect(calculateOutstandingReimbursements([])).toEqual({ totalOutstandingEur: 0, items: [] });
  });

  it("only counts pending reimbursements", () => {
    const statuses: ReimbursementStatus[] = ["none", "pending", "settled"];
    const transactions = statuses.map((reimbursement_status, i) =>
      makeTx({ id: `t${String(i)}`, amount_eur: 10, reimbursement_status }),
    );
    const result = calculateOutstandingReimbursements(transactions);
    expect(result.totalOutstandingEur).toBe(10);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.transaction.reimbursement_status).toBe("pending");
  });

  it("sums amount_eur across multiple pending items", () => {
    const transactions = [
      makeTx({ id: "t1", amount_eur: 15, reimbursement_status: "pending" }),
      makeTx({ id: "t2", amount_eur: 32.5, reimbursement_status: "pending" }),
    ];
    expect(calculateOutstandingReimbursements(transactions).totalOutstandingEur).toBe(47.5);
  });

  it("sorts items most recent first", () => {
    const transactions = [
      makeTx({ id: "old", date: "2026-01-01", reimbursement_status: "pending" }),
      makeTx({ id: "new", date: "2026-03-01", reimbursement_status: "pending" }),
    ];
    const result = calculateOutstandingReimbursements(transactions);
    expect(result.items.map((i) => i.transaction.id)).toEqual(["new", "old"]);
  });

  it("rounds the total to 2 decimals", () => {
    const transactions = [
      makeTx({ id: "t1", amount_eur: 10.1, reimbursement_status: "pending" }),
      makeTx({ id: "t2", amount_eur: 10.2, reimbursement_status: "pending" }),
    ];
    expect(calculateOutstandingReimbursements(transactions).totalOutstandingEur).toBe(20.3);
  });
});
