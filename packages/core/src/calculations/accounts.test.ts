import { describe, expect, it } from "vitest";
import { calculateAccountBalance, calculateAccountBalances, calculateTotalBalance } from "./accounts.js";
import type { Account, Transaction } from "../types/index.js";

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc1",
    workspace_id: "ws1",
    name: "Compte principal",
    type: "checking",
    currency: "EUR",
    initial_balance: 0,
    initial_balance_eur: 0,
    color: "#C9A961",
    icon: "🏦",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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
    amount: 20,
    currency: "EUR",
    amount_eur: 20,
    type: "expense",
    label: "Courses",
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

describe("calculateAccountBalance", () => {
  it("starts from the frozen initial balance when there are no transactions", () => {
    const account = makeAccount({ initial_balance_eur: 500 });
    expect(calculateAccountBalance(account, [])).toBe(500);
  });

  it("adds income and subtracts expenses booked on this account", () => {
    const account = makeAccount({ initial_balance_eur: 100 });
    const transactions = [
      makeTx({ id: "t1", type: "income", amount_eur: 1000 }),
      makeTx({ id: "t2", type: "expense", amount_eur: 40 }),
    ];
    expect(calculateAccountBalance(account, transactions)).toBe(1060);
  });

  it("ignores transactions booked on a different account", () => {
    const account = makeAccount({ id: "acc1", initial_balance_eur: 100 });
    const transactions = [makeTx({ account_id: "acc2", type: "income", amount_eur: 1000 })];
    expect(calculateAccountBalance(account, transactions)).toBe(100);
  });

  it("subtracts a transfer from the source account", () => {
    const source = makeAccount({ id: "acc1", initial_balance_eur: 500 });
    const transactions = [
      makeTx({ type: "transfer", account_id: "acc1", to_account_id: "acc2", amount_eur: 200 }),
    ];
    expect(calculateAccountBalance(source, transactions)).toBe(300);
  });

  it("adds a transfer to the destination account", () => {
    const destination = makeAccount({ id: "acc2", initial_balance_eur: 0 });
    const transactions = [
      makeTx({ type: "transfer", account_id: "acc1", to_account_id: "acc2", amount_eur: 200 }),
    ];
    expect(calculateAccountBalance(destination, transactions)).toBe(200);
  });

  it("leaves a third, uninvolved account untouched by a transfer", () => {
    const bystander = makeAccount({ id: "acc3", initial_balance_eur: 50 });
    const transactions = [
      makeTx({ type: "transfer", account_id: "acc1", to_account_id: "acc2", amount_eur: 200 }),
    ];
    expect(calculateAccountBalance(bystander, transactions)).toBe(50);
  });
});

describe("calculateAccountBalances", () => {
  it("returns a balance per account keyed by id", () => {
    const accounts = [
      makeAccount({ id: "acc1", initial_balance_eur: 100 }),
      makeAccount({ id: "acc2", initial_balance_eur: 200 }),
    ];
    const transactions = [makeTx({ account_id: "acc1", type: "income", amount_eur: 50 })];
    const result = calculateAccountBalances(accounts, transactions);
    expect(result.get("acc1")).toBe(150);
    expect(result.get("acc2")).toBe(200);
  });
});

describe("calculateTotalBalance", () => {
  it("sums every account's balance", () => {
    const accounts = [
      makeAccount({ id: "acc1", initial_balance_eur: 100 }),
      makeAccount({ id: "acc2", initial_balance_eur: 200 }),
    ];
    const transactions = [makeTx({ account_id: "acc1", type: "income", amount_eur: 50 })];
    expect(calculateTotalBalance(accounts, transactions)).toBe(350);
  });

  it("nets transfers to zero across the whole set of accounts", () => {
    const accounts = [
      makeAccount({ id: "acc1", initial_balance_eur: 100 }),
      makeAccount({ id: "acc2", initial_balance_eur: 200 }),
    ];
    const transactions = [
      makeTx({ type: "transfer", account_id: "acc1", to_account_id: "acc2", amount_eur: 75 }),
    ];
    expect(calculateTotalBalance(accounts, transactions)).toBe(300);
  });
});
