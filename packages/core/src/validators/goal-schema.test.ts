import { describe, expect, it } from "vitest";
import { goalInputSchema } from "./goal-schema.js";

const valid = { name: "Voyage au Japon", targetAmountEur: 3000, currentAmountEur: 500, deadline: "2027-06-01" };

describe("goalInputSchema", () => {
  it("accepts a valid goal", () => {
    expect(goalInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a null deadline", () => {
    expect(goalInputSchema.safeParse({ ...valid, deadline: null }).success).toBe(true);
  });

  it("accepts a zero current amount", () => {
    expect(goalInputSchema.safeParse({ ...valid, currentAmountEur: 0 }).success).toBe(true);
  });

  it("rejects a negative current amount", () => {
    expect(goalInputSchema.safeParse({ ...valid, currentAmountEur: -1 }).success).toBe(false);
  });

  it("rejects a zero or negative target amount", () => {
    expect(goalInputSchema.safeParse({ ...valid, targetAmountEur: 0 }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(goalInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
  });

  it("rejects a malformed deadline", () => {
    expect(goalInputSchema.safeParse({ ...valid, deadline: "01/06/2027" }).success).toBe(false);
  });
});
