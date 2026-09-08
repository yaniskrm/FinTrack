export interface BankingEnvConfig {
  appId: string | undefined;
  privateKeyBase64: string | undefined;
  siteUrl: string | undefined;
  isProduction: boolean;
}

/**
 * Fails fast and explicitly at server startup rather than letting a
 * misconfiguration surface later as a cryptic REDIRECT_URI_NOT_ALLOWED from
 * Enable Banking at callback time. Enable Banking's Production applications
 * only accept https redirect URLs — a Sandbox application accepts
 * http://localhost, which is why the two environments need distinct
 * credentials (same env var names, different values per deployment target;
 * see CLAUDE.md).
 *
 * Deliberately a no-op when neither credential is set at all — CI runs the
 * full E2E suite without ENABLE_BANKING_* configured (see ADR-022), and
 * that must keep working. Only *partial* or *inconsistent* configuration is
 * treated as an error.
 *
 * `isProduction` must reflect an actual deployment, not merely an optimized
 * build — this repo's own local validation workflow runs a full `next
 * build`/`next start` before every E2E pass (see CLAUDE.md), which is NOT
 * production despite `NODE_ENV` saying so. Callers should derive it from a
 * platform-specific signal instead (e.g. Vercel's `VERCEL_ENV`).
 */
export function validateBankingConfig(config: BankingEnvConfig): void {
  const hasAppId = Boolean(config.appId);
  const hasKey = Boolean(config.privateKeyBase64);

  if (hasAppId !== hasKey) {
    throw new Error(
      "Configuration Enable Banking incohérente : ENABLE_BANKING_APP_ID et ENABLE_BANKING_PRIVATE_KEY_BASE64 doivent être définies ensemble (une seule des deux l'est actuellement).",
    );
  }

  if (!hasAppId) return;

  if (config.isProduction && !config.siteUrl?.startsWith("https://")) {
    throw new Error(
      `Configuration Enable Banking incohérente en production : NEXT_PUBLIC_SITE_URL doit être une URL https (une application Enable Banking Production n'accepte pas http) — valeur actuelle : ${config.siteUrl ?? "(non définie)"}.`,
    );
  }
}
