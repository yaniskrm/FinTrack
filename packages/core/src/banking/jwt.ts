import { createSign } from "node:crypto";

export interface EnableBankingCredentials {
  appId: string;
  privateKeyPem: string;
}

/**
 * Signs a fresh RS256 JWT for one Enable Banking API call. Enable Banking
 * has no per-session bearer token — every request (including ones made
 * months after a consent was granted) is authenticated this way, using
 * the application's own private key. `now` is injectable for deterministic
 * tests; production callers omit it.
 */
export function signEnableBankingJwt(credentials: EnableBankingCredentials, now: number = Date.now()): string {
  const header = { typ: "JWT", alg: "RS256", kid: credentials.appId };
  const iat = Math.floor(now / 1000);
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + 3600 };

  const signingInput = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url")}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(credentials.privateKeyPem);

  return `${signingInput}.${signature.toString("base64url")}`;
}
