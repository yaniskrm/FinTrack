-- ============================================================
-- FinTrack — Default categories seeded per workspace
-- Called from the handle_new_user trigger via a second trigger
-- or from seed.sql for local dev.
-- ============================================================

-- Function: seed default categories for a new workspace
create or replace function public.seed_default_categories(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into categories (workspace_id, name, icon, color, is_default) values
    (p_workspace_id, 'Alimentation',    '🛒', '#10B981', true),
    (p_workspace_id, 'Transport',       '🚗', '#3B82F6', true),
    (p_workspace_id, 'Logement',        '🏠', '#8B5CF6', true),
    (p_workspace_id, 'Santé',           '💊', '#EF4444', true),
    (p_workspace_id, 'Loisirs',         '🎉', '#F59E0B', true),
    (p_workspace_id, 'Restaurants',     '🍽️', '#EC4899', true),
    (p_workspace_id, 'Shopping',        '🛍️', '#6366F1', true),
    (p_workspace_id, 'Abonnements',     '📱', '#14B8A6', true),
    (p_workspace_id, 'Voyages',         '✈️', '#F97316', true),
    (p_workspace_id, 'Éducation',       '📚', '#84CC16', true),
    (p_workspace_id, 'Salaire',         '💼', '#10B981', true),
    (p_workspace_id, 'Remboursements',  '💸', '#6B7280', true),
    (p_workspace_id, 'Divers',          '📦', '#9CA3AF', true);
end;
$$;

-- Wire default categories to new workspace creation
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on workspaces
  for each row execute procedure public.handle_new_workspace();
