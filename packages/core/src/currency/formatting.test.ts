import { describe, expect, it } from "vitest";
import { formatCurrency, getCurrencySymbol } from "./formatting.js";

describe("formatCurrency", () => {
  it("formats EUR correctly in fr-FR locale", () => {
    const result = formatCurrency(1234.56, "EUR", "fr-FR");
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("€");
  });

  it("formats USD correctly", () => {
    const result = formatCurrency(99.99, "USD", "en-US");
    expect(result).toContain("99.99");
    expect(result).toContain("$");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "EUR");
    expect(result).toContain("0");
  });

  it("always shows 2 decimal places", () => {
    const result = formatCurrency(100, "EUR", "en-US");
    expect(result).toMatch(/100\.00/);
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-50, "EUR", "en-US");
    expect(result).toContain("50");
  });
});

describe("getCurrencySymbol", () => {
  it("returns € for EUR", () => {
    const symbol = getCurrencySymbol("EUR", "fr-FR");
    expect(symbol).toBe("€");
  });

  it("returns $ for USD in en-US", () => {
    const symbol = getCurrencySymbol("USD", "en-US");
    expect(symbol).toBe("$");
  });

  it("returns a non-empty string for all supported currencies", () => {
    const currencies = ["EUR", "USD", "GBP", "CHF", "JPY"] as const;
    for (const c of currencies) {
      expect(getCurrencySymbol(c).length).toBeGreaterThan(0);
    }
  });
});
