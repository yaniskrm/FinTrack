-- ============================================================
-- FinTrack — Bank-reference-based import deduplication (DBS adapter)
-- ============================================================
-- Additive only — no destructive changes to existing columns.
--
-- `external_ref`: a stable, bank-assigned identifier for a single
-- transaction, prefixed by source (e.g. 'dbs:000003183851603') so Enable
-- Banking sync (ADR-023, same import pipeline) can later populate it with
-- its own identifiers without ever colliding with a CSV-imported one.
--
-- Unique index is deliberately NOT partial (`where external_ref is not
-- null`), even though Postgres already treats NULLs as distinct under a
-- partial-free unique index — verified empirically that PostgREST's
-- `on_conflict` parameter cannot target a partial index (it doesn't forward
-- the WHERE predicate, failing with `42P10 no unique or exclusion
-- constraint matching`), and `importTransactionsAction`'s upsert safety net
-- (ON CONFLICT DO NOTHING via ignoreDuplicates) needs exactly this
-- constraint to target. A plain unique index already allows unlimited rows
-- with external_ref = null per account (confirmed: NULLS DISTINCT is
-- Postgres's default), so manually-entered transactions and banks without a
-- reference column (Revolut) are unaffected.
alter table transactions
  add column external_ref text;

create unique index transactions_account_external_ref_key
  on transactions (account_id, external_ref);
