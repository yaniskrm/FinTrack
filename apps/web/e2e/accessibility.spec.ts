import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test.describe("accessibility (axe, WCAG 2 A/AA)", () => {
  test("login page", async ({ page }) => {
    await page.goto("/login");
    await expectNoViolations(page);
  });

  test("signup page", async ({ page }) => {
    await page.goto("/signup");
    await expectNoViolations(page);
  });

  test("dashboard (empty state)", async ({ page }) => {
    await signUpAndLogIn(page);
    await expectNoViolations(page);
  });

  test("quick-entry transaction dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/transactions");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("budget dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/budget");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("goal dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/goals");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("settings: account, security, export", async ({ page }) => {
    await signUpAndLogIn(page);
    for (const path of ["/settings/account", "/settings/security", "/settings/export"]) {
      await page.goto(path);
      await expectNoViolations(page);
    }
  });
});
