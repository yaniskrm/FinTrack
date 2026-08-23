import { describe, expect, it } from "vitest";
import { buildDataExport } from "./json.js";

describe("buildDataExport", () => {
  const empty = {
    transactions: [],
    recurringRules: [],
    categories: [],
    budgets: [],
    goals: [],
    investments: [],
    investmentValuations: [],
  };

  it("stamps the export with the given timestamp", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const result = buildDataExport(empty, now);
    expect(result.exportedAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("passes every entity list through unchanged", () => {
    const transactions = [{ id: "t1" }] as never;
    const result = buildDataExport({ ...empty, transactions }, new Date());
    expect(result.transactions).toBe(transactions);
  });

  it("defaults to the current time when none is given", () => {
    const before = Date.now();
    const result = buildDataExport(empty);
    const after = Date.now();
    const stamped = new Date(result.exportedAt).getTime();
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });
});
