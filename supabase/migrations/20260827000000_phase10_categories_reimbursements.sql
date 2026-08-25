-- ============================================================
-- FinTrack — Phase 10: category management, category detection input,
-- reimbursement workflow
-- ============================================================
-- Additive only — no destructive changes to existing columns.

-- ─── Categories: soft-hide instead of delete ─────────────────
-- Deleting a category the user no longer wants would orphan every
-- transaction that references it (category_id -> set null via existing FK).
-- `hidden` lets it disappear from pickers without touching history.
alter table categories
  add column hidden boolean not null default false;

-- ─── Transactions: merchant (spec Module 2 "Enseigne") ───────
-- Feeds both the category-detection heuristic and history autocomplete.
alter table transactions
  add column merchant text;

-- ─── Transactions: reimbursement workflow (spec Module 9) ────
-- A transaction marked "pending" is money fronted for someone else, owed
-- back — a receivable. Settling it creates a linked income transaction
-- (settled_transaction_id) rather than mutating the original expense, so
-- the expense's own history/amount_eur stays exactly as entered.
create type reimbursement_status as enum ('none', 'pending', 'settled');

alter table transactions
  add column reimbursement_status reimbursement_status not null default 'none',
  add column reimbursement_contact text,
  add column settled_transaction_id uuid references transactions(id) on delete set null,
  add constraint transactions_settled_state_consistent
    check ((reimbursement_status = 'settled') = (settled_transaction_id is not null));

create index transactions_reimbursement_status_idx
  on transactions(workspace_id, reimbursement_status)
  where reimbursement_status = 'pending';
