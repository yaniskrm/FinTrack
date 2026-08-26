import type { Account, Transaction } from "../types/index.js";

/**
 * Computes one account's balance (in EUR): its frozen initial balance, plus
 * every income/expense booked directly against it, plus/minus transfers
 * where it's the destination/source. A transfer never touches
 * income/expense totals (see calculateBalance) — it only moves money
 * between two accounts, so it's handled here instead.
 */
export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initial_balance_eur;

  for (const tx of transactions) {
    if (tx.type === "transfer") {
      if (tx.account_id === account.id) balance -= tx.amount_eur;
      if (tx.to_account_id === account.id) balance += tx.amount_eur;
      continue;
    }
    if (tx.account_id !== account.id) continue;
    if (tx.type === "income") balance += tx.amount_eur;
    else balance -= tx.amount_eur;
  }

  return balance;
}

/** Balance per account, keyed by account id. */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
): Map<string, number> {
  return new Map(accounts.map((account) => [account.id, calculateAccountBalance(account, transactions)]));
}

/**
 * Total balance across every account (in EUR) — equivalent to summing each
 * account's own balance, since transfers net to zero across the whole set.
 */
export function calculateTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  let total = 0;
  for (const account of accounts) {
    total += calculateAccountBalance(account, transactions);
  }
  return total;
}
