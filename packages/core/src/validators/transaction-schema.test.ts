import { describe, expect, it } from "vitest";
import { transactionInputSchema } from "./transaction-schema.js";

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
});
