import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test("a user can create a budget envelope", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/budget");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Montant (EUR)").fill("300");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("300,00 €", { exact: false })).toBeVisible();
});

test("a user can create a savings goal", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/goals");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Nom").fill("Voyage E2E");
  await page.getByLabel("Montant cible (EUR)").fill("2000");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Voyage E2E")).toBeVisible();
});
