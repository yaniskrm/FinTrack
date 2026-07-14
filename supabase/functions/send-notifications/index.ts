/**
 * Edge Function: send-notifications
 * Cron: daily at 08:00 — sends push notifications for upcoming recurring expenses.
 * Notifies J-3, J-1, J0 (3 days before, 1 day before, day of).
 *
 * Phase 5 will implement this fully.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expoPushToken = Deno.env.get("EXPO_PUSH_ACCESS_TOKEN");

  if (!supabaseUrl || !serviceRoleKey || !expoPushToken) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const today = new Date();

  const notificationDays = [0, 1, 3]; // J0, J-1, J-3
  const targetDates = notificationDays.map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  });

  const { data: rules, error } = await supabase
    .from("recurring_rules")
    .select("*, workspace_members(user_id)")
    .in("next_occurrence", targetDates);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // TODO (Phase 5): send Expo push notifications for each rule/user combo
  console.log(`Found ${String(rules?.length ?? 0)} rules to notify`);

  return new Response(
    JSON.stringify({ notified: rules?.length ?? 0 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
