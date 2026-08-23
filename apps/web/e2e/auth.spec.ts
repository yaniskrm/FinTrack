import { expect, test } from "@playwright/test";
import { fillLoginForm, randomEmail, signUpAndLogIn } from "./helpers";

test.describe("auth & onboarding", () => {
  test("a new user can sign up and lands on an empty dashboard", async ({ page }) => {
    await signUpAndLogIn(page);

    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByText("Ajoutez des transactions pour voir vos statistiques ici.")).toBeVisible();
  });

  test("a signed-out user can log back in with the same credentials", async ({ page }) => {
    const email = randomEmail();
    await signUpAndLogIn(page, email);

    await page.getByRole("button", { name: "Déconnexion" }).first().click();
    await expect(page).toHaveURL(/\/login/);

    await fillLoginForm(page, email);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("an unauthenticated visitor is redirected to login from every protected route", async ({ page }) => {
    for (const path of ["/dashboard", "/transactions", "/budget", "/goals", "/investments", "/settings/account"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
