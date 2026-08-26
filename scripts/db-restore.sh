#!/usr/bin/env bash
# FinTrack — restore the snapshot taken by ./scripts/db-backup.sh, right
# after a `supabase db reset`. Clears the freshly-seeded auth/workspace data
# first (DELETE FROM auth.users cascades through every workspace-scoped
# table via ON DELETE CASCADE — verified against the schema), then replays
# the backup on the now-empty tables. `exchange_rates` is left untouched
# (never backed up — always the fresh seed.sql rows).
#
# Usage:
#   ./scripts/db-restore.sh                       # restores .db-backups/latest.dump
#   ./scripts/db-restore.sh path/to/some.dump      # restores a specific snapshot

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/.db-backups"
CONTAINER="supabase_db_FinTrack"
FILE="${1:-$BACKUP_DIR/latest.dump}"

if [ ! -f "$FILE" ]; then
  echo "✗ No backup found at $FILE — nothing to restore." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "✗ $CONTAINER isn't running." >&2
  exit 1
fi

echo "Clearing the freshly-seeded auth/workspace data (demo account + its cascade)…"
docker exec "$CONTAINER" psql -U postgres -d postgres -c "delete from auth.users;" >/dev/null

echo "Restoring $FILE…"
# The dump already contains the exact profiles/workspaces/workspace_members
# rows, so the on_auth_user_created / on_workspace_created triggers must NOT
# re-fire (they'd create a second, empty workspace per restored user) and FK
# checks must not choke on restore ordering. pg_restore's own
# --disable-triggers needs table ownership (ALTER TABLE DISABLE TRIGGER) —
# `postgres` isn't the owner of auth.* here (that's supabase_auth_admin), so
# it fails silently and does nothing. `SET session_replication_role =
# replica` achieves the same thing without ownership — confirmed `postgres`
# can run it as a normal statement — but NOT as a connection-time PGOPTIONS
# startup param (Postgres double-checks superuser specifically at connection
# time for this one GUC). So: convert the dump to plain SQL, prepend the
# SET, run both through a single psql session.
REMOTE_DUMP="/tmp/fintrack-restore-$$.dump"
docker cp "$FILE" "$CONTAINER:$REMOTE_DUMP"
docker exec "$CONTAINER" bash -c "
  set -e
  { echo 'SET session_replication_role = replica;'; pg_restore --data-only -f - '$REMOTE_DUMP'; } \
    | psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q
  rm -f '$REMOTE_DUMP'
"

USERS=$(docker exec "$CONTAINER" psql -U postgres -d postgres -tAc "select count(*) from auth.users;")
echo "✓ Restauré : $USERS comptes."
