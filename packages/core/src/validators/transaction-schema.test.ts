import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "./transaction-schema.js";

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";

const valid = {
  amount: 12.5,
  currency: "EUR",
  type: "expense",
  label: "Café",
  merchant: null,
  categoryId: null,
  note: null,
  date: "2026-08-22",
  markAsReimbursable: false,
  reimbursementContact: null,
  accountId: ACCOUNT_A,
  toAccountId: null,
};

describe("transactionInputSchema", () => {
  it("accepts a valid transaction", () => {
    expect(transactionInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(transactionInputSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, amount: -5 }).success).toBe(false);
  });

  it("rejects a non-number amount (string / NaN)", () => {
    expect(transactionInputSchema.safeParse({ ...valid, amount: "12.5" }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ ...valid, amount: Number.NaN }).success).toBe(false);
  });

  it("rejects an unsupported currency", () => {
    expect(transactionInputSchema.safeParse({ ...valid, currency: "XYZ" }).success).toBe(false);
  });

  it("rejects an invalid type", () => {
    expect(transactionInputSchema.safeParse({ ...valid, type: "spend" }).success).toBe(false);
  });

  it("rejects an empty label", () => {
    expect(transactionInputSchema.safeParse({ ...valid, label: "   " }).success).toBe(false);
  });

  it("rejects a label longer than 100 chars", () => {
    expect(transactionInputSchema.safeParse({ ...valid, label: "x".repeat(101) }).success).toBe(
      false,
    );
  });

  it("rejects a malformed date", () => {
    expect(transactionInputSchema.safeParse({ ...valid, date: "22/08/2026" }).success).toBe(false);
  });

  it("accepts a null category and note", () => {
    expect(transactionInputSchema.safeParse({ ...valid, categoryId: null, note: null }).success).toBe(
      true,
    );
  });

  it("accepts a reimbursable transaction with a contact", () => {
    const result = transactionInputSchema.safeParse({
      ...valid,
      markAsReimbursable: true,
      reimbursementContact: "Alex",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null merchant and reimbursement contact", () => {
    expect(
      transactionInputSchema.safeParse({ ...valid, merchant: null, reimbursementContact: null }).success,
    ).toBe(true);
  });

  it("rejects a merchant longer than 100 chars", () => {
    expect(transactionInputSchema.safeParse({ ...valid, merchant: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects a missing accountId", () => {
    expect(transactionInputSchema.safeParse({ ...valid, accountId: undefined }).success).toBe(false);
  });

  it("rejects a transfer without a destination account", () => {
    expect(transactionInputSchema.safeParse({ ...valid, type: "transfer", toAccountId: null }).success).toBe(
      false,
    );
  });

  it("rejects a non-transfer with a destination account set", () => {
    expect(
      transactionInputSchema.safeParse({ ...valid, type: "expense", toAccountId: ACCOUNT_B }).success,
    ).toBe(false);
  });

  it("rejects a transfer whose destination equals its source", () => {
    expect(
      transactionInputSchema.safeParse({
        ...valid,
        type: "transfer",
        accountId: ACCOUNT_A,
        toAccountId: ACCOUNT_A,
      }).success,
    ).toBe(false);
  });

  it("accepts a transfer with a distinct destination account", () => {
    expect(
      transactionInputSchema.safeParse({
        ...valid,
        type: "transfer",
        accountId: ACCOUNT_A,
        toAccountId: ACCOUNT_B,
      }).success,
    ).toBe(true);
  });
});
