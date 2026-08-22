import type { Database } from "@fintrack/api-client";

export type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
