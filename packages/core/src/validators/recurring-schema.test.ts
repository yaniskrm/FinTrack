import { describe, expect, it } from "vitest";
import { recurringInputSchema } from "./recurring-schema.js";

const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";

const valid = {
  amount: 15.99,
  currency: "EUR",
  type: "expense",
  label: "Netflix",
  categoryId: null,
  frequency: "monthly",
  startDate: "2026-08-01",
  endDate: null,
  accountId: ACCOUNT_A,
  toAccountId: null,
};

describe("recurringInputSchema", () => {
  it("accepts a valid recurring rule", () => {
    expect(recurringInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts each supported frequency", () => {
    for (const frequency of ["daily", "weekly", "monthly", "yearly"]) {
      expect(recurringInputSchema.safeParse({ ...valid, frequency }).success).toBe(true);
    }
  });

  it("rejects an invalid frequency", () => {
    expect(recurringInputSchema.safeParse({ ...valid, frequency: "biweekly" }).success).toBe(false);
  });

  it("rejects a zero/negative amount", () => {
    expect(recurringInputSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = recurringInputSchema.safeParse({
      ...valid,
      startDate: "2026-08-01",
      endDate: "2026-07-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an end date after the start date", () => {
    expect(
      recurringInputSchema.safeParse({ ...valid, startDate: "2026-08-01", endDate: "2027-08-01" })
        .success,
    ).toBe(true);
  });

  it("rejects a malformed start date", () => {
    expect(recurringInputSchema.safeParse({ ...valid, startDate: "01/08/2026" }).success).toBe(false);
  });

  it("rejects a transfer without a destination account", () => {
    expect(recurringInputSchema.safeParse({ ...valid, type: "transfer", toAccountId: null }).success).toBe(
      false,
    );
  });

  it("rejects a non-transfer with a destination account set", () => {
    expect(
      recurringInputSchema.safeParse({ ...valid, type: "expense", toAccountId: ACCOUNT_B }).success,
    ).toBe(false);
  });

  it("accepts a transfer with a distinct destination account", () => {
    expect(
      recurringInputSchema.safeParse({ ...valid, type: "transfer", toAccountId: ACCOUNT_B }).success,
    ).toBe(true);
  });
});
