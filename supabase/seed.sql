-- ============================================================
-- FinTrack — Local development seed
-- Run with: supabase db reset
-- ============================================================

-- Seed exchange rates (updated hourly by Edge Function in production)
insert into exchange_rates (currency, rate_to_eur) values
  ('EUR', 1.0),
  ('USD', 0.92),
  ('GBP', 1.17),
  ('CHF', 1.05),
  ('JPY', 0.0062),
  ('CAD', 0.68),
  ('AUD', 0.60),
  ('DKK', 0.134),
  ('SEK', 0.088)
on conflict (currency) do update set
  rate_to_eur = excluded.rate_to_eur,
  updated_at = now();
