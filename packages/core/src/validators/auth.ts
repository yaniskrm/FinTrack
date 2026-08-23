import type { ValidationResult } from "./transaction.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export interface SignInInput {
  email: unknown;
  password: unknown;
}

export interface SignUpInput {
  email: unknown;
  password: unknown;
  confirmPassword: unknown;
  consent: unknown;
}

export interface ResetPasswordInput {
  email: unknown;
}

export interface UpdatePasswordInput {
  password: unknown;
  confirmPassword: unknown;
}

export interface UpdateEmailInput {
  email: unknown;
}

export interface ChangePasswordInput {
  currentPassword: unknown;
  password: unknown;
  confirmPassword: unknown;
}

function pushEmailErrors(email: unknown, errors: string[]): void {
  if (typeof email !== "string" || email.trim().length === 0) {
    errors.push("email is required");
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push("email must be a valid email address");
  }
}

function pushPasswordErrors(password: unknown, errors: string[]): void {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${String(MIN_PASSWORD_LENGTH)} characters`);
  }
}

export function validateSignIn(input: SignInInput): ValidationResult {
  const errors: string[] = [];

  pushEmailErrors(input.email, errors);

  if (typeof input.password !== "string" || input.password.length === 0) {
    errors.push("password is required");
  }

  return { valid: errors.length === 0, errors };
}

export function validateSignUp(input: SignUpInput): ValidationResult {
  const errors: string[] = [];

  pushEmailErrors(input.email, errors);
  pushPasswordErrors(input.password, errors);

  if (input.confirmPassword !== input.password) {
    errors.push("confirmPassword must match password");
  }

  if (input.consent !== true) {
    errors.push("consent is required");
  }

  return { valid: errors.length === 0, errors };
}

export function validateResetPassword(input: ResetPasswordInput): ValidationResult {
  const errors: string[] = [];

  pushEmailErrors(input.email, errors);

  return { valid: errors.length === 0, errors };
}

export function validateUpdatePassword(input: UpdatePasswordInput): ValidationResult {
  const errors: string[] = [];

  pushPasswordErrors(input.password, errors);

  if (input.confirmPassword !== input.password) {
    errors.push("confirmPassword must match password");
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateEmail(input: UpdateEmailInput): ValidationResult {
  const errors: string[] = [];

  pushEmailErrors(input.email, errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Password change from within the app (as opposed to the forgot-password
 * recovery flow): requires the current password too, so a hijacked/left-open
 * session can't silently lock the real owner out.
 */
export function validateChangePassword(input: ChangePasswordInput): ValidationResult {
  const errors: string[] = [];

  if (typeof input.currentPassword !== "string" || input.currentPassword.length === 0) {
    errors.push("currentPassword is required");
  }

  pushPasswordErrors(input.password, errors);

  if (input.confirmPassword !== input.password) {
    errors.push("confirmPassword must match password");
  }

  return { valid: errors.length === 0, errors };
}
