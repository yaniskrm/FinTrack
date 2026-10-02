import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

// playwright.config.ts starts the server with CSP_ENFORCE=true, so every
// violation here is a page that would actually break — not just a console
// warning — once production flips the same switch.

/** Records every `securitypolicyviolation` event for the lifetime of the page. */
async function trackCspViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      w.__csp.push(`${e.violatedDirective} blocked=${e.blockedURI} sample=${e.sample.slice(0, 80)}`);
    });
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

test.describe("security headers", () => {
  test("every response carries the static hardening headers", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();

    expect(h["strict-transport-security"]).toContain("max-age=63072000");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("CSP is nonce-based, forbids framing and rotates the nonce per request", async ({ request }) => {
    const first = (await request.get("/login")).headers()["content-security-policy"] ?? "";
    const second = (await request.get("/login")).headers()["content-security-policy"] ?? "";

    expect(first).toContain("frame-ancestors 'none'");
    expect(first).toContain("object-src 'none'");
    expect(first).toContain("base-uri 'self'");

    const scriptSrc = first.split("; ").find((d) => d.startsWith("script-src")) ?? "";
    expect(scriptSrc).toMatch(/'nonce-[^']+'/);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");

    const nonceOf = (csp: string): string | undefined => /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonceOf(first)).toBeDefined();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });
});

test.describe("CSP does not break the app", () => {
  for (const path of ["/login", "/signup", "/forgot-password", "/privacy"]) {
    test(`public page ${path}`, async ({ page }) => {
      const violations = await trackCspViolations(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      // next-themes' inline script carries the nonce: it must have run.
      await expect(page.locator("html")).toHaveClass(/light|dark/);
      expect(await violations()).toEqual([]);
    });
  }

  test("authenticated pages and dialogs", async ({ page }) => {
    const violations = await trackCspViolations(page);
    await signUpAndLogIn(page);

    const routes = [
      "/dashboard",
      "/transactions",
      "/transactions/import",
      "/subscriptions",
      "/budget",
      "/goals",
      "/investments",
      "/settings/account",
      "/settings/security",
      "/settings/accounts",
      "/settings/categories",
      "/settings/notifications",
      "/settings/export",
    ];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }

    // A Radix dialog + a toast exercise the inline-style paths.
    await page.goto("/transactions");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible();

    expect(await violations()).toEqual([]);
  });
});
