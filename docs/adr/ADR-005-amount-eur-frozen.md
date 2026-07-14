# ADR-005 — amount_eur frozen at entry time

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack supports multi-currency transactions. When displaying historical data (monthly totals, charts, budget comparisons), we need a stable EUR reference value for each transaction.

## Decision

`amount_eur` is **calculated once at the moment of transaction entry** using the exchange rate at that time. It is stored in the database and **never recalculated**, even if exchange rates change.

## Reasoning

Consider a €100 expense entered when 1 USD = 0.92 EUR:
- `amount = 108.70`, `currency = USD`, `amount_eur = 100`

If the rate changes to 0.85 EUR/USD, recalculating would change the historical record:
- The expense would suddenly appear as €92.40 — **historically incorrect**

Financial applications (bank statements, tax reports) must show the value at the time of the transaction, not the current value.

## Implementation

```typescript
// In the transaction creation flow (Phase 2):
const rate = await getExchangeRate(currency); // from DB, not external API
const amount_eur = convertToEur(amount, currency, [rate]);
// amount_eur is then saved with the transaction and never touched again
```

## Consequences

- `amount_eur` column has a `NOT NULL` constraint — always required on insert
- Historical reporting is deterministic and audit-proof
- Multi-currency portfolio P&L (investments) uses `current_price_eur` which IS updated
