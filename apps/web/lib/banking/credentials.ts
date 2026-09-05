import type { EnableBankingCredentials } from "@fintrack/core/server";
import { requireEnv } from "../env";

/**
 * Server-only. Never read from a Client Component — the private key must
 * never reach the browser bundle, which is why these are plain
 * (non-`NEXT_PUBLIC_`) env vars in the first place.
 */
export function getEnableBankingCredentials(): EnableBankingCredentials {
  const appId = requireEnv("ENABLE_BANKING_APP_ID");
  const privateKeyPem = Buffer.from(requireEnv("ENABLE_BANKING_PRIVATE_KEY_BASE64"), "base64").toString("utf-8");
  return { appId, privateKeyPem };
}
