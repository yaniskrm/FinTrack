// Runs once when the server process starts (Next.js instrumentation hook —
// stable since Next 15, no config flag needed). Used here to fail fast on a
// misconfigured Enable Banking setup instead of surfacing it later as a
// cryptic REDIRECT_URI_NOT_ALLOWED from Enable Banking at callback time.
// Guarded to the Node runtime: `register()` also fires once for the Edge
// runtime, which would otherwise run this check twice.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateBankingConfig } = await import("@fintrack/core");
  validateBankingConfig({
    appId: process.env["ENABLE_BANKING_APP_ID"],
    privateKeyBase64: process.env["ENABLE_BANKING_PRIVATE_KEY_BASE64"],
    siteUrl: process.env["NEXT_PUBLIC_SITE_URL"],
    // NOT `NODE_ENV === "production"` — `next start` sets that internally
    // for every optimized build, including the local one this repo's own
    // validation workflow runs before every E2E pass (NEXT_DIST_DIR=
    // .next-verify, see CLAUDE.md), so it can't tell "production build" apart
    // from "actually deployed to the real production domain" (confirmed:
    // crashed local E2E boot with real Sandbox credentials configured and no
    // NEXT_PUBLIC_SITE_URL, exactly the everyday local setup). `VERCEL_ENV`
    // is set by Vercel's platform itself only for real deployments (never
    // locally, never in GitHub Actions CI) — the correct signal here.
    isProduction: process.env["VERCEL_ENV"] === "production",
  });
}
