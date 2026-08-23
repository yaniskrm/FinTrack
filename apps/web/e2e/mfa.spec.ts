import { expect, test } from "@playwright/test";
import { TOTP, Secret } from "otpauth";
import { fillLoginForm, signUpAndLogIn } from "./helpers";

function codeFor(secret: string): string {
  return new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 }).generate();
}

test("2FA enrollment upgrades a session to AAL2 and gates financial pages until step-up", async ({ page }) => {
  const email = await signUpAndLogIn(page);

  // ─── Enroll ─────────────────────────────────────────────
  await page.goto("/settings/security");
  await page.getByRole("button", { name: "Activer la 2FA" }).click();

  await page.getByText("Saisir la clé manuellement").click();
  const secret = (await page.locator("details code").textContent())?.trim();
  expect(secret).toBeTruthy();

  await page.getByLabel("Code de vérification").fill(codeFor(secret ?? ""));
  await page.getByRole("button", { name: "Confirmer" }).click();

  await expect(page).toHaveURL(/\/settings\/security/);
  await expect(page.getByText("Activée")).toBeVisible();

  // ─── Sign out, sign back in: should stop at AAL1 step-up ──
  await page.getByRole("button", { name: "Déconnexion" }).first().click();
  await expect(page).toHaveURL(/\/login/);

  await fillLoginForm(page, email);
  await expect(page).toHaveURL(/\/mfa/);

  // ─── The AAL2 gate: a financial route must bounce back to /mfa ──
  await page.goto("/budget");
  await expect(page).toHaveURL(/\/mfa/);

  // ─── Completing step-up grants access ──────────────────────
  await page.getByLabel("Code de vérification").fill(codeFor(secret ?? ""));
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/budget");
  await expect(page).toHaveURL(/\/budget/);
});
