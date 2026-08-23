import { describe, expect, it } from "vitest";
import { validateTotpCode } from "./mfa.js";

describe("validateTotpCode", () => {
  it("accepts a valid 6-digit code", () => {
    expect(validateTotpCode({ code: "123456" })).toEqual({ valid: true, errors: [] });
  });

  it("accepts a code with leading zeros", () => {
    expect(validateTotpCode({ code: "000042" })).toEqual({ valid: true, errors: [] });
  });

  it("rejects a code shorter than 6 digits", () => {
    const result = validateTotpCode({ code: "12345" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("code must be a 6-digit number");
  });

  it("rejects a code longer than 6 digits", () => {
    expect(validateTotpCode({ code: "1234567" }).valid).toBe(false);
  });

  it("rejects a code with non-digit characters", () => {
    expect(validateTotpCode({ code: "12 456" }).valid).toBe(false);
    expect(validateTotpCode({ code: "abcdef" }).valid).toBe(false);
  });

  it("rejects a non-string code", () => {
    expect(validateTotpCode({ code: 123456 }).valid).toBe(false);
    expect(validateTotpCode({ code: null }).valid).toBe(false);
    expect(validateTotpCode({ code: undefined }).valid).toBe(false);
  });
});
