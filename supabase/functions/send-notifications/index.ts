/**
 * Edge Function: send-notifications
 * Cron: daily at 08:00 UTC (see 20260826000000_push_subscriptions_and_schedule.sql)
 * — sends Web Push notifications for upcoming recurring transactions.
 * Notifies J-3, J-1, J0 (3 days before, 1 day before, day of).
 *
 * Web Push (VAPID), not Expo push — this is the web app, not the mobile one.
 * Uses the service_role key → bypasses RLS, reads every due rule + every
 * subscription of every accepted member of that rule's workspace.
 *
 * A subscription that the push service reports as gone (404/410 — the user
 * uninstalled/unsubscribed) is deleted so it isn't retried forever.
 *
 * Web Push crypto (ECDH + VAPID ES256 JWT) needs Node's `crypto.ECDH`, which
 * the Edge Runtime doesn't implement — the `web-push` npm package throws
 * "Not implemented: crypto.ECDH" here (confirmed locally via
 * `supabase functions serve`). `@negrel/webpush` is built on the Web Crypto
 * API (`crypto.subtle`) instead, which Deno does implement — see
 * https://github.com/negrel/webpush. VAPID keys for this library are JWK
 * pairs (`generateVapidKeys`/`exportVapidKeys` in its own `vapid.ts`), not
 * the raw base64url string pair the npm CLI generates — VAPID_PUBLIC_KEY /
 * VAPID_PRIVATE_KEY below are each a JSON-stringified JWK. Generate a fresh
 * pair with `webpush.generateVapidKeys()` + `webpush.exportVapidKeys()` from
 * this same module (see CLAUDE.md for the one-off local recipe) — the
 * client-side NEXT_PUBLIC_VAPID_PUBLIC_KEY is the separate, standard
 * `exportApplicationServerKey()` base64url string.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://raw.githubusercontent.com/negrel/webpush/master/mod.ts";

interface RecurringRuleRow {
  id: string;
  workspace_id: string;
  label: string;
  amount: number;
  currency: string;
  next_occurrence: string;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  workspace_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

function offsetFromToday(dateStr: string, today: Date): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = target.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round(diffMs / 86_400_000);
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

function notificationFor(rule: RecurringRuleRow, offset: number): { title: string; body: string } {
  const amount = formatAmount(rule.amount, rule.currency);
  const date = new Date(`${rule.next_occurrence}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
  });

  if (offset === 0) {
    return { title: "Prélèvement aujourd'hui", body: `${rule.label} a été prélevé aujourd'hui — ${amount}` };
  }
  if (offset === 1) {
    return { title: "Prélèvement demain ⏰", body: `${rule.label} sera prélevé demain (${date}) — ${amount}` };
  }
  return { title: "Rappel de prélèvement", body: `${rule.label} sera prélevé le ${date} — ${amount}` };
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({ error: "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/VAPID_* env vars" }, 500);
  }

  const vapidKeys = await webpush.importVapidKeys(
    { publicKey: JSON.parse(vapidPublicKey), privateKey: JSON.parse(vapidPrivateKey) },
    { extractable: false },
  );
  const appServer = await webpush.ApplicationServer.new({
    contactInformation: vapidSubject,
    vapidKeys,
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date();
  const targetDates = [0, 1, 3].map((offset) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });

  const { data: rules, error: rulesError } = await supabase
    .from("recurring_rules")
    .select("id, workspace_id, label, amount, currency, next_occurrence")
    .in("next_occurrence", targetDates)
    .returns<RecurringRuleRow[]>();

  if (rulesError) {
    return json({ error: "rules_query_failed", detail: rulesError.message }, 500);
  }

  let sent = 0;
  let expiredRemoved = 0;
  const failures: string[] = [];

  for (const rule of rules ?? []) {
    const offset = offsetFromToday(rule.next_occurrence, today);
    const notification = notificationFor(rule, offset);

    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", rule.workspace_id)
      .not("accepted_at", "is", null);

    if (membersError || !members || members.length === 0) continue;

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, workspace_id, endpoint, p256dh, auth_key")
      .in(
        "user_id",
        members.map((m) => m.user_id),
      )
      .returns<PushSubscriptionRow[]>();

    for (const sub of subscriptions ?? []) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        });
        await subscriber.pushTextMessage(JSON.stringify(notification), {});
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number; status?: number }).statusCode
          ?? (err as { status?: number }).status;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          expiredRemoved += 1;
        } else {
          failures.push(`${sub.id}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }
    }
  }

  return json({ rulesChecked: rules?.length ?? 0, sent, expiredRemoved, failures }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
