-- Self-service account deletion (RGPD art. 17 — droit à l'effacement).
--
-- A signed-in user erases their OWN account and everything attached to it.
--
-- SECURITY DEFINER because removing a row from auth.users needs privileges the
-- `authenticated` role does not have. That is safe here only because:
--   * the target is derived from auth.uid() — the function takes NO argument,
--     so a caller can never name another user;
--   * `anon` and PUBLIC cannot execute it (REVOKE below);
--   * a user with 2FA enrolled must hold an aal2 session (same rule as the
--     RESTRICTIVE RLS policies on the financial tables);
--   * search_path is pinned, so an attacker-created object cannot shadow ours.
--
-- Deletion order is explicit rather than left to the FK cascade:
-- transactions.account_id / recurring_rules.account_id reference accounts with
-- ON DELETE RESTRICT, and RESTRICT (unlike NO ACTION) is checked immediately,
-- so a cascade that happened to remove `accounts` before `transactions` would
-- abort the whole deletion. Removing the referencing rows first makes the
-- outcome independent of Postgres' internal trigger ordering.
--
-- v1 has exactly one workspace per user, owned by them. When multi-user
-- workspaces arrive (v2) this MUST change: deleting a user who merely belongs
-- to someone else's workspace must not delete that workspace.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  ws  uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if exists (
    select 1 from auth.mfa_factors where user_id = uid and status = 'verified'
  ) and coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'two-factor verification required' using errcode = '42501';
  end if;

  for ws in select id from public.workspaces where owner_id = uid loop
    delete from public.transactions    where workspace_id = ws;
    delete from public.recurring_rules where workspace_id = ws;
    -- Everything else (accounts, categories, budgets, goals, investments and
    -- their valuations, bank connections, push subscriptions) cascades from the
    -- workspace.
    delete from public.workspaces where id = ws;
  end loop;

  -- Cascades to profiles, workspace_members and push_subscriptions, and GoTrue
  -- removes the user's sessions and refresh tokens with it.
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Erases the calling user''s own account and all of its data (RGPD art. 17). No argument by design.';
