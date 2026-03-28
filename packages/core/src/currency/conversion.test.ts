import { describe, expect, it } from "vitest";
import { convertToEur, convertFromEur } from "./conversion.js";
import type { ExchangeRate } from "../types/index.js";

const rates: ExchangeRate[] = [
  { currency: "USD", rate_to_eur: 0.92, updated_at: "2024-01-01T00:00:00Z" },
  { currency: "GBP", rate_to_eur: 1.17, updated_at: "2024-01-01T00:00:00Z" },
];

describe("convertToEur", () => {
  it("returns same amount for EUR", () => {
    expect(convertToEur(100, "EUR", rates)).toBe(100);
  });

  it("converts USD to EUR", () => {
    expect(convertToEur(100, "USD", rates)).toBeCloseTo(92);
  });

  it("throws for unknown currency", () => {
    expect(() => convertToEur(100, "JPY", [])).toThrow("No exchange rate found");
  });
});

describe("convertFromEur", () => {
  it("returns same amount for EUR", () => {
    expect(convertFromEur(100, "EUR", rates)).toBe(100);
  });

  it("converts EUR to GBP", () => {
    expect(convertFromEur(117, "GBP", rates)).toBeCloseTo(100);
  });
});
