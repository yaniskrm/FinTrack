# ADR-003 — Optimistic mutations via TanStack Query

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack's core value proposition is **zero-friction entry** — transactions should feel instant. Network latency (even on 4G/5G) creates a perceptible delay if we wait for server confirmation before updating the UI.

## Decision

Use **TanStack Query v5** with **optimistic updates** for all mutations. UI updates immediately; server confirmation happens asynchronously. On error, TanStack Query automatically rolls back to the previous state.

## Pattern

```typescript
const mutation = useMutation({
  mutationFn: (tx: TransactionInsert) => supabase.from("transactions").insert(tx),
  onMutate: async (newTx) => {
    // Cancel in-flight queries for this list
    await queryClient.cancelQueries({ queryKey: ["transactions", workspaceId] });
    // Snapshot for rollback
    const previous = queryClient.getQueryData(["transactions", workspaceId]);
    // Optimistically add to cache
    queryClient.setQueryData(["transactions", workspaceId], (old) => [newTx, ...(old ?? [])]);
    return { previous };
  },
  onError: (_err, _newTx, context) => {
    // Rollback on failure
    queryClient.setQueryData(["transactions", workspaceId], context?.previous);
  },
  onSettled: () => {
    // Re-fetch to sync with server
    void queryClient.invalidateQueries({ queryKey: ["transactions", workspaceId] });
  },
});
```

## Consequences

- UI feels instant even on slow connections
- Automatic rollback on network errors (user sees a toast)
- All mutations follow this pattern consistently
- `queryClient` is shared via `QueryClientProvider` in `app/_layout.tsx`
