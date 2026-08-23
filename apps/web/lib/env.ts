export function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Resolves the site's origin for building absolute redirect URLs (email links).
 * Prefers the request's own Origin header, falling back to NEXT_PUBLIC_SITE_URL
 * for contexts where that header isn't available.
 */
export function resolveSiteOrigin(requestOrigin: string | null): string {
  return requestOrigin ?? process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";
}
