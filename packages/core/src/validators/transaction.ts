import { SUPPORTED_CURRENCIES } from "../types/index.js";
import type { Currency, TransactionType } from "../types/index.js";

export interface TransactionInput {
  amount: unknown;
  currency: unknown;
  type: unknown;
  label: unknown;
  date: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const TRANSACTION_TYPES: TransactionType[] = ["expense", "income", "transfer"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateTransaction(input: TransactionInput): ValidationResult {
  const errors: string[] = [];

  // amount
  if (typeof input.amount !== "number" || !isFinite(input.amount)) {
    errors.push("amount must be a finite number");
  } else if (input.amount <= 0) {
    errors.push("amount must be greater than 0");
  }

  // currency
  if (!SUPPORTED_CURRENCIES.includes(input.currency as Currency)) {
    errors.push(`currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`);
  }

  // type
  if (!TRANSACTION_TYPES.includes(input.type as TransactionType)) {
    errors.push(`type must be one of: ${TRANSACTION_TYPES.join(", ")}`);
  }

  // label
  if (typeof input.label !== "string" || input.label.trim().length === 0) {
    errors.push("label must be a non-empty string");
  } else if (input.label.length > 100) {
    errors.push("label must not exceed 100 characters");
  }

  // date
  if (typeof input.date !== "string" || !ISO_DATE_RE.test(input.date)) {
    errors.push("date must be a valid ISO date string (YYYY-MM-DD)");
  } else {
    const d = new Date(input.date);
    if (isNaN(d.getTime())) {
      errors.push("date is not a valid date");
    }
  }

  return { valid: errors.length === 0, errors };
}
