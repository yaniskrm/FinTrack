-- ============================================================
-- FinTrack — Local development seed
-- Run with: supabase db reset
-- ============================================================

-- Seed exchange rates for all 32 supported currencies.
-- rate_to_eur = how many EUR = 1 unit of this currency.
-- In production these are refreshed daily by the exchange-rates Edge Function
-- (source: open.er-api.com). Values below are a real snapshot for local dev.
insert into exchange_rates (currency, rate_to_eur) values
  ('EUR', 1.0),
  ('USD', 0.85602513),
  ('GBP', 1.16819564),
  ('CHF', 1.06885683),
  ('JPY', 0.00538602),
  ('CAD', 0.62170535),
  ('AUD', 0.61309560),
  ('AED', 0.23309089),
  ('BRL', 0.16531051),
  ('CNY', 0.12719245),
  ('CZK', 0.04147280),
  ('DKK', 0.13376359),
  ('HKD', 0.10918412),
  ('HUF', 0.00275578),
  ('IDR', 0.00004854),
  ('ILS', 0.28615889),
  ('INR', 0.00894384),
  ('ISK', 0.00705950),
  ('KRW', 0.00061747),
  ('MAD', 0.09268347),
  ('MXN', 0.05059300),
  ('MYR', 0.21185740),
  ('NOK', 0.09206388),
  ('NZD', 0.51179980),
  ('PHP', 0.01387435),
  ('PLN', 0.23207494),
  ('RON', 0.19032027),
  ('SEK', 0.09038466),
  ('SGD', 0.67467460),
  ('THB', 0.02619046),
  ('TRY', 0.01781524),
  ('ZAR', 0.05343793)
on conflict (currency) do update set
  rate_to_eur = excluded.rate_to_eur,
  updated_at = now();
