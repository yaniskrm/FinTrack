import type { ParsedStatementRow } from "./bank-statement.js";
import type { Transaction } from "../types/index.js";

/**
 * Flags rows that likely already exist in the target account: same date,
 * same direction, same native amount/currency. Deliberately exact-match
 * only (no fuzzy label matching) — a false "not a duplicate" just means an
 * extra row the user can delete after reviewing the import; a false
 * "duplicate" pre-unchecks something they actually wanted imported, which
 * is worse since it's easy to miss in a long review table.
 */
export function findLikelyDuplicates(
  rows: ParsedStatementRow[],
  existingTransactions: Transaction[],
): boolean[] {
  return rows.map((row) =>
    existingTransactions.some(
      (tx) =>
        tx.date === row.date &&
        tx.type === row.type &&
        tx.currency === row.currency &&
        Math.abs(tx.amount - row.amount) < 0.01,
    ),
  );
}
