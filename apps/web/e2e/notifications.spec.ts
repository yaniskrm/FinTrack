import { expect, test } from "@playwright/test";
import { signUpAndLogIn } from "./helpers";

// The actual subscribe flow (Notification permission → PushManager.subscribe)
// can't be driven end-to-end here: Chromium refuses the Push API in the
// incognito-style context Playwright always uses (confirmed locally — throws
// "Push API in incognito mode" even with `context.grantPermissions`), and
// WebKit's `grantPermissions(["notifications"])` doesn't actually flip
// `Notification.permission` away from "default" under Playwright either
// (also confirmed locally). Both are Playwright/browser platform limits, not
// app bugs — the Edge Function side of the pipeline (VAPID signing, sending,
// pruning expired subscriptions) is covered separately by manual testing
// against `supabase functions serve` with a real recurring_rule + a real
// subscription row (see CLAUDE.md). This test covers what *is* reliably
// testable: the settings page renders the correct initial (unsubscribed)
// state and the button is reachable.
test("notifications settings page shows the enable button", async ({ page }) => {
  await signUpAndLogIn(page);
  await page.goto("/settings/notifications");

  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activer les notifications" })).toBeVisible();
});
