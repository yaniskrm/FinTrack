import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test("a user can create, edit and archive an account", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/accounts");
  // The workspace already has a backfilled "Compte principal".
  await expect(page.getByText("Compte principal")).toBeVisible();

  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Nom").fill("Livret A");
  await page.getByLabel("Solde initial").fill("500");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  const row = page.getByText("Livret A").locator("..").locator("..");
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Nom").fill("Livret A modifié");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Livret A modifié")).toBeVisible();

  const editedRow = page.getByText("Livret A modifié").locator("..").locator("..");
  await editedRow.getByRole("button", { name: "Archiver" }).click();
  await logToastIfPresent(page);

  await expect(page.getByText("Archivés")).toBeVisible();
});

test("a user can transfer money between two accounts", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/accounts");
  await page.getByRole("button", { name: "Ajouter" }).click();
  await page.getByLabel("Nom").fill("Épargne E2E");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.goto("/transactions");
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();

  await page.getByLabel("Type").click();
  await page.getByRole("option", { name: "Transfert" }).click();
  await page.getByLabel("Montant").fill("100");
  await page.getByLabel("Vers").click();
  await page.getByRole("option", { name: "Épargne E2E" }).click();
  await page.getByLabel("Libellé").fill("Virement épargne E2E");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Virement épargne E2E")).toBeVisible();

  await page.getByRole("combobox", { name: "Compte" }).click();
  await page.getByRole("option", { name: "Épargne E2E" }).click();
  await expect(page.getByText("Virement épargne E2E")).toBeVisible();
});
