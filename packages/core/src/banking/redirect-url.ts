// Enable Banking requires the `redirect_url` sent in every /auth call to
// match, character for character, one of the URLs whitelisted for the
// application in its Control Panel. Fixed path, single source of truth.
export const BANKING_CALLBACK_PATH = "/auth/callback/banking";

/**
 * Builds the banking consent callback URL from a configured base URL —
 * never from a request's live Origin, which can't be guaranteed to match
 * what's actually registered (custom domain aliases, preview deployments).
 * Strips any trailing slash from `baseUrl` first so the result never
 * contains a double slash, regardless of how the base URL was configured.
 */
export function buildBankingRedirectUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${BANKING_CALLBACK_PATH}`;
}
