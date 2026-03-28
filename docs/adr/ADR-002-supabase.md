# ADR-002 — Supabase (vs Firebase)

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack needs a backend for authentication, data storage, real-time updates, and server-side functions.

## Decision

Use **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions).

## Reasoning

| Criterion | Supabase | Firebase |
|---|---|---|
| Database | PostgreSQL (relational, typed, foreign keys) | Firestore (NoSQL, flexible) |
| Row-level security | Native RLS via SQL | Manual security rules |
| Complex queries | Full SQL, JOINs, aggregates | Limited |
| Open source | Yes (self-hostable) | No |
| Edge Functions | Deno | Cloud Functions (Node.js) |
| Realtime | Postgres CDC | Firestore listeners |

Key factor: **financial data needs relational integrity**. PostgreSQL's foreign keys, constraints, and RLS policies provide banking-grade security guarantees that are hard to replicate in Firestore.

RLS design: all business tables use `workspace_id`, and access is gated by `workspace_members` membership. This is enforced at the DB layer — not just application logic.

## Consequences

- All schema changes via versioned migrations in `supabase/migrations/`
- Local dev uses `supabase start` (Docker)
- Edge Functions in Deno (TypeScript)
- `service_role` key is NEVER exposed to the client
