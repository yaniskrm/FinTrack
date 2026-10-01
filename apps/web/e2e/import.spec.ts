import { expect, test } from "@playwright/test";
import { gotoAndWaitVisible, logToastIfPresent, signUpAndLogIn } from "./helpers";

// /transactions defaults to the *current* calendar month (see
// transactions-view.tsx) — hardcoding a past month here silently broke this
// suite the moment real time crossed into a new month (found while
// validating Phase 13, unrelated to it: the fixture used August 2026 dates,
// which stopped being "this month" on 2026-09-01). A days-ago offset from
// "today" isn't enough either: near the 1st/2nd of a month it wraps into the
// *previous* month, which stopped being "this month" too (found validating
// the DBS import work, again unrelated to it — today happened to be the
// 1st). Nothing in the schema or the view requires a date to be in the
// past, so pin to a fixed day-of-month instead — always inside the current
// month, regardless of what day "today" actually is.
function isoDate(dayOfMonth: number): string {
  const d = new Date();
  d.setDate(dayOfMonth);
  return d.toISOString().slice(0, 10);
}

const SAMPLE_CSV = `Date,Description,Amount\n${isoDate(1)},Courses E2E,-45.90\n${isoDate(2)},Salaire E2E,2000.00`;

// DBS (Singapore) export shape — see CLAUDE.md Phase "DBS import" and
// packages/core/src/import/dbs.ts. Synthetic data only (fake card/account
// numbers), covering the 3-legitimate-same-day-duplicates case that
// motivated external_ref-based dedup (ADR-021 amendment).
const DBS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dbsDate(dayOfMonth: number): string {
  const d = new Date();
  d.setDate(dayOfMonth);
  return `${String(d.getDate()).padStart(2, "0")} ${DBS_MONTHS[d.getMonth()]} ${String(d.getFullYear())}`;
}

const DBS_PREAMBLE = [
  '"Account Details For:","My Account 999-99999-9",,,,,,,,,,',
  '"Statement as at:","01 Oct 2026",,,,,,,,,,',
  '"",,,,,,,,,,,',
  '"Currency:","SGD - Singapore Dollar",,,,,,,,,,',
  '"",,,,,,,,,,,',
  '"Available Balance:","SGD 999.99",,,,,,,,,,',
  '"Ledger Balance:","SGD 999.99",,,,,,,,,,',
  '"",,,,,,,,,,,',
].join("\n");
const DBS_HEADER =
  '"Transaction Date","Value Date","Statement Code","Description","Supplementary Code","Supplementary Code Description","Client Reference","Additional Reference","Status","Currency","Debit Amount","Credit Amount"';

function dbsHelloRideRow(ref: string): string {
  const date = dbsDate(1);
  return `"${date}","","POS","BAT HelloRide E2E SINGAPORE SGP 28SEP 1234-5678-9012-3456 ${ref}","BAT HelloRide E2E SINGAPORE SGP       28SEP","Point-of-Sale Transaction","1234-5678-9012-3456","${ref}","Settled","SGD",1,""`;
}

const DBS_CSV = [
  DBS_PREAMBLE,
  DBS_HEADER,
  dbsHelloRideRow("000000000000001"),
  dbsHelloRideRow("000000000000002"),
  dbsHelloRideRow("000000000000003"),
].join("\n");

test("a user can import a bank statement CSV", async ({ page, browserName }) => {
  // WebKit-only flake, investigated thoroughly in Phase 12 rather than
  // papered over: the Server Action insert commits immediately (verified
  // directly against Postgres via psql), yet the very next Server Component
  // read on /transactions sometimes still renders 0 rows when navigation
  // follows the insert almost instantly — reproduced again today even with
  // a bounded reload-and-retry loop (gotoAndWaitVisible, 10 attempts).
  // Chromium remains unaffected across many runs (re-verified while
  // building Phase 13 — a separate, since-fixed bug involving hardcoded
  // fixture dates falling out of the current-month default view was
  // initially mistaken for a regression of this same flake, see CLAUDE.md).
  test.skip(browserName === "webkit", "webkit-only flake — see comment above, tracked in CLAUDE.md");

  await signUpAndLogIn(page);

  await page.goto("/transactions/import");
  await page.setInputFiles("#import-file", {
    name: "releve.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(SAMPLE_CSV),
  });

  await expect(page.getByText("2 lignes détectées")).toBeVisible();
  await page.getByRole("button", { name: /Importer 2/ }).click();
  await logToastIfPresent(page);

  await gotoAndWaitVisible(page, "/transactions", "Courses E2E");
  await expect(page.getByText("Salaire E2E")).toBeVisible();
});

test("a user can exclude a row before importing", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "webkit-only flake — see comment in the test above, tracked in CLAUDE.md");

  await signUpAndLogIn(page);

  await page.goto("/transactions/import");
  await page.setInputFiles("#import-file", {
    name: "releve.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(SAMPLE_CSV),
  });

  await expect(page.getByText("2 lignes détectées")).toBeVisible();
  await page.getByRole("checkbox", { name: "Inclure Courses E2E" }).uncheck();
  await page.getByRole("button", { name: /Importer 1/ }).click();
  await logToastIfPresent(page);

  await gotoAndWaitVisible(page, "/transactions", "Salaire E2E");
  await expect(page.getByText("Courses E2E")).toBeHidden();
});

test("DBS import: 3 legitimate same-day same-amount rows are all kept, then all excluded (certain duplicate) on re-import", async ({
  page,
  browserName,
}) => {
  test.skip(browserName === "webkit", "webkit-only flake — see comment in the first test above, tracked in CLAUDE.md");

  await signUpAndLogIn(page);

  await page.goto("/transactions/import");
  await page.setInputFiles("#import-file", {
    name: "transaction_history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(DBS_CSV),
  });

  await expect(page.getByText("3 lignes détectées")).toBeVisible();
  // First import: nothing exists yet, no row is a duplicate of anything.
  await expect(page.getByText("déjà importé")).toHaveCount(0);
  await expect(page.getByText("doublon probable")).toHaveCount(0);
  await page.getByRole("button", { name: /Importer 3/ }).click();
  await logToastIfPresent(page);

  // "HelloRide E2E" matches all 3 rows at once — gotoAndWaitVisible's
  // isVisible() check needs a single match (strict mode), so wait on the
  // unique header count instead and assert the repeated label separately.
  await gotoAndWaitVisible(page, "/transactions", "3 opérations");
  await expect(page.getByText("HelloRide E2E")).toHaveCount(3);

  // Re-importing the exact same file: each row's external_ref now matches
  // an already-imported transaction on this account — a certain duplicate,
  // auto-excluded with no checkbox (never just a "probable" guess).
  await page.goto("/transactions/import");
  await page.setInputFiles("#import-file", {
    name: "transaction_history.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(DBS_CSV),
  });

  await expect(page.getByText("3 lignes détectées")).toBeVisible();
  await expect(page.getByText("déjà importé")).toHaveCount(3);
  await expect(page.getByText("0 sélectionnée")).toBeVisible();
  await expect(page.getByRole("button", { name: /Importer/ })).toBeDisabled();
});

test("shows a clear error for a file with no recognizable columns", async ({ page }) => {
  await signUpAndLogIn(page);

  await page.goto("/transactions/import");
  await page.setInputFiles("#import-file", {
    name: "releve.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Foo,Bar\n1,2"),
  });

  await expect(page.getByText("Colonnes non reconnues", { exact: false })).toBeVisible();
});
