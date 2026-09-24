export function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Resolves the site's origin for building absolute redirect URLs (email links).
 * Prefers the configured NEXT_PUBLIC_SITE_URL — same reasoning as
 * buildBankingRedirectUrl (ADR-024): a value that must match an external
 * allow-list byte-for-byte should never depend on request-supplied data
 * (Origin header) rather than the environment's own fixed configuration.
 * Falls back to the request's Origin header, then localhost, only for
 * contexts where the env var isn't set.
 */
export function resolveSiteOrigin(requestOrigin: string | null): string {
  return process.env["NEXT_PUBLIC_SITE_URL"] ?? requestOrigin ?? "http://localhost:3000";
}
