-- ============================================================
-- FinTrack — Initial schema
-- Phase 0: all tables + RLS policies
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- full-text search on transactions

-- ─── Enums ──────────────────────────────────────────────────

create type transaction_type as enum ('expense', 'income', 'transfer');
create type recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type member_role as enum ('owner', 'member');
create type budget_period as enum ('monthly', 'yearly');

-- ─── Workspaces ─────────────────────────────────────────────

create table workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Workspace members ──────────────────────────────────────

create table workspace_members (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          member_role not null default 'member',
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Index for RLS lookups (critical for performance)
create index workspace_members_user_id_idx on workspace_members(user_id);
create index workspace_members_workspace_id_idx on workspace_members(workspace_id);

-- ─── Profiles ───────────────────────────────────────────────

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  avatar_url        text,
  default_currency  char(3) not null default 'EUR',
  locale            text not null default 'fr-FR',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');

  -- Create default workspace for new user
  with ws as (
    insert into public.workspaces (name, owner_id)
    values ('Mon espace', new.id)
    returning id
  )
  insert into public.workspace_members (workspace_id, user_id, role, accepted_at)
  select ws.id, new.id, 'owner', now()
  from ws;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Categories ─────────────────────────────────────────────

create table categories (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  name          text not null,
  icon          text not null default '📦',
  color         text not null default '#6366F1',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index categories_workspace_id_idx on categories(workspace_id);

-- ─── Exchange rates ──────────────────────────────────────────
-- Written EXCLUSIVELY by Edge Functions using service_role key.
-- Never from client.

create table exchange_rates (
  currency      char(3) primary key,
  rate_to_eur   numeric(18, 8) not null check (rate_to_eur > 0),
  updated_at    timestamptz not null default now()
);

-- Seed with base rate
insert into exchange_rates (currency, rate_to_eur) values ('EUR', 1.0);

-- ─── Transactions ────────────────────────────────────────────

create table transactions (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  category_id       uuid references categories(id) on delete set null,
  amount            numeric(18, 2) not null check (amount > 0),
  currency          char(3) not null default 'EUR' references exchange_rates(currency),
  -- amount_eur is FROZEN at entry time using the rate at that moment.
  -- It is NEVER recalculated, even if exchange rates change.
  amount_eur        numeric(18, 2) not null check (amount_eur > 0),
  type              transaction_type not null,
  label             text not null check (char_length(label) between 1 and 100),
  note              text,
  date              date not null,
  recurring_rule_id uuid, -- FK added after recurring_rules table
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index transactions_workspace_id_idx on transactions(workspace_id);
create index transactions_workspace_date_idx on transactions(workspace_id, date desc);
create index transactions_category_id_idx on transactions(category_id);
create index transactions_label_trgm_idx on transactions using gin(label gin_trgm_ops);

-- ─── Recurring rules ─────────────────────────────────────────

create table recurring_rules (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  category_id       uuid references categories(id) on delete set null,
  amount            numeric(18, 2) not null check (amount > 0),
  currency          char(3) not null default 'EUR' references exchange_rates(currency),
  type              transaction_type not null,
  label             text not null check (char_length(label) between 1 and 100),
  frequency         recurring_frequency not null,
  start_date        date not null,
  end_date          date,
  next_occurrence   date not null,
  created_at        timestamptz not null default now(),
  constraint end_after_start check (end_date is null or end_date > start_date)
);

create index recurring_rules_workspace_id_idx on recurring_rules(workspace_id);
create index recurring_rules_next_occurrence_idx on recurring_rules(next_occurrence);

-- Add FK from transactions to recurring_rules now that the table exists
alter table transactions
  add constraint transactions_recurring_rule_id_fkey
  foreign key (recurring_rule_id) references recurring_rules(id) on delete set null;

-- ─── Budgets ─────────────────────────────────────────────────

create table budgets (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  amount_eur    numeric(18, 2) not null check (amount_eur > 0),
  period        budget_period not null default 'monthly',
  created_at    timestamptz not null default now(),
  unique (workspace_id, category_id, period)
);

create index budgets_workspace_id_idx on budgets(workspace_id);

-- ─── Investments ─────────────────────────────────────────────

create table investments (
  id                  uuid primary key default uuid_generate_v4(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  name                text not null,
  ticker              text,
  quantity            numeric(18, 8) not null check (quantity > 0),
  buy_price_eur       numeric(18, 2) not null check (buy_price_eur > 0),
  current_price_eur   numeric(18, 2) not null check (current_price_eur >= 0),
  currency            char(3) not null default 'EUR' references exchange_rates(currency),
  created_at          timestamptz not null default now()
);

create index investments_workspace_id_idx on investments(workspace_id);

-- ─── Goals ───────────────────────────────────────────────────

create table goals (
  id                  uuid primary key default uuid_generate_v4(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  name                text not null,
  target_amount_eur   numeric(18, 2) not null check (target_amount_eur > 0),
  current_amount_eur  numeric(18, 2) not null default 0 check (current_amount_eur >= 0),
  deadline            date,
  created_at          timestamptz not null default now()
);

create index goals_workspace_id_idx on goals(workspace_id);

-- ─── updated_at trigger ──────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on workspaces
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on transactions
  for each row execute function public.set_updated_at();
