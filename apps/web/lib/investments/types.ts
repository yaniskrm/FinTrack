import type { Database } from "@fintrack/api-client";

export type InvestmentRow = Database["public"]["Tables"]["investments"]["Row"];
export type InvestmentValuationRow = Database["public"]["Tables"]["investment_valuations"]["Row"];
