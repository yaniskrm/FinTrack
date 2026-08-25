import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test("a user can create a transaction via the quick-entry dialog and see it in the list", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/transactions");
  await page.keyboard.press("n");

  await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();
  await page.getByLabel("Montant").fill("42.50");
  await page.getByLabel("Libellé").fill("Courses E2E");
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Courses E2E")).toBeVisible();
});

test("a user can mark an expense as reimbursable and settle it", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/transactions");
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();

  await page.getByLabel("Montant").fill("20");
  await page.getByLabel("Libellé").fill("Avance E2E");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
  await logToastIfPresent(page);
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Remboursements en attente")).toBeVisible();
  await page.getByRole("button", { name: "Marquer remboursé" }).click();
  await logToastIfPresent(page);

  await expect(page.getByText("Remboursements en attente")).toBeHidden();
  await expect(page.locator('[aria-label="Remboursé"]')).toBeVisible();
});

test("a user can navigate between months on the transactions view", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/transactions");
  // Scope to the month nav row itself — a bare /\d{4}/ text search also
  // matches the sidebar's user-email footer, whose random e2e address
  // contains four-digit runs too.
  const monthLabel = page.getByRole("button", { name: "Mois précédent" }).locator("..").getByText(/\d{4}/);
  const initialMonth = await monthLabel.textContent();

  await page.getByRole("button", { name: "Mois précédent" }).click();
  await expect(monthLabel).not.toHaveText(initialMonth ?? "");

  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(monthLabel).toHaveText(initialMonth ?? "");
});
