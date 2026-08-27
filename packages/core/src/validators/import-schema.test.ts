import { describe, expect, it } from "vitest";
import { importBatchSchema, importRowSchema } from "./import-schema.js";

const validRow = {
  date: "2026-08-01",
  label: "Courses",
  amount: 45.9,
  type: "expense" as const,
  currency: "EUR" as const,
  categoryId: null,
};

describe("importRowSchema", () => {
  it("accepts a valid row", () => {
    expect(importRowSchema.safeParse(validRow).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(importRowSchema.safeParse({ ...validRow, amount: 0 }).success).toBe(false);
    expect(importRowSchema.safeParse({ ...validRow, amount: -5 }).success).toBe(false);
  });

  it("rejects a transfer type", () => {
    expect(importRowSchema.safeParse({ ...validRow, type: "transfer" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(importRowSchema.safeParse({ ...validRow, date: "01/08/2026" }).success).toBe(false);
  });

  it("rejects an empty label", () => {
    expect(importRowSchema.safeParse({ ...validRow, label: "  " }).success).toBe(false);
  });

  it("accepts a non-null categoryId", () => {
    expect(
      importRowSchema.safeParse({ ...validRow, categoryId: "11111111-1111-4111-8111-111111111111" }).success,
    ).toBe(true);
  });
});

describe("importBatchSchema", () => {
  const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

  it("accepts a valid batch", () => {
    expect(importBatchSchema.safeParse({ accountId: ACCOUNT_ID, rows: [validRow] }).success).toBe(true);
  });

  it("rejects an empty rows array", () => {
    expect(importBatchSchema.safeParse({ accountId: ACCOUNT_ID, rows: [] }).success).toBe(false);
  });

  it("rejects a missing accountId", () => {
    expect(importBatchSchema.safeParse({ rows: [validRow] }).success).toBe(false);
  });

  it("rejects more than 1000 rows", () => {
    const rows = Array.from({ length: 1001 }, () => validRow);
    expect(importBatchSchema.safeParse({ accountId: ACCOUNT_ID, rows }).success).toBe(false);
  });
});
