# ADR-004 — Exchange rates via Edge Function (never from client)

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack supports 9 currencies. Exchange rates need to be up-to-date and consistent across all users.

## Decision

Exchange rates are **fetched exclusively by an Edge Function** (`exchange-rates`) running on an hourly cron. The client reads rates from the `exchange_rates` table (read-only via RLS) but never calls external APIs directly.

## Reasoning

1. **API key security** — the exchange rate API key stays in Supabase secrets, never in the client bundle
2. **Consistency** — all users see the same rates at any given moment (no per-client drift)
3. **Rate limiting** — one server-side call per hour instead of N client calls
4. **Offline resilience** — last known rates are always available in the DB

## RLS enforcement

The `exchange_rates` table has:
- `SELECT` policy for all authenticated users
- **No INSERT/UPDATE/DELETE policies** — client cannot write rates even if compromised

The Edge Function uses `service_role` key which bypasses RLS.

## Consequences

- `EXCHANGE_RATE_API_KEY` stored in Supabase secrets only
- Client reads from `exchange_rates` table (cached by TanStack Query, 1h stale time)
- Edge Function runs as cron: `0 * * * *` (every hour)
