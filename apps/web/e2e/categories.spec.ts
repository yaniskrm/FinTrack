import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test("a user can create, edit and hide a category", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/categories");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Nom").fill("Catégorie E2E");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  const row = page.getByText("Catégorie E2E").locator("..");
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Nom").fill("Catégorie E2E modifiée");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Catégorie E2E modifiée")).toBeVisible();

  const editedRow = page.getByText("Catégorie E2E modifiée").locator("..");
  await editedRow.getByRole("button", { name: "Masquer" }).click();
  await logToastIfPresent(page);

  await expect(page.getByText("Masquées")).toBeVisible();
});
