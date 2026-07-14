import type { RecurringFrequency } from "../types/index.js";
import type { ValidationResult } from "./transaction.js";

const FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RecurringRuleInput {
  frequency: unknown;
  start_date: unknown;
  end_date?: unknown;
}

export function validateRecurringRule(input: RecurringRuleInput): ValidationResult {
  const errors: string[] = [];

  if (!FREQUENCIES.includes(input.frequency as RecurringFrequency)) {
    errors.push(`frequency must be one of: ${FREQUENCIES.join(", ")}`);
  }

  if (typeof input.start_date !== "string" || !ISO_DATE_RE.test(input.start_date)) {
    errors.push("start_date must be a valid ISO date string (YYYY-MM-DD)");
  }

  if (input.end_date !== undefined && input.end_date !== null) {
    if (typeof input.end_date !== "string" || !ISO_DATE_RE.test(input.end_date)) {
      errors.push("end_date must be a valid ISO date string (YYYY-MM-DD) or null");
    } else if (typeof input.start_date === "string" && input.end_date <= input.start_date) {
      errors.push("end_date must be after start_date");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Computes the next occurrence date after a given date for a recurring rule.
 */
export function getNextOccurrence(
  currentDate: string,
  frequency: RecurringFrequency,
): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().slice(0, 10);
}
