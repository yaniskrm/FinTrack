import { expect, test } from "@playwright/test";
import { PASSWORD, fillLoginForm, signUpAndLogIn } from "./helpers";

// RGPD art. 17 — the account and everything attached to it can be erased by its
// owner. Runs against real local Supabase, so it exercises the actual
// `delete_my_account()` SQL function (migration 20261002000000) end to end:
// the FK ordering (RESTRICT on accounts), the cascade and the auth.users delete.

const DELETE_BUTTON = "Supprimer définitivement mon compte";

test.describe("account deletion", () => {
  test("stays locked until the password and the confirmation word are given", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/account");

    const button = page.getByRole("button", { name: DELETE_BUTTON });
    await expect(button).toBeDisabled();

    await page.locator("#deletePassword").fill(PASSWORD);
    await expect(button).toBeDisabled(); // password alone is not enough

    await page.locator("#deleteConfirmation").fill("supprimer");
    await expect(button).toBeDisabled(); // case-sensitive: a deliberate act

    await page.locator("#deleteConfirmation").fill("SUPPRIMER");
    await expect(button).toBeEnabled();
  });

  test("a wrong password refuses and deletes nothing", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/account");

    await page.locator("#deletePassword").fill("not-the-password");
    await page.locator("#deleteConfirmation").fill("SUPPRIMER");
    await page.getByRole("button", { name: DELETE_BUTTON }).click();

    await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/account/);

    // Still signed in, still has an account.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("a user can erase their account, and cannot sign in again", async ({ page }) => {
    const email = await signUpAndLogIn(page);

    // Give the account some data so the cascade has real rows to remove
    // (a transaction references an account with ON DELETE RESTRICT).
    await page.goto("/transactions");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();
    await page.getByLabel("Montant").fill("12.30");
    await page.getByLabel("Libellé").fill("A effacer E2E");
    await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("A effacer E2E")).toBeVisible();

    await page.goto("/settings/account");
    await page.locator("#deletePassword").fill(PASSWORD);
    await page.locator("#deleteConfirmation").fill("SUPPRIMER");
    await page.getByRole("button", { name: DELETE_BUTTON }).click();

    await expect(page).toHaveURL(/\/login\?deleted=1/);
    await expect(page.getByText("Votre compte et toutes vos données ont été supprimés.")).toBeVisible();

    // The credentials no longer work: the user is gone from auth.users.
    await fillLoginForm(page, email);
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();

    // And the app is closed to this browser: a protected page sends it to /login.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
