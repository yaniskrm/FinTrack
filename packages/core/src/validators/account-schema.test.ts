import { describe, expect, it } from "vitest";
import { accountInputSchema } from "./account-schema.js";

const valid = {
  name: "Livret A",
  type: "savings" as const,
  currency: "EUR" as const,
  initialBalance: 500,
  icon: "🏦",
  color: "#C9A961",
};

describe("accountInputSchema", () => {
  it("accepts a valid account", () => {
    expect(accountInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(accountInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 50 chars", () => {
    expect(accountInputSchema.safeParse({ ...valid, name: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects an unknown account type", () => {
    expect(accountInputSchema.safeParse({ ...valid, type: "crypto" }).success).toBe(false);
  });

  it("accepts a negative initial balance (e.g. a credit card's starting debt)", () => {
    expect(accountInputSchema.safeParse({ ...valid, initialBalance: -300 }).success).toBe(true);
  });

  it("rejects a malformed color", () => {
    expect(accountInputSchema.safeParse({ ...valid, color: "gold" }).success).toBe(false);
  });

  it("rejects an empty icon", () => {
    expect(accountInputSchema.safeParse({ ...valid, icon: "" }).success).toBe(false);
  });
});
