import type { Investment, InvestmentType, InvestmentValuation } from "../types/index.js";

// ─── Single position ─────────────────────────────────────────────────────────

export interface PositionPnL {
  investedEur: number; // quantity * buy_price_eur
  currentValueEur: number; // 0 once closed — no longer part of the live portfolio
  isClosed: boolean;
  unrealizedPnlEur: number; // 0 once closed
  unrealizedPnlPercent: number; // 0 once closed
  realizedPnlEur: number; // 0 while open
  realizedPnlPercent: number; // 0 while open
}

/**
 * P&L for a single position. Open positions carry unrealized P&L against
 * `current_price_eur`; closed positions (closed_at + sale_price_eur both
 * set) carry realized P&L against `sale_price_eur` instead, and no longer
 * contribute to the live portfolio value.
 */
export function calculatePositionPnL(investment: Investment): PositionPnL {
  const investedEur = Math.round(investment.quantity * investment.buy_price_eur * 100) / 100;
  const isClosed = investment.closed_at !== null;

  if (isClosed) {
    const realizedValueEur = Math.round(investment.quantity * (investment.sale_price_eur ?? 0) * 100) / 100;
    const realizedPnlEur = Math.round((realizedValueEur - investedEur) * 100) / 100;
    return {
      investedEur,
      currentValueEur: 0,
      isClosed: true,
      unrealizedPnlEur: 0,
      unrealizedPnlPercent: 0,
      realizedPnlEur,
      realizedPnlPercent: investedEur > 0 ? Math.round((realizedPnlEur / investedEur) * 10000) / 100 : 0,
    };
  }

  const currentValueEur = Math.round(investment.quantity * investment.current_price_eur * 100) / 100;
  const unrealizedPnlEur = Math.round((currentValueEur - investedEur) * 100) / 100;

  return {
    investedEur,
    currentValueEur,
    isClosed: false,
    unrealizedPnlEur,
    unrealizedPnlPercent: investedEur > 0 ? Math.round((unrealizedPnlEur / investedEur) * 10000) / 100 : 0,
    realizedPnlEur: 0,
    realizedPnlPercent: 0,
  };
}

// ─── Portfolio summary ────────────────────────────────────────────────────────

export interface PortfolioSummary {
  totalCurrentValueEur: number; // open positions only
  totalInvestedEur: number; // open positions only (cost basis of the live portfolio)
  totalUnrealizedPnlEur: number;
  totalUnrealizedPnlPercent: number;
  totalRealizedPnlEur: number; // closed positions
  overallPerformancePercent: number; // (unrealized + realized) / (invested across open + closed)
  openPositionsCount: number;
  closedPositionsCount: number;
}

export function calculatePortfolioSummary(investments: Investment[]): PortfolioSummary {
  let totalCurrentValueEur = 0;
  let totalInvestedOpenEur = 0;
  let totalRealizedPnlEur = 0;
  let totalInvestedAllEur = 0;
  let openPositionsCount = 0;
  let closedPositionsCount = 0;

  for (const investment of investments) {
    const pnl = calculatePositionPnL(investment);
    totalInvestedAllEur += pnl.investedEur;

    if (pnl.isClosed) {
      totalRealizedPnlEur += pnl.realizedPnlEur;
      closedPositionsCount += 1;
    } else {
      totalCurrentValueEur += pnl.currentValueEur;
      totalInvestedOpenEur += pnl.investedEur;
      openPositionsCount += 1;
    }
  }

  const totalUnrealizedPnlEur = Math.round((totalCurrentValueEur - totalInvestedOpenEur) * 100) / 100;
  const overallPnlEur = totalUnrealizedPnlEur + totalRealizedPnlEur;

  return {
    totalCurrentValueEur: Math.round(totalCurrentValueEur * 100) / 100,
    totalInvestedEur: Math.round(totalInvestedOpenEur * 100) / 100,
    totalUnrealizedPnlEur,
    totalUnrealizedPnlPercent:
      totalInvestedOpenEur > 0 ? Math.round((totalUnrealizedPnlEur / totalInvestedOpenEur) * 10000) / 100 : 0,
    totalRealizedPnlEur: Math.round(totalRealizedPnlEur * 100) / 100,
    overallPerformancePercent:
      totalInvestedAllEur > 0 ? Math.round((overallPnlEur / totalInvestedAllEur) * 10000) / 100 : 0,
    openPositionsCount,
    closedPositionsCount,
  };
}

// ─── Allocation ────────────────────────────────────────────────────────────────

export interface AllocationSlice<K extends string> {
  key: K;
  valueEur: number;
  percentage: number; // 0-100, of open positions' current value
}

function groupOpenValueBy<K extends string>(
  investments: Investment[],
  keyOf: (investment: Investment) => K,
): AllocationSlice<K>[] {
  const totals = new Map<K, number>();
  let total = 0;

  for (const investment of investments) {
    if (investment.closed_at !== null) continue;
    const value = Math.round(investment.quantity * investment.current_price_eur * 100) / 100;
    const key = keyOf(investment);
    totals.set(key, (totals.get(key) ?? 0) + value);
    total += value;
  }

  return Array.from(totals.entries())
    .map(([key, valueEur]) => ({
      key,
      valueEur: Math.round(valueEur * 100) / 100,
      percentage: total > 0 ? Math.round((valueEur / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.valueEur - a.valueEur);
}

/** Allocation of the live (open-positions) portfolio by asset class. */
export function groupInvestmentsByType(investments: Investment[]): AllocationSlice<InvestmentType>[] {
  return groupOpenValueBy(investments, (investment) => investment.asset_type);
}

/** Allocation of the live (open-positions) portfolio by denomination currency. */
export function groupInvestmentsByCurrency(investments: Investment[]): AllocationSlice<string>[] {
  return groupOpenValueBy(investments, (investment) => investment.currency);
}

// ─── Valuation history ("courbe temporelle") ─────────────────────────────────

export interface PortfolioHistoryPoint {
  date: string; // ISO 8601 date string
  totalValueEur: number;
}

/**
 * Total portfolio value over time, built from sparse per-position valuation
 * snapshots. For every date any position recorded a valuation, each other
 * position contributes its most recent known price as of that date (falling
 * back to `buy_price_eur` if it has no valuation yet that far back).
 * Positions are dropped from the series once closed, from their closed_at
 * date onward (they no longer represent live portfolio value).
 */
export function buildPortfolioHistory(
  investments: Investment[],
  valuations: InvestmentValuation[],
): PortfolioHistoryPoint[] {
  const byInvestment = new Map<string, InvestmentValuation[]>();
  for (const valuation of valuations) {
    const list = byInvestment.get(valuation.investment_id) ?? [];
    list.push(valuation);
    byInvestment.set(valuation.investment_id, list);
  }
  for (const list of byInvestment.values()) {
    list.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  }

  const dates = Array.from(new Set(valuations.map((v) => v.recorded_at))).sort();

  return dates.map((date) => {
    let totalValueEur = 0;

    for (const investment of investments) {
      if (investment.closed_at !== null && investment.closed_at <= date) continue;

      const history = byInvestment.get(investment.id) ?? [];
      const asOf = [...history].reverse().find((v) => v.recorded_at <= date);
      const priceEur = asOf ? asOf.price_eur : investment.buy_price_eur;

      totalValueEur += investment.quantity * priceEur;
    }

    return { date, totalValueEur: Math.round(totalValueEur * 100) / 100 };
  });
}
