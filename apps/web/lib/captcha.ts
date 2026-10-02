/**
 * Cloudflare Turnstile site key — public by design (it ships in the page).
 * The matching *secret* key lives only in the Supabase dashboard
 * (Authentication → Attack Protection): Supabase verifies the token, this app
 * never sees the secret.
 *
 * Unset = CAPTCHA inactive: no widget, no token required. That is the state of
 * local dev and CI, and the safe state to deploy in *before* switching the
 * protection on in Supabase (see CLAUDE.md, ADR-029 for the activation order).
 *
 * Must stay a literal `process.env.NEXT_PUBLIC_…` access: Next.js inlines it
 * at build time for both server and browser bundles.
 */
export const TURNSTILE_SITE_KEY: string | undefined = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;

export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
