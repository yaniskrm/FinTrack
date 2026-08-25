import type { Transaction } from "../types/index.js";

export interface OutstandingReimbursement {
  transaction: Transaction;
  amountEur: number;
}

export interface ReimbursementSummary {
  totalOutstandingEur: number;
  items: OutstandingReimbursement[];
}

/**
 * Money fronted for someone else, not yet paid back — a receivable owed
 * *to* the workspace. Only `pending` counts: `settled` already has its
 * matching income transaction (see settled_transaction_id) and so is
 * already reflected in the normal balance; `none` was never marked as a
 * reimbursement in the first place.
 */
export function calculateOutstandingReimbursements(transactions: Transaction[]): ReimbursementSummary {
  const items = transactions
    .filter((tx) => tx.reimbursement_status === "pending")
    .map((tx) => ({ transaction: tx, amountEur: tx.amount_eur }))
    .sort((a, b) => (a.transaction.date < b.transaction.date ? 1 : -1));

  const totalOutstandingEur = Math.round(items.reduce((sum, item) => sum + item.amountEur, 0) * 100) / 100;

  return { totalOutstandingEur, items };
}
