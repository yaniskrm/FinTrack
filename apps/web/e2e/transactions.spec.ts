import { expect, test } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

test("a user can create a transaction via the quick-entry dialog and see it in the list", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/transactions");
  await page.keyboard.press("n");

  await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();
  await page.getByLabel("Montant").fill("42.50");
  await page.getByLabel("Libellé").fill("Courses E2E");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Courses E2E")).toBeVisible();
});
