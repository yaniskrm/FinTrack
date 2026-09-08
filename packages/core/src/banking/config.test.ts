import { describe, expect, it } from "vitest";
import { validateBankingConfig } from "./config.js";
import type { BankingEnvConfig } from "./config.js";

function config(overrides: Partial<BankingEnvConfig> = {}): BankingEnvConfig {
  return {
    appId: undefined,
    privateKeyBase64: undefined,
    siteUrl: undefined,
    isProduction: false,
    ...overrides,
  };
}

describe("validateBankingConfig", () => {
  it("does not throw when neither credential is set (banking simply unconfigured, e.g. CI)", () => {
    expect(() => {
      validateBankingConfig(config());
    }).not.toThrow();
  });

  it("does not throw when neither credential is set even in production", () => {
    expect(() => {
      validateBankingConfig(config({ isProduction: true }));
    }).not.toThrow();
  });

  it("throws when only the app id is set", () => {
    expect(() => {
      validateBankingConfig(config({ appId: "app-123" }));
    }).toThrow(/incohérente/);
  });

  it("throws when only the private key is set", () => {
    expect(() => {
      validateBankingConfig(config({ privateKeyBase64: "base64key" }));
    }).toThrow(/incohérente/);
  });

  it("does not throw with both credentials set outside production, regardless of site URL", () => {
    expect(() => {
      validateBankingConfig(config({ appId: "app-123", privateKeyBase64: "key", siteUrl: "http://localhost:3000" }));
    }).not.toThrow();
  });

  it("throws in production when the site URL is http", () => {
    expect(() => {
      validateBankingConfig(
        config({ appId: "app-123", privateKeyBase64: "key", siteUrl: "http://example.com", isProduction: true }),
      );
    }).toThrow(/https/);
  });

  it("throws in production when the site URL is missing", () => {
    expect(() => {
      validateBankingConfig(config({ appId: "app-123", privateKeyBase64: "key", isProduction: true }));
    }).toThrow(/https/);
  });

  it("does not throw in production when the site URL is https", () => {
    expect(() => {
      validateBankingConfig(
        config({ appId: "app-123", privateKeyBase64: "key", siteUrl: "https://example.com", isProduction: true }),
      );
    }).not.toThrow();
  });
});
