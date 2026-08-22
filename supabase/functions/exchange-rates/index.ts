/**
 * Edge Function: exchange-rates
 * Cron: daily (~17:00 CET) — refreshes exchange_rates in the database.
 *
 * Source: open.er-api.com (free, keyless, ~160 currencies incl. MAD/AED).
 * Uses the service_role key → bypasses RLS. No external API key needed.
 *
 * Fallback: if the fetch fails or returns a non-success payload, we do NOT
 * touch the table — the last known rates are kept. Transactions created while
 * rates are stale are flagged `rate_approximate` by the app, not here.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Keep in sync with SUPPORTED_CURRENCIES in packages/core (Deno can't import it).
const SUPPORTED_CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD", "AED", "AFN", "ALL",
  "AMD", "ANG", "AOA", "ARS", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN",
  "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN",
  "BZD", "CDF", "CLF", "CLP", "CNH", "CNY", "COP", "CRC", "CUP", "CVE",
  "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "FJD", "FKP",
  "FOK", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD",
  "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR",
  "ISK", "JEP", "JMD", "JOD", "KES", "KGS", "KHR", "KID", "KMF", "KRW",
  "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD",
  "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK",
  "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
  "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD",
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE",
  "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT",
  "TND", "TOP", "TRY", "TTD", "TVD", "TWD", "TZS", "UAH", "UGX", "UYU",
  "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XCG", "XOF", "XPF",
  "YER", "ZAR", "ZMW", "ZWG", "ZWL",
] as const;

const RATES_URL = "https://open.er-api.com/v6/latest/EUR";

interface RatesResponse {
  result: string;
  rates: Record<string, number>;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  let payload: RatesResponse;
  try {
    const response = await fetch(RATES_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }
    payload = (await response.json()) as RatesResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // Fallback: keep the last known rates, report the failure.
    return json({ error: "rate_fetch_failed", detail: message, updated: 0 }, 502);
  }

  if (payload.result !== "success") {
    return json({ error: "rate_provider_error", updated: 0 }, 502);
  }

  const now = new Date().toISOString();
  const updates: { currency: string; rate_to_eur: number; updated_at: string }[] = [];
  const missing: string[] = [];

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency === "EUR") {
      updates.push({ currency, rate_to_eur: 1, updated_at: now });
      continue;
    }
    const perEur = payload.rates[currency];
    if (typeof perEur !== "number" || perEur <= 0) {
      missing.push(currency);
      continue;
    }
    updates.push({ currency, rate_to_eur: 1 / perEur, updated_at: now });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase
    .from("exchange_rates")
    .upsert(updates, { onConflict: "currency" });

  if (error) {
    return json({ error: "db_upsert_failed", detail: error.message, updated: 0 }, 500);
  }

  return json({ updated: updates.length, missing }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
