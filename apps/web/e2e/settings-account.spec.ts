import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test("a user can set a default currency that pre-fills new transactions", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/settings/account");
  await page.getByRole("combobox", { name: "Devise" }).click();
  await page.getByPlaceholder("Rechercher une devise…").fill("USD");
  await page.getByRole("option", { name: "USD", exact: false }).click();
  // Wait for the popover to close and the combobox to reflect the new value
  // before saving — otherwise the click can land mid-close on webkit.
  await expect(page.getByRole("combobox", { name: "Devise" })).toHaveText(/USD/);
  const saveButton = page.getByRole("button", { name: "Enregistrer" });
  await saveButton.click();
  // Wait for the server action to actually resolve (the button disables once
  // `saved === currency`) before navigating away — otherwise the in-flight
  // fetch can get aborted by the navigation.
  await expect(saveButton).toBeDisabled();
  await logToastIfPresent(page);

  await page.goto("/transactions");
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Nouvelle transaction" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Devise" })).toHaveText(/USD/);
});
