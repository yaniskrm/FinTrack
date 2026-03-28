# ADR-006 — pnpm monorepo + packages/core separated

**Date** : 2024-01-01
**Status** : Accepted

## Context

FinTrack has business logic (balance calculations, validators, currency conversion) that needs to be:
1. Testable without a simulator/emulator (fast CI)
2. Potentially reusable across Web and Mobile
3. Free of React/Expo/Supabase dependencies

## Decision

Use **pnpm workspaces + Turborepo** monorepo with `packages/core` as a pure TypeScript package with **zero React/Expo/Supabase dependencies**.

## Structure

```
packages/
  core/        ← Pure logic, Node.js testable (Vitest)
  ui/          ← React Native components (peers: react, react-native)
  api-client/  ← Supabase typed client
apps/
  mobile/      ← Expo app, imports from all packages
```

## Reasoning

- **Fast tests** — `pnpm --filter @fintrack/core test` runs in <5s without any native module loading
- **Separation of concerns** — business rules are independent from rendering or storage
- **CI efficiency** — Turborepo caches test results, only re-runs affected packages
- **Future Web app** — `packages/core` and `packages/ui` can be imported by a Next.js app

## Constraints on packages/core

- Zero dependencies on `react`, `react-native`, `expo-*`, `@supabase/*`
- All functions are pure (input → output, no side effects)
- 80%+ test coverage enforced in CI

## Consequences

- Path aliases: `@fintrack/core`, `@fintrack/ui`, `@fintrack/api-client`
- Turborepo task graph: `build` depends on `^build` (packages built before apps)
- `pnpm -r test` runs all workspace tests
