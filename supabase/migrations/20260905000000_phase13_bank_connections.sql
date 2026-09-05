-- ============================================================
-- FinTrack — Phase 13: Open Banking (Enable Banking)
-- ============================================================
-- `bank_connections` tracks a PSU's consent to let FinTrack read one
-- account at one ASPSP (bank), via Enable Banking's aggregation API.
--
-- Deliberately NO `access_token`/`refresh_token` columns, despite that
-- being the generic OAuth shape: Enable Banking doesn't issue per-session
-- bearer tokens at all. Every API call (including ones made months after
-- consent) is authenticated by a *fresh* RS256 JWT signed application-side
-- with our own private key (never stored in the DB, only in
-- ENABLE_BANKING_PRIVATE_KEY_BASE64 — see CLAUDE.md). `session_id` merely
-- scopes *which* accounts a given consent covers; by itself it grants
-- nothing without our app's private key also signing the request. This
-- is materially simpler and safer than a real OAuth flow: there is no
-- per-connection secret to encrypt or rotate.
--
-- `status = 'pending'` exists only for the brief window between starting
-- the redirect-based consent (POST /auth) and the bank redirecting the
-- user back to /auth/callback/banking with a `code` — a real row is
-- needed at that point purely to correlate the callback's `state` back to
-- a workspace/aspsp, since Enable Banking's callback carries no other
-- context. It either becomes 'active' (code exchanged for a session) or
-- is left orphaned (abandoned consent — cleaned up opportunistically, not
-- security-sensitive since it holds no credential).

create type bank_connection_status as enum ('pending', 'active', 'expired', 'revoked');

create table bank_connections (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  -- Nullable: a connection exists (and can be synced) before the user has
  -- decided which FinTrack account it feeds, or while creating a new one.
  account_id          uuid references accounts(id) on delete set null,
  aspsp_name          text not null,
  aspsp_country       text not null,
  -- Correlates the /auth/callback/banking redirect back to this row.
  -- Only meaningful while status = 'pending'; left in place afterwards as
  -- an audit trail of which consent request produced this connection.
  state               uuid not null default gen_random_uuid(),
  -- Enable Banking's own identifiers — opaque to us, never secrets by
  -- themselves (see note above).
  session_id          uuid,
  enable_account_uid  uuid,
  iban                text,
  currency            character(3) references exchange_rates(currency),
  status              bank_connection_status not null default 'pending',
  valid_until         timestamptz,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index bank_connections_workspace_id_idx on bank_connections(workspace_id);
create unique index bank_connections_state_idx on bank_connections(state);
create index bank_connections_account_id_idx on bank_connections(account_id) where account_id is not null;

alter table bank_connections enable row level security;

create policy "bank_connections: workspace members can read"
  on bank_connections for select
  using (public.is_workspace_member(workspace_id));

create policy "bank_connections: workspace members can insert"
  on bank_connections for insert
  with check (public.is_workspace_member(workspace_id));

create policy "bank_connections: workspace members can update"
  on bank_connections for update
  using (public.is_workspace_member(workspace_id));

create policy "bank_connections: workspace members can delete"
  on bank_connections for delete
  using (public.is_workspace_member(workspace_id));

-- Same AAL2 backstop as every other financial table (20260822000000_mfa_aal2_rls.sql)
-- — a live bank consent is at least as sensitive as the transactions it feeds.
create policy "aal2 required when mfa enrolled"
  on bank_connections as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create trigger set_updated_at before update on bank_connections
  for each row execute procedure public.set_updated_at();
