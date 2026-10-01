import type { ParsedStatementRow } from "./bank-statement.js";
import type { Transaction } from "../types/index.js";

export interface DuplicateCheckResult {
  /** Same account, same `external_ref` as an already-imported transaction —
   * a bank-assigned reference matching is proof, not a guess. Auto-excluded
   * from import, no checkbox (see ImportView). */
  isCertainDuplicate: boolean;
  /** No `external_ref` to compare (this row or every existing transaction
   * lacks one) — falls back to the exact-match heuristic (ADR-021): same
   * date/type/currency/amount. A guess, so the user still decides via a
   * checkbox. */
  isProbableDuplicate: boolean;
}

/**
 * Two-tier duplicate detection for the review step. A row with a bank
 * reference (`externalRef`) is checked against existing transactions'
 * `external_ref` on the same account — a match is certain, not probable,
 * because two distinct real transactions can never share one (enforced in
 * the database by `transactions_account_external_ref_key`). Only when no
 * reference is available (Revolut, or a DBS row type without one — NETS QR
 * falls back to an embedded ref, but TRF never does) does this fall back to
 * the original exact-match heuristic.
 */
export function findDuplicates(
  rows: ParsedStatementRow[],
  existingTransactions: Transaction[],
): DuplicateCheckResult[] {
  const existingRefs = new Set(
    existingTransactions.map((tx) => tx.external_ref).filter((ref): ref is string => ref !== null),
  );

  return rows.map((row) => {
    if (row.externalRef) {
      return { isCertainDuplicate: existingRefs.has(row.externalRef), isProbableDuplicate: false };
    }

    const isProbable = existingTransactions.some(
      (tx) =>
        tx.date === row.date &&
        tx.type === row.type &&
        tx.currency === row.currency &&
        Math.abs(tx.amount - row.amount) < 0.01,
    );
    return { isCertainDuplicate: false, isProbableDuplicate: isProbable };
  });
}
