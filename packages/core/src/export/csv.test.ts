import { describe, expect, it } from "vitest";
import {
  budgetsToCsv,
  investmentsToCsv,
  toCsv,
  transactionsToCsv,
} from "./csv.js";
import type { Budget, Category, Investment, Transaction } from "../types/index.js";

describe("toCsv", () => {
  it("builds a header row plus one row per record", () => {
    const csv = toCsv(
      [
        { a: "1", b: "x" },
        { a: "2", b: "y" },
      ],
      [
        { key: "a", header: "A" },
        { key: "b", header: "B" },
      ],
    );
    expect(csv).toBe("A,B\r\n1,x\r\n2,y");
  });

  it("quotes fields containing a comma, quote, or newline", () => {
    const csv = toCsv(
      [{ label: 'Café, "chic"', note: "line1\nline2" }],
      [
        { key: "label", header: "Label" },
        { key: "note", header: "Note" },
      ],
    );
    expect(csv).toBe('Label,Note\r\n"Café, ""chic""","line1\nline2"');
  });

  it("renders null/undefined as an empty field", () => {
    const csv = toCsv([{ a: null, b: undefined }], [
      { key: "a", header: "A" },
      { key: "b", header: "B" },
    ]);
    expect(csv).toBe("A,B\r\n,");
  });

  it("returns just the header for an empty row list", () => {
    expect(toCsv([], [{ key: "a", header: "A" }])).toBe("A");
  });
});

const category: Category = { id: "cat1", workspace_id: "ws1", name: "Alimentation", icon: "🛒", color: "#fff", is_default: true, hidden: false };

describe("transactionsToCsv", () => {
  const tx: Transaction = {
    id: "t1",
    workspace_id: "ws1",
    account_id: "acc1",
    to_account_id: null,
    category_id: "cat1",
    amount: 42,
    currency: "EUR",
    amount_eur: 42,
    type: "expense",
    label: "Courses",
    merchant: null,
    note: null,
    date: "2026-01-15",
    recurring_rule_id: null,
    reimbursement_status: "none",
    reimbursement_contact: null,
    settled_transaction_id: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  };

  it("resolves the category name and defaults note to an empty string", () => {
    const csv = transactionsToCsv([tx], [category]);
    expect(csv).toBe(
      "Date,Libellé,Catégorie,Type,Montant,Devise,Montant EUR,Note\r\n2026-01-15,Courses,Alimentation,expense,42,EUR,42,",
    );
  });

  it("leaves category blank when category_id is null or unknown", () => {
    const csv = transactionsToCsv([{ ...tx, category_id: null }], [category]);
    expect(csv).toContain(",,expense,");
  });
});

describe("budgetsToCsv", () => {
  it("translates the period and resolves the category name", () => {
    const budget: Budget = { id: "b1", workspace_id: "ws1", category_id: "cat1", amount_eur: 300, period: "monthly", created_at: "2026-01-01T00:00:00Z" };
    const csv = budgetsToCsv([budget], [category]);
    expect(csv).toBe("Catégorie,Montant EUR,Période\r\nAlimentation,300,Mensuel");
  });
});

describe("investmentsToCsv", () => {
  const base: Investment = {
    id: "inv1",
    workspace_id: "ws1",
    name: "MSCI World",
    asset_type: "etf",
    ticker: "CW8",
    broker: "Trade Republic",
    quantity: 10,
    buy_price_eur: 100,
    current_price_eur: 120,
    currency: "EUR",
    opened_at: "2025-01-01",
    notes: null,
    closed_at: null,
    sale_price_eur: null,
    created_at: "2025-01-01T00:00:00Z",
  };

  it("reports unrealized P&L for an open position", () => {
    const csv = investmentsToCsv([base]);
    expect(csv).toContain("Ouverte,200,20");
  });

  it("reports realized P&L for a closed position", () => {
    const closed: Investment = { ...base, closed_at: "2025-06-01", sale_price_eur: 150 };
    const csv = investmentsToCsv([closed]);
    expect(csv).toContain("Clôturée,500,50");
  });
});
