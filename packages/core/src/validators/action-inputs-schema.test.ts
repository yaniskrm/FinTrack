import { describe, expect, it } from "vitest";
import {
  aspspNameSchema,
  connectionAccountNameSchema,
  countryCodeSchema,
  defaultCurrencySchema,
  pushEndpointSchema,
  pushSubscriptionSchema,
  rowIdSchema,
} from "./action-inputs-schema.js";

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
};

describe("defaultCurrencySchema", () => {
  it("accepts a supported currency", () => {
    expect(defaultCurrencySchema.safeParse("MAD").success).toBe(true);
  });

  it("rejects an unknown or lower-case currency", () => {
    expect(defaultCurrencySchema.safeParse("XXX").success).toBe(false);
    expect(defaultCurrencySchema.safeParse("eur").success).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(defaultCurrencySchema.safeParse({ code: "EUR" }).success).toBe(false);
  });
});

describe("rowIdSchema", () => {
  it("accepts a uuid", () => {
    expect(rowIdSchema.safeParse("3f2b8c1e-5d4a-4c3b-9a1f-0e2d4c6b8a10").success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(rowIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(rowIdSchema.safeParse("").success).toBe(false);
    expect(rowIdSchema.safeParse("1 or 1=1").success).toBe(false);
  });
});

describe("countryCodeSchema", () => {
  it("accepts an upper-case ISO alpha-2 code", () => {
    expect(countryCodeSchema.safeParse("FR").success).toBe(true);
  });

  it("rejects lower-case, wrong length and injection-shaped values", () => {
    expect(countryCodeSchema.safeParse("fr").success).toBe(false);
    expect(countryCodeSchema.safeParse("FRA").success).toBe(false);
    expect(countryCodeSchema.safeParse("F").success).toBe(false);
    expect(countryCodeSchema.safeParse("FR&x=1").success).toBe(false);
  });
});

describe("aspspNameSchema", () => {
  it("accepts and trims a bank name", () => {
    expect(aspspNameSchema.parse("  BBVA ")).toBe("BBVA");
  });

  it("rejects empty and oversized names", () => {
    expect(aspspNameSchema.safeParse("   ").success).toBe(false);
    expect(aspspNameSchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("connectionAccountNameSchema", () => {
  it("applies the same bounds as the account form", () => {
    expect(connectionAccountNameSchema.safeParse("Compte BBVA").success).toBe(true);
    expect(connectionAccountNameSchema.safeParse("").success).toBe(false);
    expect(connectionAccountNameSchema.safeParse("x".repeat(51)).success).toBe(false);
  });
});

describe("pushSubscriptionSchema", () => {
  it("accepts a well-formed subscription", () => {
    expect(pushSubscriptionSchema.safeParse(validSubscription).success).toBe(true);
  });

  it("rejects a non-https endpoint", () => {
    expect(
      pushSubscriptionSchema.safeParse({ ...validSubscription, endpoint: "http://push.example.com/x" }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({ ...validSubscription, endpoint: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("rejects an oversized endpoint", () => {
    const endpoint = `https://push.example.com/${"a".repeat(2100)}`;
    expect(pushSubscriptionSchema.safeParse({ ...validSubscription, endpoint }).success).toBe(false);
  });

  it("rejects keys that are not base64url", () => {
    expect(
      pushSubscriptionSchema.safeParse({ ...validSubscription, keys: { ...validSubscription.keys, auth: "a b!" } })
        .success,
    ).toBe(false);
  });

  it("rejects missing keys", () => {
    expect(pushSubscriptionSchema.safeParse({ endpoint: validSubscription.endpoint }).success).toBe(false);
  });
});

describe("pushEndpointSchema", () => {
  it("accepts an https endpoint and rejects anything else", () => {
    expect(pushEndpointSchema.safeParse(validSubscription.endpoint).success).toBe(true);
    expect(pushEndpointSchema.safeParse("ftp://x.example.com").success).toBe(false);
    expect(pushEndpointSchema.safeParse(42).success).toBe(false);
  });
});
