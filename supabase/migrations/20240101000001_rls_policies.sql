-- ============================================================
-- FinTrack — Row Level Security policies
-- Rule: workspace_id must be in the user's accepted memberships
-- ============================================================

-- Helper: returns true if the authenticated user is an accepted
-- member of the given workspace.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and accepted_at is not null
  );
$$;

-- ─── Enable RLS on all tables ───────────────────────────────

alter table workspaces          enable row level security;
alter table workspace_members   enable row level security;
alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table transactions        enable row level security;
alter table recurring_rules     enable row level security;
alter table budgets             enable row level security;
alter table investments         enable row level security;
alter table goals               enable row level security;
alter table exchange_rates      enable row level security;

-- ─── workspaces ─────────────────────────────────────────────

create policy "workspace: members can read"
  on workspaces for select
  using (public.is_workspace_member(id));

create policy "workspace: owner can update"
  on workspaces for update
  using (owner_id = auth.uid());

-- workspaces are created via the trigger, not directly by clients

-- ─── workspace_members ──────────────────────────────────────

create policy "workspace_members: member can read own workspace"
  on workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members: owner can insert members"
  on workspace_members for insert
  with check (
    exists (
      select 1 from workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

create policy "workspace_members: member can accept own invite"
  on workspace_members for update
  using (user_id = auth.uid());

create policy "workspace_members: owner can remove members"
  on workspace_members for delete
  using (
    exists (
      select 1 from workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );

-- ─── profiles ───────────────────────────────────────────────

create policy "profiles: user can read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: user can update own profile"
  on profiles for update
  using (id = auth.uid());

-- ─── categories ─────────────────────────────────────────────

create policy "categories: workspace members can read"
  on categories for select
  using (public.is_workspace_member(workspace_id));

create policy "categories: workspace members can insert"
  on categories for insert
  with check (public.is_workspace_member(workspace_id));

create policy "categories: workspace members can update"
  on categories for update
  using (public.is_workspace_member(workspace_id));

create policy "categories: workspace members can delete non-default"
  on categories for delete
  using (public.is_workspace_member(workspace_id) and not is_default);

-- ─── transactions ────────────────────────────────────────────

create policy "transactions: workspace members can read"
  on transactions for select
  using (public.is_workspace_member(workspace_id));

create policy "transactions: workspace members can insert"
  on transactions for insert
  with check (public.is_workspace_member(workspace_id));

create policy "transactions: workspace members can update"
  on transactions for update
  using (public.is_workspace_member(workspace_id));

create policy "transactions: workspace members can delete"
  on transactions for delete
  using (public.is_workspace_member(workspace_id));

-- ─── recurring_rules ─────────────────────────────────────────

create policy "recurring_rules: workspace members can read"
  on recurring_rules for select
  using (public.is_workspace_member(workspace_id));

create policy "recurring_rules: workspace members can insert"
  on recurring_rules for insert
  with check (public.is_workspace_member(workspace_id));

create policy "recurring_rules: workspace members can update"
  on recurring_rules for update
  using (public.is_workspace_member(workspace_id));

create policy "recurring_rules: workspace members can delete"
  on recurring_rules for delete
  using (public.is_workspace_member(workspace_id));

-- ─── budgets ─────────────────────────────────────────────────

create policy "budgets: workspace members can read"
  on budgets for select
  using (public.is_workspace_member(workspace_id));

create policy "budgets: workspace members can insert"
  on budgets for insert
  with check (public.is_workspace_member(workspace_id));

create policy "budgets: workspace members can update"
  on budgets for update
  using (public.is_workspace_member(workspace_id));

create policy "budgets: workspace members can delete"
  on budgets for delete
  using (public.is_workspace_member(workspace_id));

-- ─── investments ─────────────────────────────────────────────

create policy "investments: workspace members can read"
  on investments for select
  using (public.is_workspace_member(workspace_id));

create policy "investments: workspace members can insert"
  on investments for insert
  with check (public.is_workspace_member(workspace_id));

create policy "investments: workspace members can update"
  on investments for update
  using (public.is_workspace_member(workspace_id));

create policy "investments: workspace members can delete"
  on investments for delete
  using (public.is_workspace_member(workspace_id));

-- ─── goals ───────────────────────────────────────────────────

create policy "goals: workspace members can read"
  on goals for select
  using (public.is_workspace_member(workspace_id));

create policy "goals: workspace members can insert"
  on goals for insert
  with check (public.is_workspace_member(workspace_id));

create policy "goals: workspace members can update"
  on goals for update
  using (public.is_workspace_member(workspace_id));

create policy "goals: workspace members can delete"
  on goals for delete
  using (public.is_workspace_member(workspace_id));

-- ─── exchange_rates ──────────────────────────────────────────
-- Read-only for all authenticated users.
-- Writes are done exclusively by Edge Functions (service_role bypasses RLS).

create policy "exchange_rates: all authenticated users can read"
  on exchange_rates for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies → client cannot write exchange rates
