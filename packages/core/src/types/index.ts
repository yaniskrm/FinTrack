// ─── Supported currencies ────────────────────────────────────────────────────

// All currencies quoted by open.er-api.com (the exchange-rates Edge Function
// source), minus XDR (IMF SDR, not spendable). Majors first, then alphabetical.
// Display flag + name are derived automatically (see apps/web/lib/currencies).
export const SUPPORTED_CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "AED", "AFN", "ALL",
  "AMD", "ANG", "AOA", "ARS", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN",
  "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN",
  "BZD", "CDF", "CLF", "CLP", "CNH", "CNY", "COP", "CRC", "CUP", "CVE",
  "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "FJD", "FKP",
  "FOK", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD",
  "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR",
  "ISK", "JEP", "JMD", "JOD", "KES", "KGS", "KHR", "KID", "KMF", "KRW",
  "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD",
  "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK",
  "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
  "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD",
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE",
  "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT",
  "TND", "TOP", "TRY", "TTD", "TVD", "TWD", "TZS", "UAH", "UGX", "UYU",
  "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XCG", "XOF", "XPF",
  "YER", "ZAR", "ZMW", "ZWG", "ZWL",
] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// ─── Transaction ─────────────────────────────────────────────────────────────

export type TransactionType = "expense" | "income" | "transfer";

export type ReimbursementStatus = "none" | "pending" | "settled";

export interface Transaction {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;          // in original currency, always positive
  currency: Currency;
  amount_eur: number;      // frozen at entry time — NEVER recalculated
  type: TransactionType;
  label: string;
  merchant: string | null;
  note: string | null;
  date: string;            // ISO 8601 date string
  recurring_rule_id: string | null;
  reimbursement_status: ReimbursementStatus;
  reimbursement_contact: string | null;
  settled_transaction_id: string | null;
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
  hidden: boolean;
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

export type InvestmentType = "etf" | "stock" | "scpi" | "savings" | "crypto" | "other";

export interface Investment {
  id: string;
  workspace_id: string;
  name: string;
  asset_type: InvestmentType;
  ticker: string | null;
  broker: string | null;
  quantity: number;
  buy_price_eur: number;
  current_price_eur: number;
  currency: Currency;
  opened_at: string | null;
  notes: string | null;
  closed_at: string | null; // set together with sale_price_eur — realized position
  sale_price_eur: number | null;
  created_at: string;
}

export interface InvestmentValuation {
  id: string;
  workspace_id: string;
  investment_id: string;
  price_eur: number;
  recorded_at: string; // ISO 8601 date string
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
