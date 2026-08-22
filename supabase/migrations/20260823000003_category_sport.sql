-- ============================================================
-- FinTrack — Add "Sport" to the default categories
-- ============================================================

-- Update the default-category seed for NEW workspaces.
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
    (p_workspace_id, 'Sport',           '🏃', '#06B6D4', true),
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

-- Backfill: add "Sport" to existing workspaces that don't have it yet.
insert into categories (workspace_id, name, icon, color, is_default)
select w.id, 'Sport', '🏃', '#06B6D4', true
from workspaces w
where not exists (
  select 1 from categories c
  where c.workspace_id = w.id and c.name = 'Sport'
);
