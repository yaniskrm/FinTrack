import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// NEXT_PUBLIC_TURNSTILE_SITE_KEY is inlined at *build* time, so this spec must
// run with the same value the server was built with. CI builds without it (no
// CAPTCHA — the "disabled" block runs); to exercise the "enabled" block locally:
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA  (Cloudflare's
//   always-pass test key) for both `next build` and `playwright test`.
// Cloudflare's script is always mocked: no network, no real challenge.
const CAPTCHA_ENABLED = Boolean(process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
const CLOUDFLARE = "https://challenges.cloudflare.com";

/**
 * Replaces Cloudflare's api.js with a stand-in that never solves by itself:
 * the test decides when a token "arrives" via `window.__solveTurnstile`.
 */
async function mockTurnstile(page: Page): Promise<void> {
  await page.route("**/turnstile/v0/api.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
        (function () {
          var callback = null;
          window.__solveTurnstile = function (token) { if (callback) callback(token); };
          window.turnstile = {
            render: function (el, options) {
              callback = options.callback;
              el.setAttribute("data-mock-widget", "1");
              return "mock-widget";
            },
            reset: function () {},
            remove: function () {},
          };
        })();
      `,
    }),
  );
}

async function solve(page: Page, token: string): Promise<void> {
  await page.waitForFunction(() => typeof (window as unknown as { __solveTurnstile?: unknown }).__solveTurnstile === "function");
  await page.evaluate((t) => {
    (window as unknown as { __solveTurnstile: (token: string) => void }).__solveTurnstile(t);
  }, token);
}

test.describe("captcha disabled (no site key at build time)", () => {
  test.skip(CAPTCHA_ENABLED, "built with a Turnstile site key");

  for (const [path, button] of [
    ["/login", "Se connecter"],
    ["/signup", "Créer mon compte"],
    ["/forgot-password", "Envoyer le lien"],
  ] as const) {
    test(`${path} has no widget and submit is not gated`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("group", { name: "Vérification anti-robot" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: button })).toBeEnabled();
    });
  }

  test("CSP does not open Cloudflare origins", async ({ request }) => {
    const csp = (await request.get("/login")).headers()["content-security-policy"] ?? "";
    expect(csp).not.toContain("challenges.cloudflare.com");
    expect(csp).not.toContain("frame-src");
  });
});

test.describe("captcha enabled (site key at build time)", () => {
  test.skip(!CAPTCHA_ENABLED, "built without a Turnstile site key");

  test("CSP allows Cloudflare's script, frame and callbacks — and nothing else new", async ({ request }) => {
    const csp = (await request.get("/login")).headers()["content-security-policy"] ?? "";
    const directive = (name: string): string => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

    expect(directive("script-src")).toContain(CLOUDFLARE);
    expect(directive("frame-src")).toBe(`frame-src ${CLOUDFLARE}`);
    expect(directive("connect-src")).toContain(CLOUDFLARE);
    // The strict script policy must survive.
    expect(directive("script-src")).not.toContain("'unsafe-inline'");
    expect(directive("script-src")).not.toContain("'unsafe-eval'");
  });

  for (const path of ["/login", "/signup", "/forgot-password"]) {
    test(`${path} renders the widget and gates submit on a token`, async ({ page }) => {
      await mockTurnstile(page);
      await page.goto(path);

      await expect(page.getByRole("group", { name: "Vérification anti-robot" })).toBeVisible();
      await expect(page.locator("[data-mock-widget]")).toHaveCount(1);

      const submit = page.locator("form button[type=submit]");
      await expect(submit).toBeDisabled();

      await solve(page, "MOCK-TOKEN");
      await expect(submit).toBeEnabled();
    });
  }

  test("login sends the token to the server action, then asks for a fresh one", async ({ page }) => {
    await mockTurnstile(page);
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@fintrack.local");
    await page.getByLabel("Mot de passe", { exact: true }).fill("not-the-password");
    await solve(page, "MOCK-TOKEN-LOGIN-123");

    const request = page.waitForRequest((r) => r.method() === "POST" && (r.postData() ?? "").includes("MOCK-TOKEN-LOGIN-123"));
    await page.getByRole("button", { name: "Se connecter" }).click();
    await request;

    // Wrong credentials: an error is shown and the spent token is dropped, so
    // submitting again is blocked until the widget issues a new one.
    await expect(page.locator("p.text-destructive")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeDisabled();

    expect(violations).toEqual([]);
  });
});
