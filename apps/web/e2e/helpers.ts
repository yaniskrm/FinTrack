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
  await fillSignUpForm(page, email);
  await expect(page.getByText("Compte créé.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  return email;
}
