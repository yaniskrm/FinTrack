import { describe, expect, it } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { signEnableBankingJwt } from "./jwt.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function decodePart(part: string): unknown {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf-8"));
}

describe("signEnableBankingJwt", () => {
  it("produces a header with typ, alg and kid", () => {
    const jwt = signEnableBankingJwt({ appId: "app-123", privateKeyPem: privateKey });
    const [headerPart] = jwt.split(".");
    expect(decodePart(headerPart ?? "")).toEqual({ typ: "JWT", alg: "RS256", kid: "app-123" });
  });

  it("produces a payload with the fixed iss/aud and a 1-hour expiry", () => {
    const now = Date.parse("2026-09-05T12:00:00Z");
    const jwt = signEnableBankingJwt({ appId: "app-123", privateKeyPem: privateKey }, now);
    const [, payloadPart] = jwt.split(".");
    expect(decodePart(payloadPart ?? "")).toEqual({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: Math.floor(now / 1000),
      exp: Math.floor(now / 1000) + 3600,
    });
  });

  it("produces a signature verifiable against the matching public key", () => {
    const jwt = signEnableBankingJwt({ appId: "app-123", privateKeyPem: privateKey });
    const [headerPart, payloadPart, signaturePart] = jwt.split(".");
    const signingInput = `${headerPart ?? ""}.${payloadPart ?? ""}`;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(signingInput);
    const valid = verifier.verify(publicKey, signaturePart ?? "", "base64url");
    expect(valid).toBe(true);
  });

  it("fails verification against a tampered payload", () => {
    const jwt = signEnableBankingJwt({ appId: "app-123", privateKeyPem: privateKey });
    const [headerPart, , signaturePart] = jwt.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ iss: "evil.com" })).toString("base64url");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerPart ?? ""}.${tamperedPayload}`);
    const valid = verifier.verify(publicKey, signaturePart ?? "", "base64url");
    expect(valid).toBe(false);
  });
});
