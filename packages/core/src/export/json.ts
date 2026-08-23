import type {
  Budget,
  Category,
  Goal,
  Investment,
  InvestmentValuation,
  RecurringRule,
  Transaction,
} from "../types/index.js";

/**
 * Full account backup — RGPD "droit à la portabilité"/"droit d'accès" (export
 * JSON complet). Raw entities, not display-formatted rows (unlike the CSV
 * export): this is meant for re-import/migration, not for reading.
 */
export interface DataExport {
  exportedAt: string;
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  investments: Investment[];
  investmentValuations: InvestmentValuation[];
}

export function buildDataExport(
  input: Omit<DataExport, "exportedAt">,
  now: Date = new Date(),
): DataExport {
  return { exportedAt: now.toISOString(), ...input };
}
