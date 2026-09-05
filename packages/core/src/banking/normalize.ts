import { currencySchema } from "../validators/transaction-schema.js";
import type { Currency } from "../types/index.js";
import type { ParsedStatementRow } from "../import/bank-statement.js";
import type { EnableBankingTransaction } from "./types.js";

// Berlin Group / ISO 20022 status codes meaning "not booked yet" — same
// principle as NON_FINAL_STATUSES in ../import/bank-statement.ts: never
// show the user a movement the bank hasn't actually settled.
const NON_FINAL_STATUSES = new Set(["pdng", "pending", "opnd", "futr"]);

/**
 * Converts Enable Banking's transaction shape into the same
 * `ParsedStatementRow` produced by the CSV importer (Phase 12), so Open
 * Banking feeds the exact same duplicate-detection and category-suggestion
 * pipeline — a synced transaction and a manually-imported one are
 * indistinguishable downstream. Never produces `type: "transfer"`, for the
 * same reason as a CSV import (ADR-020/021): an account feed alone can't
 * establish that money moved to *another* account the user also tracks in
 * FinTrack.
 */
export function normalizeEnableBankingTransactions(
  transactions: EnableBankingTransaction[],
  fallbackCurrency: Currency,
): ParsedStatementRow[] {
  const rows: ParsedStatementRow[] = [];

  for (const tx of transactions) {
    if (tx.status && NON_FINAL_STATUSES.has(tx.status.toLowerCase())) continue;

    const date = tx.booking_date ?? tx.value_date;
    const amountRaw = Number(tx.transaction_amount.amount);
    if (!date || !Number.isFinite(amountRaw) || amountRaw === 0) continue;

    const currencyRaw = tx.transaction_amount.currency.toUpperCase();
    const currency = currencySchema.safeParse(currencyRaw).success ? (currencyRaw as Currency) : fallbackCurrency;

    const label =
      tx.remittance_information?.filter(Boolean).join(" ").trim() ||
      tx.creditor?.name ||
      tx.debtor?.name ||
      "Transaction bancaire";

    rows.push({
      date,
      label,
      amount: Math.round(Math.abs(amountRaw) * 100) / 100,
      type: tx.credit_debit_indicator === "CRDT" ? "income" : "expense",
      currency,
    });
  }

  return rows;
}
