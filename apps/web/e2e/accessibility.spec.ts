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

  test("settings: account, security, accounts, categories, notifications, export", async ({ page }) => {
    await signUpAndLogIn(page);
    for (const path of [
      "/settings/account",
      "/settings/security",
      "/settings/accounts",
      "/settings/categories",
      "/settings/notifications",
      "/settings/export",
    ]) {
      await page.goto(path);
      await expectNoViolations(page);
    }
  });

  test("category dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/categories");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("account dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/accounts");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoViolations(page);
  });

  test("connect-bank dialog", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/accounts");
    await page.getByRole("button", { name: "Connecter ma banque" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Without ENABLE_BANKING_* configured (always true in CI), opening this
    // dialog fires an error toast immediately. Sonner's enter animation
    // blends through low-contrast intermediate colors — axe caught a real
    // *transitional* frame, not the toast's settled state (confirmed: every
    // observed failure had a different, grayish blended color, never the
    // same fixed pair twice). A fixed `waitForTimeout` was still flaky
    // under CI-like load (~25% failure rate even at 500ms), so wait for the
    // toast's actual Web Animations to finish instead of guessing a delay.
    const toast = page.locator("[data-sonner-toast]").first();
    const toastAppeared = await toast
      .waitFor({ state: "visible", timeout: 2000 })
      .then(() => true)
      .catch(() => false);
    if (toastAppeared) {
      await toast
        .evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)))
        .catch(() => {});
    }
    await expectNoViolations(page);
  });

  test("import page (with review table)", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/transactions/import");
    await page.setInputFiles("#import-file", {
      name: "releve.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Date,Description,Amount\n2026-08-01,Courses,-45.90"),
    });
    await expect(page.getByText("1 ligne détectée")).toBeVisible();
    await expectNoViolations(page);
  });
});
