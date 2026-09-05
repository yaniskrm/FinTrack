import { expect, test } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

// The full Open Banking consent round-trip (redirecting to the real Enable
// Banking-hosted consent page, then to the bank's own login) can't be
// automated here: even the "Mock ASPSP" test bank authenticates through a
// real Enable Banking account sign-in, not a throwaway sandbox credential —
// verified manually while building this feature (see CLAUDE.md, Pièges
// connus). Automating it would mean storing a real personal account login
// in CI, which we deliberately don't do — same call as the Push API
// limitation (v1.1). These tests cover what's actually deterministic:
// the dialog opens and its static shell renders correctly, regardless of
// whether ENABLE_BANKING_* credentials are configured in this environment.

test("a user can open the connect-bank dialog", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/accounts");
  await expect(page.getByRole("heading", { name: "Open Banking" })).toBeVisible();

  await page.getByRole("button", { name: "Connecter ma banque" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Connecter ma banque")).toBeVisible();
  await expect(page.getByLabel("Pays")).toBeVisible();
  // Deliberately not asserting on the bank list itself: whether it shows
  // real ASPSPs or a fallback message depends on ENABLE_BANKING_* being
  // configured in this environment (only true locally, never in CI — see
  // CLAUDE.md, Variables d'environnement).
});

test("closing the connect-bank dialog leaves the accounts page usable", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/accounts");
  await page.getByRole("button", { name: "Connecter ma banque" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Connecter ma banque" })).toBeVisible();
});
