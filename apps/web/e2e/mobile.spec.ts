import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

// Phone-sized viewport (iPhone SE class) for every test in this file. Runs in the
// regular chromium/webkit projects — no separate project, no extra CI install.
test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

const VIEWPORT_WIDTH = 375;

/**
 * Fails when the page scrolls sideways, naming the elements that stick out so the
 * failure says WHAT to fix. Elements inside a clipping/scrolling ancestor (e.g.
 * the settings tab strip) are fine: they cannot widen the document.
 */
async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const isClipped = (el: Element): boolean => {
      for (let p = el.parentElement; p && p !== document.body && p !== root; p = p.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= width + 1) {
          return true;
        }
      }
      return false;
    };
    const offenders: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.right > width + 1 && !isClipped(el)) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").split(" ").slice(0, 4).join(".")} (right=${String(Math.round(box.right))})`);
      }
    }
    return { overflow: root.scrollWidth - width, offenders: offenders.slice(0, 6) };
  });

  expect(result.overflow, `${where} scrolls sideways by ${String(result.overflow)}px: ${result.offenders.join(" | ")}`).toBeLessThanOrEqual(0);
}

test.describe("public pages on a phone", () => {
  for (const path of ["/login", "/signup", "/forgot-password", "/privacy", "/this-page-does-not-exist"]) {
    test(`${path} fits the screen`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page, path);
    });
  }
});

test.describe("the app on a phone", () => {
  test("navigate with the menu, add a transaction, and every page still fits with real-looking data", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndLogIn(page);

    // The desktop sidebar is hidden: the burger menu is the only way around.
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("link", { name: "Transactions", exact: true }).click();
    await expect(page).toHaveURL(/\/transactions/);

    // The tap target for adding is visible without any keyboard shortcut.
    await page.getByRole("button", { name: "Ajouter" }).click();
    const dialog = page.getByRole("dialog", { name: "Nouvelle transaction" });
    await expect(dialog).toBeVisible();

    await page.getByLabel("Montant").fill("123456.78");
    await page.getByLabel("Libellé").fill("Virement SEPA instantané vers Madame Marie-Hélène Dupont-Martin pour le loyer");
    const submit = dialog.getByRole("button", { name: "Ajouter" });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
    await submit.click();
    await logToastIfPresent(page);

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Virement SEPA instantané", { exact: false })).toBeVisible();
    await expectNoHorizontalOverflow(page, "/transactions (with a long label and a large amount)");

    // Content is deliberately not asserted below: only that nothing breaks the layout.
    for (const route of [
      "/dashboard",
      "/subscriptions",
      "/budget",
      "/goals",
      "/investments",
      "/transactions/import",
      "/settings/account",
      "/settings/security",
      "/settings/accounts",
      "/settings/categories",
      "/settings/notifications",
      "/settings/export",
    ]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalOverflow(page, route);
    }
  });

  test("the settings tab strip scrolls and keeps the current section visible", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/settings/export");

    // "Export" is the last of six tabs: without scrolling it would sit off-screen.
    await expect(page.getByRole("link", { name: "Export", exact: true })).toBeInViewport();
    await expectNoHorizontalOverflow(page, "/settings/export");
  });

  const DIALOGS: { route: string; opener: string; name: string }[] = [
    { route: "/transactions", opener: "Ajouter", name: "transaction" },
    { route: "/subscriptions", opener: "Ajouter", name: "recurring rule" },
    { route: "/budget", opener: "Ajouter", name: "budget" },
    { route: "/goals", opener: "Ajouter", name: "goal" },
    { route: "/investments", opener: "Ajouter", name: "investment" },
    { route: "/settings/accounts", opener: "Ajouter", name: "account" },
    { route: "/settings/categories", opener: "Ajouter", name: "category" },
    { route: "/settings/accounts", opener: "Connecter ma banque", name: "connect bank" },
  ];

  test("every dialog fits the screen and keeps its submit button reachable", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndLogIn(page);

    for (const { route, opener, name } of DIALOGS) {
      await page.goto(route);
      await page.locator("main").getByRole("button", { name: opener }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const box = await dialog.boundingBox();
      expect(box, `${name} dialog has a box`).not.toBeNull();
      expect(box?.x ?? -1, `${name} dialog: left edge`).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), `${name} dialog: right edge`).toBeLessThanOrEqual(VIEWPORT_WIDTH);
      await expectNoHorizontalOverflow(page, `${name} dialog`);

      // A tall form must scroll inside the dialog; its action stays reachable.
      const submit = dialog.locator('button[type="submit"]').first();
      if ((await submit.count()) > 0) {
        await submit.scrollIntoViewIfNeeded();
        await expect(submit, `${name} dialog: submit button`).toBeInViewport();
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });

  test("the import review fits the screen with a very long label", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/transactions/import");

    const csv = [
      "Date,Description,Montant,Devise,Statut",
      "2026-10-02,Virement SEPA instantané vers Madame Marie-Hélène Dupont-Martin pour le loyer du mois d'octobre,-1234567.89,EUR,Terminé",
      "2026-10-03,Courses,-87.45,EUR,Terminé",
      "2026-10-04,Salaire,3200.00,EUR,Terminé",
    ].join("\n");
    await page.locator('input[type="file"]').setInputFiles({
      name: "releve.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });

    await expect(page.getByText("3 lignes détectées", { exact: false })).toBeVisible();
    await expectNoHorizontalOverflow(page, "import review table");
  });
});
