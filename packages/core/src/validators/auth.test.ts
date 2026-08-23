import { describe, expect, it } from "vitest";
import {
  validateResetPassword,
  validateSignIn,
  validateSignUp,
  validateUpdatePassword,
} from "./auth.js";

describe("validateSignIn", () => {
  it("accepts a valid email/password pair", () => {
    const result = validateSignIn({ email: "user@example.com", password: "secret" });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a missing email", () => {
    const result = validateSignIn({ email: "", password: "secret" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("email is required");
  });

  it("rejects a malformed email", () => {
    const result = validateSignIn({ email: "not-an-email", password: "secret" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("email must be a valid email address");
  });

  it("rejects an empty password", () => {
    const result = validateSignIn({ email: "user@example.com", password: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("password is required");
  });
});

describe("validateSignUp", () => {
  const base = {
    email: "user@example.com",
    password: "password123",
    confirmPassword: "password123",
    consent: true,
  };

  it("accepts valid signup input", () => {
    expect(validateSignUp(base)).toEqual({ valid: true, errors: [] });
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = validateSignUp({ ...base, password: "short1", confirmPassword: "short1" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("password must be at least 8 characters");
  });

  it("rejects mismatched password confirmation", () => {
    const result = validateSignUp({ ...base, confirmPassword: "different123" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("confirmPassword must match password");
  });

  it("rejects missing consent", () => {
    const result = validateSignUp({ ...base, consent: false });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("consent is required");
  });
});

describe("validateResetPassword", () => {
  it("accepts a valid email", () => {
    expect(validateResetPassword({ email: "user@example.com" })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects an invalid email", () => {
    const result = validateResetPassword({ email: "nope" });
    expect(result.valid).toBe(false);
  });
});

describe("validateUpdatePassword", () => {
  it("accepts a valid password pair", () => {
    const result = validateUpdatePassword({
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects a mismatched confirmation", () => {
    const result = validateUpdatePassword({
      password: "password123",
      confirmPassword: "password124",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("confirmPassword must match password");
  });
});
