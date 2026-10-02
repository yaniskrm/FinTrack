import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

async function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).first().getAttribute("content");
}

test.describe("crawlers: robots.txt and sitemap", () => {
  test("robots.txt keeps bots out of the app and points to the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();

    for (const path of ["/dashboard", "/transactions", "/subscriptions", "/budget", "/goals", "/investments", "/settings", "/mfa", "/auth/"]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
    expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
  });

  test("sitemap lists the public indexable pages only", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();

    expect(body).toContain("/privacy</loc>");
    // Noindex or private pages must never be advertised.
    for (const path of ["/login", "/signup", "/dashboard", "/settings"]) {
      expect(body).not.toContain(`${path}</loc>`);
    }
  });
});

test.describe("public pages metadata", () => {
  test("login: titled, described, shareable — but not indexed", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle("Connexion · FinTrack");
    expect(await metaContent(page, 'meta[name="description"]')).toContain("FinTrack");
    expect(await metaContent(page, 'meta[name="robots"]')).toContain("noindex");
    expect(await metaContent(page, 'meta[property="og:title"]')).toBe("Connexion · FinTrack");
    expect(await metaContent(page, 'meta[property="og:image"]')).toMatch(/\/og$/);
    expect(await metaContent(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  test("privacy: the one public page that opts into indexing", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page).toHaveTitle("Politique de confidentialité · FinTrack");
    const robots = await metaContent(page, 'meta[name="robots"]');
    expect(robots).toContain("index");
    expect(robots).not.toContain("noindex");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/privacy$/);
  });

  test("the Open Graph card is a real image", async ({ request }) => {
    const res = await request.get("/og");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    expect((await res.body()).length).toBeGreaterThan(1000);
  });
});

test.describe("404 page", () => {
  test("is branded, returns 404 and offers a way home", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page introuvable · FinTrack");
    await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    // Not indexable either.
    expect(await metaContent(page, 'meta[name="robots"]')).toContain("noindex");
  });

  test("passes the accessibility scan", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});

test.describe("icons and PWA manifest", () => {
  test("manifest declares distinct 'any' and 'maskable' icons that all resolve", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as {
      id?: string;
      lang?: string;
      icons: { src: string; sizes: string; type: string; purpose?: string }[];
    };

    expect(manifest.id).toBe("/");
    expect(manifest.lang).toBe("fr");

    const any = manifest.icons.filter((i) => i.purpose === "any").map((i) => i.src);
    const maskable = manifest.icons.filter((i) => i.purpose === "maskable").map((i) => i.src);
    expect(any.length).toBeGreaterThanOrEqual(2);
    expect(maskable.length).toBeGreaterThanOrEqual(2);
    // The same rounded, transparent-cornered file must not double as maskable.
    for (const src of maskable) expect(any).not.toContain(src);

    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), icon.src).toBe(200);
      expect(iconRes.headers()["content-type"], icon.src).toContain("image/png");
    }
  });

  test("favicon.ico, the SVG icon and the Apple touch icon are served", async ({ page, request }) => {
    expect((await request.get("/favicon.ico")).status()).toBe(200);

    await page.goto("/login");
    for (const rel of ["icon", "apple-touch-icon"]) {
      const href = await page.locator(`link[rel~="${rel}"]`).first().getAttribute("href");
      expect(href, rel).toBeTruthy();
      expect((await request.get(href ?? "")).status(), rel).toBe(200);
    }
  });

  test("the service worker is never served from a stale cache", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("max-age=0");
    expect(res.headers()["service-worker-allowed"]).toBe("/");
  });
});

test.describe("authenticated app", () => {
  test("is not indexable and has no social card", async ({ page }) => {
    await signUpAndLogIn(page);
    await page.goto("/dashboard");

    await expect(page).toHaveTitle("Tableau de bord · FinTrack");
    expect(await metaContent(page, 'meta[name="robots"]')).toContain("noindex");
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  });
});
