import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the monorepo root explicitly — otherwise Next.js may infer it from an
  // unrelated lockfile higher up the filesystem tree.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
