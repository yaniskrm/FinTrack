import { describe, expect, it } from "vitest";
import { normalizeEnableBankingTransactions } from "./normalize.js";
import type { EnableBankingTransaction } from "./types.js";

function tx(overrides: Partial<EnableBankingTransaction>): EnableBankingTransaction {
  return {
    transaction_amount: { amount: "42.50", currency: "EUR" },
    booking_date: "2026-09-01",
    credit_debit_indicator: "DBIT",
    ...overrides,
  };
}

describe("normalizeEnableBankingTransactions", () => {
  it("maps a debit to an expense with a positive amount", () => {
    const [row] = normalizeEnableBankingTransactions([tx({})], "EUR");
    expect(row).toMatchObject({ date: "2026-09-01", amount: 42.5, type: "expense", currency: "EUR" });
  });

  it("maps a credit to income", () => {
    const [row] = normalizeEnableBankingTransactions(
      [tx({ credit_debit_indicator: "CRDT", transaction_amount: { amount: "1500", currency: "EUR" } })],
      "EUR",
    );
    expect(row).toMatchObject({ type: "income", amount: 1500 });
  });

  it("prefers value_date when booking_date is absent", () => {
    const [row] = normalizeEnableBankingTransactions(
      [
        {
          transaction_amount: { amount: "42.50", currency: "EUR" },
          value_date: "2026-09-02",
          credit_debit_indicator: "DBIT",
        },
      ],
      "EUR",
    );
    expect(row?.date).toBe("2026-09-02");
  });

  it("builds the label from remittance information when present", () => {
    const [row] = normalizeEnableBankingTransactions(
      [tx({ remittance_information: ["CARTE", "CARREFOUR PARIS"] })],
      "EUR",
    );
    expect(row?.label).toBe("CARTE CARREFOUR PARIS");
  });

  it("falls back to the counterparty name when there is no remittance information", () => {
    const [row] = normalizeEnableBankingTransactions([tx({ creditor: { name: "Jean Dupont" } })], "EUR");
    expect(row?.label).toBe("Jean Dupont");
  });

  it("falls back to a generic label when nothing identifies the transaction", () => {
    const [row] = normalizeEnableBankingTransactions([tx({})], "EUR");
    expect(row?.label).toBe("Transaction bancaire");
  });

  it("drops transactions with a non-final status", () => {
    const rows = normalizeEnableBankingTransactions([tx({ status: "PDNG" }), tx({ status: "BOOK" })], "EUR");
    expect(rows).toHaveLength(1);
  });

  it("drops a zero-amount transaction", () => {
    const rows = normalizeEnableBankingTransactions(
      [tx({ transaction_amount: { amount: "0", currency: "EUR" } })],
      "EUR",
    );
    expect(rows).toHaveLength(0);
  });

  it("drops a transaction with no usable date", () => {
    const rows = normalizeEnableBankingTransactions(
      [{ transaction_amount: { amount: "42.50", currency: "EUR" }, credit_debit_indicator: "DBIT" }],
      "EUR",
    );
    expect(rows).toHaveLength(0);
  });

  it("falls back to the given currency when the transaction currency is unsupported", () => {
    const [row] = normalizeEnableBankingTransactions(
      [tx({ transaction_amount: { amount: "10", currency: "XXX" } })],
      "EUR",
    );
    expect(row?.currency).toBe("EUR");
  });
});
