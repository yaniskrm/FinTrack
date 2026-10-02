/**
 * Content-Security-Policy, built per request around a fresh nonce (see
 * middleware.ts). Pure function — no I/O — so it stays trivially auditable.
 *
 * Design choices:
 * - `script-src` is nonce-based with 'strict-dynamic': Next.js's own inline
 *   bootstrap scripts (and next-themes') carry the nonce; anything they load
 *   is trusted transitively. No 'unsafe-inline' for scripts.
 * - `style-src` keeps 'unsafe-inline': React `style={{…}}` attributes
 *   (Recharts, Radix positioning) cannot carry a nonce. Style injection is a
 *   much weaker primitive than script injection; accepted knowingly.
 * - `connect-src` lists the Supabase project origin only. The app never calls
 *   exchange-rate or banking APIs from the browser (server-only by design).
 * - `frame-ancestors 'none'` + `form-action 'self'` + `base-uri 'self'` close
 *   clickjacking, form-hijack and <base> injection.
 */

export const CSP_ENFORCE_HEADER = "Content-Security-Policy";
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

/**
 * Report-Only by default: a violation is logged in the browser console but
 * nothing is blocked. Set CSP_ENFORCE=true (Vercel env var + redeploy) once
 * production has run clean. E2E runs with it enforced (playwright.config.ts).
 */
export function cspHeaderName(): string {
  return process.env["CSP_ENFORCE"] === "true" ? CSP_ENFORCE_HEADER : CSP_REPORT_ONLY_HEADER;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export interface CspOptions {
  nonce: string;
  /** NEXT_PUBLIC_SUPABASE_URL — becomes the only allowed cross-origin connect target. */
  supabaseUrl: string | undefined;
  isDev: boolean;
}

export function buildContentSecurityPolicy({ nonce, supabaseUrl, isDev }: CspOptions): string {
  const supabaseOrigin = originOf(supabaseUrl);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React's dev overlay needs eval; never in production builds.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // data: → inline SVG QR code of the TOTP enrolment; blob: → PDF export.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(supabaseOrigin ? [supabaseOrigin] : [])],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  // Deliberately NO `upgrade-insecure-requests`: on a plain-http origin it
  // rewrites every subresource (including the app's own JS chunks) to https,
  // which does not exist there — the page renders but never hydrates. WebKit
  // applies it even to http://127.0.0.1, which broke the whole WebKit E2E run
  // (Chromium exempts localhost, so Chromium and the PR CI stayed green).
  // On the real https site it would upgrade nothing, and Strict-Transport-
  // Security (next.config.ts) already forces https there.
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
