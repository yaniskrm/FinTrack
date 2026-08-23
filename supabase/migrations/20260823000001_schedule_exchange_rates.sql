-- ============================================================
-- FinTrack — Schedule the exchange-rates Edge Function (daily)
-- ============================================================
-- Runs the exchange-rates function once a day at 16:00 UTC (~17:00 CET).
-- The publication is daily, so hourly would be wasteful.
--
-- The function URL and service_role key are read from Supabase Vault, NOT
-- hardcoded — set them once per environment:
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>',        'service_role_key');
--
-- Until those secrets exist the job simply no-ops (the inner query returns
-- null), so this migration applies cleanly in local dev where they're unset.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'refresh-exchange-rates',
  '0 16 * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
    ) || '/functions/v1/exchange-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
  $$
);
