import { describe, expect, it } from "vitest";
import { validateTransaction } from "./transaction.js";

describe("validateTransaction", () => {
  const valid = {
    amount: 42.5,
    currency: "EUR",
    type: "expense",
    label: "Coffee",
    date: "2024-03-15",
  };

  it("accepts a valid transaction", () => {
    const result = validateTransaction(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects zero amount", () => {
    const result = validateTransaction({ ...valid, amount: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("amount must be greater than 0");
  });

  it("rejects negative amount", () => {
    const result = validateTransaction({ ...valid, amount: -10 });
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported currency", () => {
    const result = validateTransaction({ ...valid, currency: "XYZ" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/currency must be one of/);
  });

  it("rejects invalid type", () => {
    const result = validateTransaction({ ...valid, type: "refund" });
    expect(result.valid).toBe(false);
  });

  it("rejects empty label", () => {
    const result = validateTransaction({ ...valid, label: "  " });
    expect(result.valid).toBe(false);
  });

  it("rejects label longer than 100 chars", () => {
    const result = validateTransaction({ ...valid, label: "a".repeat(101) });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = validateTransaction({ ...valid, date: "15/03/2024" });
    expect(result.valid).toBe(false);
  });

  it("accumulates multiple errors", () => {
    const result = validateTransaction({ amount: -1, currency: "XXX", type: "bad", label: "", date: "nope" });
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
