import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
