// Minimal shapes of the Enable Banking API responses this app actually
// reads — not a full mirror of their schema.

export interface EnableBankingAspsp {
  name: string;
  country: string;
  logo: string;
  maximum_consent_validity: number; // seconds
  sandbox?: { users: { username: string; password: string; otp?: string }[] };
}

export interface StartAuthorizationResult {
  url: string;
  authorization_id: string;
}

export interface EnableBankingAccount {
  uid: string;
  iban: string | null;
  currency: string | null;
}

export interface AuthorizeSessionResult {
  session_id: string;
  accounts: EnableBankingAccount[];
  access: { valid_until: string };
}

export interface EnableBankingTransaction {
  transaction_amount: { amount: string; currency: string };
  booking_date?: string;
  value_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  status?: string;
}

export interface TransactionsPage {
  transactions: EnableBankingTransaction[];
  continuation_key: string | null;
}
