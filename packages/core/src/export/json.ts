import type {
  Account,
  Budget,
  Category,
  Goal,
  Investment,
  InvestmentValuation,
  RecurringRule,
  Transaction,
} from "../types/index.js";

/**
 * An Open Banking consent as exported. Deliberately WITHOUT the technical
 * correlators (`state`, `session_id`, `enable_account_uid`): they are internal
 * plumbing, not personal data, and exporting them would hand out identifiers
 * that only mean something to the provider.
 */
export interface ExportedBankConnection {
  id: string;
  account_id: string | null;
  aspsp_name: string;
  aspsp_country: string;
  iban: string | null;
  currency: string | null;
  status: string;
  valid_until: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface ExportedProfile {
  default_currency: string;
  locale: string;
  display_name: string | null;
  created_at: string;
}

/**
 * Full account backup — RGPD "droit à la portabilité"/"droit d'accès" (export
 * JSON complet). Raw entities, not display-formatted rows (unlike the CSV
 * export): this is meant for re-import/migration, not for reading.
 *
 * It must hold EVERYTHING personal and be self-consistent: every transaction
 * references an account, so `accounts` is part of it (a backup without them
 * could not be restored), as are the e-mail the data belongs to, the profile
 * settings and the bank connections (IBAN, bank, consent dates).
 */
export interface DataExport {
  exportedAt: string;
  /** Sign-in e-mail of the account the data belongs to. */
  userEmail: string | null;
  profile: ExportedProfile | null;
  accounts: Account[];
  bankConnections: ExportedBankConnection[];
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
