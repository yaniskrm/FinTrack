import type { ValidationResult } from "./transaction.js";

const TOTP_CODE_RE = /^\d{6}$/;

export interface TotpCodeInput {
  code: unknown;
}

/**
 * Validates a TOTP one-time code: exactly 6 digits.
 * Whitespace should be trimmed by the caller before validation.
 */
export function validateTotpCode(input: TotpCodeInput): ValidationResult {
  const errors: string[] = [];

  if (typeof input.code !== "string" || !TOTP_CODE_RE.test(input.code)) {
    errors.push("code must be a 6-digit number");
  }

  return { valid: errors.length === 0, errors };
}
