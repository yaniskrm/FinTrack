import { calculatePositionPnL } from "../calculations/investments.js";
import type { Budget, Category, Investment, Transaction } from "../types/index.js";

export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** RFC 4180 CSV builder — CRLF line endings, quoted fields when they contain a comma/quote/newline. */
export function toCsv<T extends object>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(toCsvValue(row[c.key]))).join(","));
  return [header, ...lines].join("\r\n");
}

// ─── Transactions ───────────────────────────────────────────────────────────

export interface TransactionCsvRow {
  date: string;
  label: string;
  category: string;
  type: string;
  amount: number;
  currency: string;
  amountEur: number;
  note: string;
}

export const TRANSACTION_CSV_COLUMNS: CsvColumn<TransactionCsvRow>[] = [
  { key: "date", header: "Date" },
  { key: "label", header: "Libellé" },
  { key: "category", header: "Catégorie" },
  { key: "type", header: "Type" },
  { key: "amount", header: "Montant" },
  { key: "currency", header: "Devise" },
  { key: "amountEur", header: "Montant EUR" },
  { key: "note", header: "Note" },
];

export function transactionRows(transactions: Transaction[], categories: Category[]): TransactionCsvRow[] {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return transactions.map((t) => ({
    date: t.date,
    label: t.label,
    category: t.category_id ? (nameById.get(t.category_id) ?? "") : "",
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    amountEur: t.amount_eur,
    note: t.note ?? "",
  }));
}

export function transactionsToCsv(transactions: Transaction[], categories: Category[]): string {
  return toCsv(transactionRows(transactions, categories), TRANSACTION_CSV_COLUMNS);
}

// ─── Budgets ────────────────────────────────────────────────────────────────

export interface BudgetCsvRow {
  category: string;
  amountEur: number;
  period: string;
}

export const BUDGET_CSV_COLUMNS: CsvColumn<BudgetCsvRow>[] = [
  { key: "category", header: "Catégorie" },
  { key: "amountEur", header: "Montant EUR" },
  { key: "period", header: "Période" },
];

export function budgetRows(budgets: Budget[], categories: Category[]): BudgetCsvRow[] {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return budgets.map((b) => ({
    category: nameById.get(b.category_id) ?? "",
    amountEur: b.amount_eur,
    period: b.period === "monthly" ? "Mensuel" : "Annuel",
  }));
}

export function budgetsToCsv(budgets: Budget[], categories: Category[]): string {
  return toCsv(budgetRows(budgets, categories), BUDGET_CSV_COLUMNS);
}

// ─── Investments ────────────────────────────────────────────────────────────

export interface InvestmentCsvRow {
  name: string;
  assetType: string;
  ticker: string;
  broker: string;
  quantity: number;
  buyPriceEur: number;
  currentPriceEur: number;
  currency: string;
  status: string;
  pnlEur: number;
  pnlPercent: number;
}

export const INVESTMENT_CSV_COLUMNS: CsvColumn<InvestmentCsvRow>[] = [
  { key: "name", header: "Nom" },
  { key: "assetType", header: "Type" },
  { key: "ticker", header: "Ticker" },
  { key: "broker", header: "Courtier" },
  { key: "quantity", header: "Quantité" },
  { key: "buyPriceEur", header: "Prix d'achat EUR" },
  { key: "currentPriceEur", header: "Prix actuel EUR" },
  { key: "currency", header: "Devise" },
  { key: "status", header: "Statut" },
  { key: "pnlEur", header: "P&L EUR" },
  { key: "pnlPercent", header: "P&L %" },
];

export function investmentRows(investments: Investment[]): InvestmentCsvRow[] {
  return investments.map((inv) => {
    const pnl = calculatePositionPnL(inv);
    return {
      name: inv.name,
      assetType: inv.asset_type,
      ticker: inv.ticker ?? "",
      broker: inv.broker ?? "",
      quantity: inv.quantity,
      buyPriceEur: inv.buy_price_eur,
      currentPriceEur: inv.current_price_eur,
      currency: inv.currency,
      status: inv.closed_at ? "Clôturée" : "Ouverte",
      pnlEur: pnl.isClosed ? pnl.realizedPnlEur : pnl.unrealizedPnlEur,
      pnlPercent: pnl.isClosed ? pnl.realizedPnlPercent : pnl.unrealizedPnlPercent,
    };
  });
}

export function investmentsToCsv(investments: Investment[]): string {
  return toCsv(investmentRows(investments), INVESTMENT_CSV_COLUMNS);
}
