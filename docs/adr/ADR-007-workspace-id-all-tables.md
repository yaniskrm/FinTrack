# ADR-007 — workspace_id on all business tables

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack v1 is single-user. However, a high-priority v2 feature is shared budgets (couples, flatmates). Typical SaaS pattern: add `user_id` everywhere in v1, then migrate to multi-user in v2 — but this migration is costly and risky on financial data.

## Decision

All business tables (`categories`, `transactions`, `recurring_rules`, `budgets`, `investments`, `goals`) have `workspace_id` as their ownership key, **not** `user_id`.

A **workspace** is the unit of sharing. In v1, each user has exactly one workspace. In v2, users can be members of multiple workspaces (shared couple budget, family workspace, etc.).

## Data model

```
user → workspace_members → workspace → [all business data]
```

RLS policy (same for every table):
```sql
workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
)
```

## Consequences

- **No migration needed for multi-user** — the schema already supports it
- Slightly more complex queries (join through `workspace_members`) — mitigated by the `is_workspace_member()` helper function and indexes
- Single-user v1: each user has one workspace, transparently
- Multi-user v2: invite system, roles (owner/member), `accepted_at` field
