import { describe, expect, it } from "vitest";
import { budgetInputSchema } from "./budget-schema.js";

const valid = { categoryId: "3fa85f64-5717-4562-b3fc-2c963f66afa6", amountEur: 300, period: "monthly" };

describe("budgetInputSchema", () => {
  it("accepts a valid budget", () => {
    expect(budgetInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts the yearly period", () => {
    expect(budgetInputSchema.safeParse({ ...valid, period: "yearly" }).success).toBe(true);
  });

  it("rejects an invalid period", () => {
    expect(budgetInputSchema.safeParse({ ...valid, period: "weekly" }).success).toBe(false);
  });

  it("rejects a zero or negative amount", () => {
    expect(budgetInputSchema.safeParse({ ...valid, amountEur: 0 }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ ...valid, amountEur: -10 }).success).toBe(false);
  });

  it("rejects a non-uuid categoryId", () => {
    expect(budgetInputSchema.safeParse({ ...valid, categoryId: "not-a-uuid" }).success).toBe(false);
  });
});
