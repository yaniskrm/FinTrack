-- ============================================================
-- FinTrack — Require AAL2 (2FA) at the database layer
-- ============================================================
-- These RESTRICTIVE policies combine (AND) with the existing workspace
-- membership policies. Effect: a user who has at least one *verified* MFA
-- factor may only touch financial data with a fully stepped-up (aal2)
-- session. Users without 2FA are unaffected (aal1 or aal2 both allowed).
--
-- This is the non-bypassable backstop behind the app-level middleware gate:
-- even a stolen aal1 session (password only) cannot read or write financial
-- data once the victim has enabled 2FA.
--
-- Pattern from the Supabase docs:
-- https://supabase.com/docs/guides/auth/auth-mfa#enforce-mfa-for-all-users
--
-- ⚠️  Not yet verified against a local Supabase (no Docker in this env).
--     Run `supabase db reset` and exercise the 2FA flow before applying to
--     any shared or production database.

create or replace function public.enforce_aal2_when_enrolled()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select array[(select auth.jwt() ->> 'aal')] <@ (
    select
      case
        when count(id) > 0 then array['aal2']
        else array['aal1', 'aal2']
      end
    from auth.mfa_factors
    where user_id = auth.uid()
      and status = 'verified'
  );
$$;

-- Apply the restrictive policy to every workspace-scoped financial table.
create policy "aal2 required when mfa enrolled"
  on categories as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create policy "aal2 required when mfa enrolled"
  on transactions as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create policy "aal2 required when mfa enrolled"
  on recurring_rules as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create policy "aal2 required when mfa enrolled"
  on budgets as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create policy "aal2 required when mfa enrolled"
  on investments as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());

create policy "aal2 required when mfa enrolled"
  on goals as restrictive for all to authenticated
  using (public.enforce_aal2_when_enrolled());
