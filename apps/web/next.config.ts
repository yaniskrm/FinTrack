import path from "node:path";
import type { NextConfig } from "next";

// Headers that do not depend on the request. The Content-Security-Policy is
// NOT here: it carries a per-request nonce, so it is set in middleware.ts
// (lib/security/csp.ts).
const SECURITY_HEADERS = [
  // Two years; HTTPS-only is already enforced by Vercel for the custom domain.
  // No `preload` on purpose: that is a hard-to-undo commitment for the whole domain.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy equivalent of CSP frame-ancestors 'none' (older browsers).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these browser capabilities. (Notifications are
  // gated by their own permission prompt, not by Permissions-Policy.)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // A cached service worker would delay every update for up to a day.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Pin the monorepo root explicitly — otherwise Next.js may infer it from an
  // unrelated lockfile higher up the filesystem tree.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // `pnpm dev` always uses the default `.next` — a build/verification pass
  // (CI-equivalence check, E2E) must NEVER write there while a dev server
  // might be using it (rm -rf mid-compile corrupts it, see CLAUDE.md pièges
  // connus). Those passes set NEXT_DIST_DIR to a separate directory instead.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
