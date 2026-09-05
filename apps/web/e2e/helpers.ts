import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const PASSWORD = "correct-horse-battery-staple";

export function randomEmail(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@fintrack.local`;
}

/** Fills and submits the signup form. Leaves the caller on /signup to assert the result. */
export async function fillSignUpForm(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
}

/**
 * Navigates to `url` and waits for `text` to appear, reloading a bounded
 * number of times if it doesn't show up on the first render. Works around a
 * known Server-Component read-after-write staleness right after a Server
 * Action insert — the data is proven durable (verified directly against
 * Postgres), but the very next SSR read can occasionally still reflect a
 * pre-insert snapshot when navigation follows the insert almost instantly.
 * See CLAUDE.md, Pièges connus, for the full investigation.
 */
export async function gotoAndWaitVisible(page: Page, url: string, text: string, attempts = 10): Promise<void> {
  await page.goto(url);
  for (let i = 0; i < attempts; i++) {
    if (await page.getByText(text).isVisible().catch(() => false)) return;
    await page.waitForTimeout(500);
    await page.reload();
  }
  await expect(page.getByText(text)).toBeVisible();
}

/** CI-only diagnostic: prints any visible sonner toast text to the test log. */
export async function logToastIfPresent(page: Page): Promise<void> {
  if (!process.env.CI) return;
  const texts = await page.locator("[data-sonner-toast]").allTextContents().catch(() => []);
  if (texts.length > 0) {
    console.log("[e2e] toast:", JSON.stringify(texts));
  }
}

/** Fills and submits the login form. Leaves the caller to assert the resulting redirect. */
export async function fillLoginForm(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/**
 * Signs up a fresh user and lands on the dashboard — the fast path shared by
 * every spec that just needs "a logged-in user", not a full login test.
 * Local Supabase has `enable_confirmations = false`, so the session is
 * already live right after signup (even though the UI still shows its
 * "check your email" copy, which is accurate for production): going to
 * /login afterward would just bounce straight back to /dashboard, since
 * /login is logged-out-only. See auth.spec.ts for the dedicated login-flow
 * test that signs out first.
 */
export async function signUpAndLogIn(page: Page, email: string = randomEmail()): Promise<string> {
  if (process.env.CI) {
    page.on("response", (res) => {
      if (res.status() >= 400) {
        console.log(`[e2e] ${String(res.status())} ${res.request().method()} ${res.url()}`);
      }
    });
  }

  await fillSignUpForm(page, email);
  await expect(page.getByText("Compte créé.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  return email;
}
