import { describe, expect, it } from "vitest";
import { validateRecurringRule, getNextOccurrence } from "./recurring.js";

describe("validateRecurringRule", () => {
  const valid = {
    frequency: "monthly",
    start_date: "2024-01-01",
  };

  it("accepts a valid rule", () => {
    const result = validateRecurringRule(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid frequency", () => {
    const result = validateRecurringRule({ ...valid, frequency: "hourly" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/frequency must be one of/);
  });

  it("rejects invalid start_date format", () => {
    const result = validateRecurringRule({ ...valid, start_date: "01/01/2024" });
    expect(result.valid).toBe(false);
  });

  it("accepts null end_date", () => {
    const result = validateRecurringRule({ ...valid, end_date: null });
    expect(result.valid).toBe(true);
  });

  it("accepts valid end_date after start_date", () => {
    const result = validateRecurringRule({ ...valid, end_date: "2025-01-01" });
    expect(result.valid).toBe(true);
  });

  it("rejects end_date before start_date", () => {
    const result = validateRecurringRule({ ...valid, end_date: "2023-01-01" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/end_date must be after/);
  });

  it("rejects end_date equal to start_date", () => {
    const result = validateRecurringRule({ ...valid, end_date: "2024-01-01" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid end_date format", () => {
    const result = validateRecurringRule({ ...valid, end_date: "not-a-date" });
    expect(result.valid).toBe(false);
  });

  it("accepts all valid frequencies", () => {
    for (const frequency of ["daily", "weekly", "monthly", "yearly"]) {
      expect(validateRecurringRule({ ...valid, frequency }).valid).toBe(true);
    }
  });
});

describe("getNextOccurrence", () => {
  it("adds 1 day for daily", () => {
    expect(getNextOccurrence("2024-01-15", "daily")).toBe("2024-01-16");
  });

  it("adds 7 days for weekly", () => {
    expect(getNextOccurrence("2024-01-15", "weekly")).toBe("2024-01-22");
  });

  it("adds 1 month for monthly", () => {
    expect(getNextOccurrence("2024-01-15", "monthly")).toBe("2024-02-15");
  });

  it("adds 1 year for yearly", () => {
    expect(getNextOccurrence("2024-01-15", "yearly")).toBe("2025-01-15");
  });

  it("handles month-end overflow (Jan 31 monthly → Mar 2 due to JS Date)", () => {
    // JS Date overflow: Feb has 29 days in 2024 (leap year), so Jan31+1month = Mar 2
    const result = getNextOccurrence("2024-01-31", "monthly");
    expect(result).toBe("2024-03-02");
  });
});
