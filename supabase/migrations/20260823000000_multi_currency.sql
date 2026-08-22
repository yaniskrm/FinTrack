-- ============================================================
-- FinTrack — Phase 4: multi-currency
-- ============================================================

-- ─── Stale-rate flag on transactions ────────────────────────
-- Set when amount_eur was frozen using an exchange rate older than the
-- freshness window (fallback path when the rate API was unavailable).
alter table transactions
  add column rate_approximate boolean not null default false;

comment on column transactions.rate_approximate is
  'True when amount_eur was frozen from a stale exchange rate (rate API fallback).';

-- ─── Bootstrap the 32 supported currencies ──────────────────
-- Guarantees the transactions.currency FK is satisfied in production from the
-- first deploy, before the exchange-rates Edge Function has ever run. These are
-- initial values only; the daily cron refreshes them. EUR already exists.
insert into exchange_rates (currency, rate_to_eur) values
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
on conflict (currency) do nothing;
