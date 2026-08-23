import { describe, expect, it } from "vitest";
import {
  buildPortfolioHistory,
  calculatePortfolioSummary,
  calculatePositionPnL,
  groupInvestmentsByCurrency,
  groupInvestmentsByType,
} from "./investments.js";
import type { Investment, InvestmentValuation } from "../types/index.js";

const makeInvestment = (overrides: Partial<Investment> = {}): Investment => ({
  id: "inv1",
  workspace_id: "ws1",
  name: "Test ETF",
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
  ...overrides,
});

const makeValuation = (overrides: Partial<InvestmentValuation> = {}): InvestmentValuation => ({
  id: "val1",
  workspace_id: "ws1",
  investment_id: "inv1",
  price_eur: 100,
  recorded_at: "2025-01-01",
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("calculatePositionPnL", () => {
  it("computes unrealized P&L for an open position", () => {
    const pnl = calculatePositionPnL(makeInvestment({ quantity: 10, buy_price_eur: 100, current_price_eur: 120 }));
    expect(pnl.isClosed).toBe(false);
    expect(pnl.investedEur).toBe(1000);
    expect(pnl.currentValueEur).toBe(1200);
    expect(pnl.unrealizedPnlEur).toBe(200);
    expect(pnl.unrealizedPnlPercent).toBeCloseTo(20);
    expect(pnl.realizedPnlEur).toBe(0);
  });

  it("computes a negative unrealized P&L", () => {
    const pnl = calculatePositionPnL(makeInvestment({ quantity: 10, buy_price_eur: 100, current_price_eur: 80 }));
    expect(pnl.unrealizedPnlEur).toBe(-200);
    expect(pnl.unrealizedPnlPercent).toBeCloseTo(-20);
  });

  it("computes realized P&L for a closed position, ignoring current_price_eur", () => {
    const pnl = calculatePositionPnL(
      makeInvestment({
        quantity: 10,
        buy_price_eur: 100,
        current_price_eur: 999, // stale — must be ignored once closed
        closed_at: "2025-06-01",
        sale_price_eur: 150,
      }),
    );
    expect(pnl.isClosed).toBe(true);
    expect(pnl.currentValueEur).toBe(0);
    expect(pnl.unrealizedPnlEur).toBe(0);
    expect(pnl.realizedPnlEur).toBe(500);
    expect(pnl.realizedPnlPercent).toBeCloseTo(50);
  });

  it("does not divide by zero when invested is 0", () => {
    // unreachable via the DB check constraint (buy_price_eur > 0) but the
    // calculation must stay defensive against a 0 edge case regardless.
    const pnl = calculatePositionPnL(makeInvestment({ quantity: 0, buy_price_eur: 100, current_price_eur: 120 }));
    expect(pnl.investedEur).toBe(0);
    expect(pnl.unrealizedPnlPercent).toBe(0);
  });
});

describe("calculatePortfolioSummary", () => {
  it("returns zeros for an empty portfolio", () => {
    const summary = calculatePortfolioSummary([]);
    expect(summary.totalCurrentValueEur).toBe(0);
    expect(summary.totalUnrealizedPnlPercent).toBe(0);
    expect(summary.overallPerformancePercent).toBe(0);
    expect(summary.openPositionsCount).toBe(0);
  });

  it("aggregates only open positions into current value", () => {
    const investments = [
      makeInvestment({ id: "a", quantity: 10, buy_price_eur: 100, current_price_eur: 120 }),
      makeInvestment({
        id: "b",
        quantity: 5,
        buy_price_eur: 50,
        current_price_eur: 999,
        closed_at: "2025-06-01",
        sale_price_eur: 60,
      }),
    ];
    const summary = calculatePortfolioSummary(investments);
    expect(summary.totalCurrentValueEur).toBe(1200); // only position "a"
    expect(summary.totalInvestedEur).toBe(1000); // only position "a"'s cost basis
    expect(summary.totalUnrealizedPnlEur).toBe(200);
    expect(summary.totalRealizedPnlEur).toBe(50); // 5 * (60 - 50)
    expect(summary.openPositionsCount).toBe(1);
    expect(summary.closedPositionsCount).toBe(1);
  });

  it("blends realized and unrealized into overall performance", () => {
    const investments = [
      makeInvestment({ id: "a", quantity: 10, buy_price_eur: 100, current_price_eur: 110 }), // +100, invested 1000
      makeInvestment({
        id: "b",
        quantity: 10,
        buy_price_eur: 100,
        current_price_eur: 0,
        closed_at: "2025-06-01",
        sale_price_eur: 110,
      }), // +100, invested 1000
    ];
    const summary = calculatePortfolioSummary(investments);
    // total pnl 200 over total invested (both positions) 2000 = 10%
    expect(summary.overallPerformancePercent).toBeCloseTo(10);
  });
});

describe("groupInvestmentsByType", () => {
  it("allocates open-position value by asset type, sorted descending", () => {
    const investments = [
      makeInvestment({ id: "a", asset_type: "etf", quantity: 10, current_price_eur: 100 }), // 1000
      makeInvestment({ id: "b", asset_type: "crypto", quantity: 1, current_price_eur: 3000 }), // 3000
      makeInvestment({
        id: "c",
        asset_type: "stock",
        quantity: 1,
        current_price_eur: 999,
        closed_at: "2025-06-01",
        sale_price_eur: 999,
      }), // excluded, closed
    ];
    const allocation = groupInvestmentsByType(investments);
    expect(allocation).toEqual([
      { key: "crypto", valueEur: 3000, percentage: 75 },
      { key: "etf", valueEur: 1000, percentage: 25 },
    ]);
  });

  it("returns an empty array when there are no open positions", () => {
    expect(groupInvestmentsByType([])).toEqual([]);
  });
});

describe("groupInvestmentsByCurrency", () => {
  it("allocates open-position value by currency", () => {
    const investments = [
      makeInvestment({ id: "a", currency: "EUR", quantity: 10, current_price_eur: 100 }),
      makeInvestment({ id: "b", currency: "USD", quantity: 10, current_price_eur: 100 }),
    ];
    const allocation = groupInvestmentsByCurrency(investments);
    expect(allocation).toHaveLength(2);
    expect(allocation.reduce((sum, slice) => sum + slice.percentage, 0)).toBeCloseTo(100);
  });
});

describe("buildPortfolioHistory", () => {
  it("carries forward the most recent known price per position", () => {
    const investments = [
      makeInvestment({ id: "a", quantity: 10, buy_price_eur: 90 }),
      makeInvestment({ id: "b", quantity: 5, buy_price_eur: 40 }),
    ];
    const valuations = [
      makeValuation({ investment_id: "a", recorded_at: "2025-01-01", price_eur: 100 }),
      makeValuation({ investment_id: "a", recorded_at: "2025-02-01", price_eur: 110 }),
      makeValuation({ investment_id: "b", recorded_at: "2025-01-15", price_eur: 45 }),
    ];
    const history = buildPortfolioHistory(investments, valuations);

    expect(history.map((p) => p.date)).toEqual(["2025-01-01", "2025-01-15", "2025-02-01"]);
    // 2025-01-01: a=100 (known), b=40 (no valuation yet -> buy_price_eur fallback)
    expect(history[0]?.totalValueEur).toBe(10 * 100 + 5 * 40);
    // 2025-01-15: a=100 (carried forward), b=45 (known)
    expect(history[1]?.totalValueEur).toBe(10 * 100 + 5 * 45);
    // 2025-02-01: a=110 (known), b=45 (carried forward)
    expect(history[2]?.totalValueEur).toBe(10 * 110 + 5 * 45);
  });

  it("drops a position from the series once closed", () => {
    const investments = [
      makeInvestment({ id: "a", quantity: 10, buy_price_eur: 100, closed_at: "2025-02-01", sale_price_eur: 120 }),
      makeInvestment({ id: "b", quantity: 5, buy_price_eur: 40 }),
    ];
    const valuations = [
      makeValuation({ investment_id: "a", recorded_at: "2025-01-01", price_eur: 100 }),
      makeValuation({ investment_id: "b", recorded_at: "2025-03-01", price_eur: 50 }),
    ];
    const history = buildPortfolioHistory(investments, valuations);

    // "a" is still open as of 2025-01-01 -> counted
    expect(history[0]?.totalValueEur).toBe(10 * 100 + 5 * 40);
    // "a" is closed by 2025-03-01 -> excluded
    expect(history[1]?.totalValueEur).toBe(5 * 50);
  });

  it("returns an empty series with no valuations", () => {
    expect(buildPortfolioHistory([makeInvestment()], [])).toEqual([]);
  });
});
