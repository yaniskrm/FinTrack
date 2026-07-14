/**
 * Edge Function: exchange-rates
 * Cron: every hour — updates exchange rates in the database.
 *
 * Uses service_role key → bypasses RLS.
 * The API key is stored in Supabase secrets (EXCHANGE_RATE_API_KEY),
 * NEVER in code or client-accessible storage.
 *
 * Phase 3 will implement this fully.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPPORTED_CURRENCIES = ["USD", "GBP", "CHF", "JPY", "CAD", "AUD", "DKK", "SEK"] as const;

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("EXCHANGE_RATE_API_KEY");

  if (!supabaseUrl || !serviceRoleKey || !apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch rates from external API (Phase 3 will wire this up)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/EUR`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${String(response.status)}`);
    }

    const data = (await response.json()) as { rates: Record<string, number> };

    const updates = SUPPORTED_CURRENCIES.map((currency) => ({
      currency,
      rate_to_eur: 1 / (data.rates[currency] ?? 1),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("exchange_rates")
      .upsert(updates, { onConflict: "currency" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ updated: updates.length, currencies: SUPPORTED_CURRENCIES }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
