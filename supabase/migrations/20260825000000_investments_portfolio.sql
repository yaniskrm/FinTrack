-- ============================================================
-- FinTrack — Phase 8: Investments portfolio
-- ============================================================
-- Extends the existing (share-based) `investments` table rather than
-- replacing it: `quantity` / `buy_price_eur` / `current_price_eur` already
-- support precise per-position P&L and are live/shipped. This migration
-- adds the fields the functional spec asks for (asset class, broker,
-- opening date, notes) plus what the roadmap requires but neither the live
-- schema nor the spec drafts had: a position lifecycle (open → closed, for
-- realized P&L) and a valuation history table (for the time-series chart).
--
-- `montant investi` = quantity * buy_price_eur, `valeur actuelle` =
-- quantity * current_price_eur — both derived, not stored twice.

-- ─── Asset type ──────────────────────────────────────────────

create type investment_type as enum ('etf', 'stock', 'scpi', 'savings', 'crypto', 'other');

-- ─── Extend investments: classification + lifecycle ─────────

alter table investments
  add column asset_type    investment_type not null default 'other',
  add column broker        text,
  add column opened_at     date,
  add column notes         text,
  add column closed_at     date,
  add column sale_price_eur numeric(18, 2),
  add constraint investments_sale_price_positive check (sale_price_eur is null or sale_price_eur >= 0),
  add constraint investments_closed_state_consistent check ((closed_at is null) = (sale_price_eur is null));

comment on column investments.closed_at is 'Set together with sale_price_eur when a position is sold/closed — realized P&L. NULL while the position is open (unrealized P&L against current_price_eur).';

-- ─── Valuation history (for the "courbe temporelle") ─────────

create table investment_valuations (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  investment_id  uuid not null references investments(id) on delete cascade,
  price_eur      numeric(18, 2) not null check (price_eur >= 0),
  recorded_at    date not null default current_date,
  created_at     timestamptz not null default now()
);

create index investment_valuations_workspace_id_idx on investment_valuations(workspace_id);
create index investment_valuations_investment_recorded_idx on investment_valuations(investment_id, recorded_at);

alter table investment_valuations enable row level security;

create policy "investment_valuations: workspace members can read"
  on investment_valuations for select
  using (public.is_workspace_member(workspace_id));

create policy "investment_valuations: workspace members can insert"
  on investment_valuations for insert
  with check (public.is_workspace_member(workspace_id));

create policy "investment_valuations: workspace members can delete"
  on investment_valuations for delete
  using (public.is_workspace_member(workspace_id));

-- Same AAL2 backstop as every other financial table (20260822000000_mfa_aal2_rls.sql).
create policy "aal2 required when mfa enrolled"
  on investment_valuations as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());
