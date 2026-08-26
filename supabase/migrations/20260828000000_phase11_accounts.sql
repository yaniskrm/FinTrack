-- ============================================================
-- FinTrack — Phase 11: multiple bank accounts
-- ============================================================
-- New `accounts` table (checking/savings/investment/cash/other), linked
-- from `transactions` and `recurring_rules` via `account_id`. Every
-- existing workspace gets one backfilled "Compte principal" so no
-- historical row is ever left without an account — `account_id` ends up
-- NOT NULL on both tables, same guarantee as `category_id` had before it
-- was made nullable-by-design (categories can be hidden, not accounts:
-- there's no "no account" state once this migration is done).
--
-- Transfers ("virements internes") reuse the existing `transaction_type`
-- value 'transfer' (already in the enum, unused until now — see
-- packages/core/src/calculations/balance.ts, which already treats it as
-- workspace-level-neutral). A transfer is a single transaction row:
-- `account_id` is the source (money leaves it), `to_account_id` is the
-- destination (money arrives there). No second linked row, unlike the
-- reimbursement-settlement pattern (ADR-019) — a transfer isn't a new
-- economic event needing its own income/expense classification, just money
-- moving between two accounts the user already owns.

-- ─── accounts ────────────────────────────────────────────────

create type account_type as enum ('checking', 'savings', 'investment', 'cash', 'other');

create table accounts (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references workspaces(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 50),
  type                account_type not null default 'checking',
  currency            character(3) not null default 'EUR' references exchange_rates(currency),
  -- Native-currency balance as entered by the user, plus its EUR
  -- equivalent frozen at creation time (ADR-005 pattern) — summed
  -- straight into balance calculations without a live conversion.
  -- Unlike transactions.amount, this can be negative (e.g. a credit
  -- card's starting balance is a debt).
  initial_balance     numeric(18, 2) not null default 0,
  initial_balance_eur numeric(18, 2) not null default 0,
  color               text not null default '#C9A961' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon                text not null default '🏦' check (char_length(icon) between 1 and 8),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index accounts_workspace_id_idx on accounts(workspace_id);

alter table accounts enable row level security;

create policy "accounts: workspace members can read"
  on accounts for select
  using (public.is_workspace_member(workspace_id));

create policy "accounts: workspace members can insert"
  on accounts for insert
  with check (public.is_workspace_member(workspace_id));

create policy "accounts: workspace members can update"
  on accounts for update
  using (public.is_workspace_member(workspace_id));

create policy "accounts: workspace members can delete"
  on accounts for delete
  using (public.is_workspace_member(workspace_id));

-- Same AAL2 backstop as every other financial table (20260822000000_mfa_aal2_rls.sql).
create policy "aal2 required when mfa enrolled"
  on accounts as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create trigger set_updated_at before update on accounts
  for each row execute procedure public.set_updated_at();

-- ─── Seed a default account for every new workspace ──────────

create or replace function public.seed_default_account(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into accounts (workspace_id, name, type, currency, initial_balance, initial_balance_eur, icon)
  values (p_workspace_id, 'Compte principal', 'checking', 'EUR', 0, 0, '🏦');
end;
$$;

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories(new.id);
  perform public.seed_default_account(new.id);
  return new;
end;
$$;

-- ─── Link transactions & recurring_rules to an account ───────

alter table transactions
  add column account_id uuid references accounts(id) on delete restrict,
  add column to_account_id uuid references accounts(id) on delete restrict,
  add constraint transactions_to_account_only_on_transfer
    check (to_account_id is null or type = 'transfer'),
  add constraint transactions_to_account_differs
    check (to_account_id is null or to_account_id <> account_id);

alter table recurring_rules
  add column account_id uuid references accounts(id) on delete restrict,
  add column to_account_id uuid references accounts(id) on delete restrict,
  add constraint recurring_rules_to_account_only_on_transfer
    check (to_account_id is null or type = 'transfer'),
  add constraint recurring_rules_to_account_differs
    check (to_account_id is null or to_account_id <> account_id);

-- ─── Backfill: one "Compte principal" per existing workspace ─

do $$
declare
  ws record;
  v_account_id uuid;
begin
  for ws in select id from workspaces loop
    insert into accounts (workspace_id, name, type, currency, initial_balance, initial_balance_eur, icon)
    values (ws.id, 'Compte principal', 'checking', 'EUR', 0, 0, '🏦')
    returning id into v_account_id;

    update transactions set account_id = v_account_id where workspace_id = ws.id;
    update recurring_rules set account_id = v_account_id where workspace_id = ws.id;
  end loop;
end;
$$;

alter table transactions alter column account_id set not null;
alter table recurring_rules alter column account_id set not null;

create index transactions_account_id_idx on transactions(account_id);
create index transactions_to_account_id_idx on transactions(to_account_id) where to_account_id is not null;
create index recurring_rules_account_id_idx on recurring_rules(account_id);

-- ─── Carry account_id / to_account_id through generation ─────
-- A recurring rule can itself be a transfer (e.g. a standing order into a
-- savings account) — the generated transaction must inherit both ends.

create or replace function public.generate_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r        recurring_rules%rowtype;
  v_rate   numeric;
  v_upd    timestamptz;
  v_next   date;
  created  integer := 0;
begin
  for r in select * from recurring_rules loop
    v_next := r.next_occurrence;

    -- Catch up every occurrence due on or before today (and within end_date).
    while v_next <= current_date and (r.end_date is null or v_next <= r.end_date) loop
      select rate_to_eur, updated_at into v_rate, v_upd
        from exchange_rates where currency = r.currency;
      exit when v_rate is null;  -- currency without a rate → skip this rule

      insert into transactions (
        workspace_id, account_id, to_account_id, category_id, amount, currency, amount_eur,
        rate_approximate, type, label, date, recurring_rule_id
      ) values (
        r.workspace_id, r.account_id, r.to_account_id, r.category_id, r.amount, r.currency,
        round(r.amount * v_rate, 2),
        (v_upd < now() - interval '48 hours'),
        r.type, r.label, v_next, r.id
      );
      created := created + 1;

      v_next := (case r.frequency
        when 'daily'   then v_next + interval '1 day'
        when 'weekly'  then v_next + interval '1 week'
        when 'monthly' then v_next + interval '1 month'
        when 'yearly'  then v_next + interval '1 year'
      end)::date;
    end loop;

    if v_next <> r.next_occurrence then
      update recurring_rules set next_occurrence = v_next where id = r.id;
    end if;
  end loop;

  return created;
end;
$$;
