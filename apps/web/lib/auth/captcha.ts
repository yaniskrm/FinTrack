import { captchaTokenSchema } from "@fintrack/core";
import { TURNSTILE_SITE_KEY } from "../captcha";

// Not a "use server" module on purpose: Server Action files may only export
// async functions, and these helpers are plain synchronous utilities.

export const CAPTCHA_REQUIRED_MESSAGE = "Vérification anti-robot requise. Patientez un instant puis réessayez.";
export const CAPTCHA_FAILED_MESSAGE = "Vérification anti-robot échouée. Réessayez.";

export type CaptchaOptions = { ok: true; options: { captchaToken?: string } } | { ok: false; error: string };

/**
 * Builds the `options` to spread into a Supabase Auth call.
 *
 * - CAPTCHA inactive (no site key configured): no token is needed or sent.
 * - CAPTCHA active: a token must be present — fail fast with a clear message
 *   instead of letting Supabase reject it with an opaque error.
 *
 * Only *presence and shape* are checked here; whether the token is genuine is
 * Supabase's call (it holds the Turnstile secret).
 */
export function resolveCaptcha(token: string | undefined): CaptchaOptions {
  if (TURNSTILE_SITE_KEY === undefined) {
    return { ok: true, options: {} };
  }

  const parsed = captchaTokenSchema.safeParse(token);
  if (!parsed.success) {
    return { ok: false, error: CAPTCHA_REQUIRED_MESSAGE };
  }
  return { ok: true, options: { captchaToken: parsed.data } };
}

/** True when Supabase Auth rejected the call because the CAPTCHA token was missing, expired or invalid. */
export function isCaptchaError(error: { code?: string | undefined } | null): boolean {
  return error?.code === "captcha_failed";
}
