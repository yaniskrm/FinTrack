-- ============================================================
-- FinTrack — v1.1: Web Push subscriptions + daily notification schedule
-- ============================================================
-- `push_subscriptions` did not actually exist yet (referenced in docs and in
-- the send-notifications stub's join, but never migrated) — this creates it
-- for real, plus the pg_cron schedule that calls send-notifications daily.
--
-- One row per browser/device subscription. Personal, not shared financial
-- data, so RLS scopes strictly to the owning user (not the whole workspace,
-- unlike every other table) — `workspace_id` is kept for the Edge Function's
-- service-role lookup ("who in this workspace to notify for this
-- recurring_rule"), not for RLS.

create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth_key      text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_workspace_id_idx on push_subscriptions(workspace_id);
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions: owner can read"
  on push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions: owner can insert"
  on push_subscriptions for insert
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));

create policy "push_subscriptions: owner can delete"
  on push_subscriptions for delete
  using (user_id = auth.uid());

-- ─── Daily schedule for send-notifications ───────────────────
-- Same pattern as 20260823000001_schedule_exchange_rates.sql: reads the
-- function URL + service_role key from Vault, no-ops locally until those
-- secrets are set. 08:00 UTC — the spec's "8h locale" is per-user timezone,
-- out of scope for v1.1 (documented simplification, see CLAUDE.md).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-notifications',
  '0 8 * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
    ) || '/functions/v1/send-notifications',
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
