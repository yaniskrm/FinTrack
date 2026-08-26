#!/usr/bin/env bash
# FinTrack — snapshot every real account + its data before a `supabase db
# reset` wipes the local database. Run this immediately before any reset;
# restore with `./scripts/db-restore.sh` immediately after.
#
# Dumps auth.users + auth.identities (enough to log back in) and every
# public-schema table that hangs off a workspace, EXCEPT `exchange_rates`
# (pure reference data, always safely reseeded fresh — restoring old rows
# on top would just conflict with seed.sql's).
#
# Usage:
#   ./scripts/db-backup.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/.db-backups"
CONTAINER="supabase_db_FinTrack"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "✗ $CONTAINER isn't running — nothing to back up (supabase not started?)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/pre-reset-$TIMESTAMP.dump"

# Every table explicitly, one -t per table — mixing -n/-T with -t was found
# to silently drop the -n-selected tables (verified: a dump taken with
# `-n public -T public.exchange_rates -t auth.users -t auth.identities`
# contained ONLY auth.users/auth.identities, nothing from public at all).
# `exchange_rates` is deliberately excluded — pure reference data, always
# safely reseeded fresh by seed.sql, never backed up.
docker exec "$CONTAINER" pg_dump -U postgres -d postgres \
  --data-only -F c \
  -t auth.users -t auth.identities \
  -t public.profiles -t public.workspaces -t public.workspace_members \
  -t public.categories -t public.accounts -t public.transactions \
  -t public.recurring_rules -t public.budgets -t public.goals \
  -t public.investments -t public.investment_valuations \
  -t public.push_subscriptions \
  > "$OUT"

cp "$OUT" "$BACKUP_DIR/latest.dump"

USERS=$(docker exec "$CONTAINER" psql -U postgres -d postgres -tAc "select count(*) from auth.users;")
echo "✓ Backup written to $OUT ($USERS comptes) — restaurer avec ./scripts/db-restore.sh juste après le reset."
