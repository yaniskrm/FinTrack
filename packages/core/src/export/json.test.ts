import { describe, expect, it } from "vitest";
import { buildDataExport } from "./json.js";

describe("buildDataExport", () => {
  const empty = {
    userEmail: null,
    profile: null,
    accounts: [],
    bankConnections: [],
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

  it("carries the accounts, bank connections, profile and e-mail the transactions depend on", () => {
    const accounts = [{ id: "a1" }] as never;
    const bankConnections = [{ id: "b1", iban: "FR76…" }] as never;
    const profile = { default_currency: "EUR", locale: "fr", display_name: null, created_at: "2026-01-01" };
    const result = buildDataExport({ ...empty, accounts, bankConnections, profile, userEmail: "a@b.fr" }, new Date());

    expect(result.accounts).toBe(accounts);
    expect(result.bankConnections).toBe(bankConnections);
    expect(result.profile).toBe(profile);
    expect(result.userEmail).toBe("a@b.fr");
  });

  it("never exports the provider's technical session identifiers", () => {
    // The exported connection type has no slot for them; guard the shape so a
    // future field addition has to be a conscious decision.
    const connection: Record<string, unknown> = {
      id: "b1", account_id: null, aspsp_name: "BBVA", aspsp_country: "FR", iban: null, currency: "EUR",
      status: "active", valid_until: null, last_synced_at: null, created_at: "2026-01-01",
    };
    const result = buildDataExport({ ...empty, bankConnections: [connection as never] }, new Date());
    const keys = Object.keys(result.bankConnections[0] ?? {});
    expect(keys).not.toContain("session_id");
    expect(keys).not.toContain("state");
    expect(keys).not.toContain("enable_account_uid");
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
