import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { logToastIfPresent, signUpAndLogIn } from "./helpers";

test.describe("data export", () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndLogIn(page);
    // Seed one transaction so the CSV/PDF exports have a row to prove out.
    await page.goto("/transactions");
    await page.keyboard.press("n");
    await page.getByLabel("Montant").fill("15");
    await page.getByLabel("Libellé").fill("Café E2E");
    await page.getByRole("dialog").getByRole("button", { name: "Ajouter" }).click();
    await logToastIfPresent(page);
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/settings/export");
  });

  test("downloads a non-empty CSV of transactions", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Télécharger le CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^fintrack-transactions-.*\.csv$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    const content = readFileSync(path ?? "", "utf-8");
    expect(content).toContain("Date,Libellé,Catégorie");
    expect(content).toContain("Café E2E");
  });

  test("downloads a full JSON backup", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Télécharger le JSON" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^fintrack-sauvegarde-.*\.json$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    const parsed: unknown = JSON.parse(readFileSync(path ?? "", "utf-8"));
    expect(parsed).toHaveProperty("exportedAt");
    expect(parsed).toHaveProperty("transactions");

    // A backup must be restorable and complete: every transaction points at an
    // account, and every workspace has at least its default account.
    const backup = parsed as {
      userEmail: string | null;
      profile: { default_currency: string } | null;
      accounts: unknown[];
      bankConnections: Record<string, unknown>[];
    };
    expect(backup.accounts.length).toBeGreaterThan(0);
    expect(backup.profile?.default_currency).toBeTruthy();
    expect(backup.userEmail).toMatch(/@/);
    expect(Array.isArray(backup.bankConnections)).toBe(true);
    for (const connection of backup.bankConnections) {
      expect(connection).not.toHaveProperty("session_id");
    }
  });

  test("downloads a monthly PDF report", async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Télécharger le PDF" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^fintrack-rapport-.*\.pdf$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = readFileSync(path ?? "");
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
