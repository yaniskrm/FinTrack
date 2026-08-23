import { describe, expect, it } from "vitest";
import { closeInvestmentSchema, investmentInputSchema, investmentValuationInputSchema } from "./investment-schema.js";

const valid = {
  name: "MSCI World",
  assetType: "etf" as const,
  ticker: "CW8",
  broker: "Trade Republic",
  quantity: 10,
  buyPriceEur: 100,
  currentPriceEur: 120,
  currency: "EUR" as const,
  openedAt: "2025-01-01",
  notes: null,
};

describe("investmentInputSchema", () => {
  it("accepts a valid position", () => {
    expect(investmentInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null ticker, broker, openedAt and notes", () => {
    expect(
      investmentInputSchema.safeParse({ ...valid, ticker: null, broker: null, openedAt: null, notes: null }).success,
    ).toBe(true);
  });

  it("normalizes empty strings to null for optional text fields", () => {
    const result = investmentInputSchema.safeParse({ ...valid, ticker: "", broker: "", notes: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBeNull();
      expect(result.data.broker).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("rejects a zero or negative quantity", () => {
    expect(investmentInputSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
    expect(investmentInputSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false);
  });

  it("rejects a zero or negative buy price", () => {
    expect(investmentInputSchema.safeParse({ ...valid, buyPriceEur: 0 }).success).toBe(false);
  });

  it("accepts a zero current price but rejects a negative one", () => {
    expect(investmentInputSchema.safeParse({ ...valid, currentPriceEur: 0 }).success).toBe(true);
    expect(investmentInputSchema.safeParse({ ...valid, currentPriceEur: -1 }).success).toBe(false);
  });

  it("rejects an invalid asset type", () => {
    expect(investmentInputSchema.safeParse({ ...valid, assetType: "bond" }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(investmentInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects a malformed openedAt date", () => {
    expect(investmentInputSchema.safeParse({ ...valid, openedAt: "01/01/2025" }).success).toBe(false);
  });
});

describe("investmentValuationInputSchema", () => {
  const validValuation = { investmentId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", priceEur: 120, recordedAt: "2025-06-01" };

  it("accepts a valid valuation snapshot", () => {
    expect(investmentValuationInputSchema.safeParse(validValuation).success).toBe(true);
  });

  it("accepts a zero price but rejects a negative one", () => {
    expect(investmentValuationInputSchema.safeParse({ ...validValuation, priceEur: 0 }).success).toBe(true);
    expect(investmentValuationInputSchema.safeParse({ ...validValuation, priceEur: -1 }).success).toBe(false);
  });

  it("rejects a non-uuid investmentId", () => {
    expect(investmentValuationInputSchema.safeParse({ ...validValuation, investmentId: "not-a-uuid" }).success).toBe(
      false,
    );
  });
});

describe("closeInvestmentSchema", () => {
  const validClose = { investmentId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", salePriceEur: 150, closedAt: "2025-06-01" };

  it("accepts a valid close-position payload", () => {
    expect(closeInvestmentSchema.safeParse(validClose).success).toBe(true);
  });

  it("rejects a negative sale price", () => {
    expect(closeInvestmentSchema.safeParse({ ...validClose, salePriceEur: -1 }).success).toBe(false);
  });

  it("rejects a malformed closedAt date", () => {
    expect(closeInvestmentSchema.safeParse({ ...validClose, closedAt: "not-a-date" }).success).toBe(false);
  });
});
