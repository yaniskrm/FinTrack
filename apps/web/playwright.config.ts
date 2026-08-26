import { defineConfig, devices } from "@playwright/test";

// Deliberately NOT 3000 — that's reserved for a human's own `pnpm dev`
// session. E2E must never compete for it (killing it, or overwriting its
// `.next` mid-build corrupts a running dev server — see CLAUDE.md pièges
// connus). NEXT_DIST_DIR keeps the build output separate too; set it
// whenever building for this config (locally or in CI).
const PORT = 3100;
const baseURL = `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // Reuses an already-running server on this port (e.g. a previous
    // `playwright test --ui` session) — otherwise starts one, which requires
    // `next build` to have run first with the same NEXT_DIST_DIR.
    command: "pnpm start",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
});
