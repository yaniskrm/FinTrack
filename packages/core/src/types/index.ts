// ─── Supported currencies ────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "DKK", "SEK"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionType = "expense" | "income" | "transfer";

export interface Transaction {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;          // in original currency, always positive
  currency: Currency;
  amount_eur: number;      // frozen at entry time — NEVER recalculated
  type: TransactionType;
  label: string;
  note: string | null;
  date: string;            // ISO 8601 date string
  recurring_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Recurring rule ───────────────────────────────────────────────────────────

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;
  currency: Currency;
  type: TransactionType;
  label: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  created_at: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  workspace_id: string;
  category_id: string;
  amount_eur: number;
  period: "monthly" | "yearly";
  created_at: string;
}

// ─── Investment ───────────────────────────────────────────────────────────────

export interface Investment {
  id: string;
  workspace_id: string;
  name: string;
  ticker: string | null;
  quantity: number;
  buy_price_eur: number;
  current_price_eur: number;
  currency: Currency;
  created_at: string;
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  workspace_id: string;
  name: string;
  target_amount_eur: number;
  current_amount_eur: number;
  deadline: string | null;
  created_at: string;
}

// ─── Exchange rate ────────────────────────────────────────────────────────────

export interface ExchangeRate {
  currency: Currency;
  rate_to_eur: number;    // how many EUR = 1 unit of this currency
  updated_at: string;
}
