# FinTrack — Contexte projet pour Claude Code

## Vue d'ensemble

Application de gestion financière personnelle, mobile-first (iOS prioritaire), avec support Android et Web depuis une seule codebase. L'obsession principale est la **friction zéro à la saisie** et la **sécurité bancaire-grade**.

**Documentation complète** : Wiki Notion → https://www.notion.so/32127748ca0281ad968bebf687fb73e1

---

## Stack technique

| Couche | Technologie |
|---|---|
| Mobile/Web | React Native + Expo SDK 52 + Expo Router |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| State | Zustand |
| Queries | TanStack Query v5 |
| Monorepo | pnpm workspaces + Turborepo |
| Tests | Vitest (unitaires + intégration), Maestro (E2E) |
| Build | EAS Build (Expo) |
| CI/CD | GitHub Actions |
| Langue | TypeScript strict (noUncheckedIndexedAccess: true) |

---

## Structure du monorepo

```
fintrack/
├── apps/
│   └── mobile/          ← Expo app (iOS + Android + Web)
│       ├── app/         ← Expo Router (file-based routing)
│       ├── components/  ← Composants app-spécifiques
│       ├── hooks/       ← Hooks métier
│       ├── stores/      ← Zustand stores
│       └── lib/         ← Config Supabase, notifications
├── packages/
│   ├── core/            ← Logique métier pure (ZERO dépendance React)
│   │   └── src/
│   │       ├── calculations/  ← balance, budget, health-score
│   │       ├── currency/      ← conversion, formatting
│   │       ├── validators/    ← transaction, recurring
│   │       └── types/         ← Types TypeScript partagés
│   ├── ui/              ← Design system (composants partagés)
│   │   ├── components/
│   │   └── tokens/      ← couleurs, spacing, typo
│   └── api-client/      ← Client Supabase typé
├── supabase/
│   ├── migrations/      ← Schéma BDD versionné (JAMAIS éditer directement en prod)
│   ├── functions/       ← Edge Functions Deno
│   │   ├── exchange-rates/    ← Cron horaire: MAJ taux de change
│   │   ├── send-notifications/← Cron 8h: push récurrences
│   │   └── export-pdf/        ← Génération rapport PDF
│   └── seed.sql
└── docs/adr/            ← Architecture Decision Records
```

---

## Schéma de base de données — entités principales

```
workspaces          ← Unité de partage (1 par user en v1, N en v2)
workspace_members   ← user_id + workspace_id + role
profiles            ← Extension auth.users
categories          ← Personnalisables par workspace
transactions        ← Table centrale, appartient à un workspace
recurring_rules     ← Règles de récurrence (≠ transactions)
exchange_rates      ← Taux globaux, écrits par Edge Function uniquement
budgets             ← Enveloppes par catégorie
investments         ← Positions de portefeuille
goals               ← Objectifs d'épargne
```

**Point critique** : toutes les tables métier ont un `workspace_id`, pas un `user_id` direct.
Cela anticipe le mode multi-utilisateurs (budget partagé en couple) sans migration future.

**RLS** : activé sur TOUTES les tables. Règle fondamentale :
```sql
workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
)
```

---

## Règles de développement — À RESPECTER ABSOLUMENT

### Sécurité
- Les tokens JWT sont stockés dans **Keychain iOS / Keystore Android** — jamais AsyncStorage
- La clé API du LLM (module IA) est stockée dans Keychain — **jamais en base de données**
- Les taux de change sont appelés **exclusivement** par les Edge Functions — jamais depuis le client
- Aucune donnée financière dans les logs ou crash reports
- Screenshots bloqués sur les écrans sensibles

### Architecture
- `packages/core` = zéro dépendance React/Expo/Supabase — logique pure testable en Node.js
- Les mutations sont **optimistes** : UI mise à jour avant confirmation serveur (TanStack Query)
- Le `amount_eur` est **gelé** au moment de la saisie avec le taux du moment — jamais recalculé
- Les Edge Functions utilisent le `service_role` key — jamais exposé côté client

### Conventions de code
- TypeScript strict sur tout le projet
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour composants/types, `SCREAMING_SNAKE` pour constantes
- Un composant = un fichier
- Pas de `any` — utiliser `unknown` si nécessaire
- Imports absolus via path aliases (`@fintrack/core`, `@/components`, etc.)

### Tests
- Tout nouveau code dans `packages/core` DOIT avoir un test Vitest
- Coverage minimum : 80% sur `packages/core`
- Les tests d'intégration tournent contre Supabase local (Docker) — jamais contre la prod
- CI bloquante sur `main` : lint + typecheck + tests unitaires + tests d'intégration

---

## Variables d'environnement

```bash
# apps/mobile/.env.local (ne jamais committer)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# supabase/functions/.env (ne jamais committer)
EXCHANGE_RATE_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXPO_PUSH_ACCESS_TOKEN=
```

---

## Commandes utiles

```bash
# Développement
pnpm dev                          # Lance l'app Expo
pnpm --filter @fintrack/core test # Tests unitaires (rapides)
pnpm test                         # Tous les tests
pnpm typecheck                    # TypeScript check global
pnpm lint                         # ESLint

# Supabase local
supabase start                    # Démarre PostgreSQL + Studio local
supabase db reset                 # Reset + applique toutes les migrations
supabase functions serve          # Edge Functions en local

# Build
eas build --profile development   # Build dev (device physique)
eas build --profile staging       # Build staging
```

---

## Workflow Git

```
main       ← prod, protégée (CI obligatoire + PR)
  └── staging ← pré-prod, builds EAS automatiques
       └── feat/nom-feature
       └── fix/nom-bug
```

**Jamais de push direct sur `main`.** Toujours passer par une PR.

Format des commits : `type(scope): description`
- `feat(transactions): add optimistic mutation for new transaction`
- `fix(currency): handle missing exchange rate gracefully`
- `test(core): add balance calculation edge cases`
- `chore(ci): add integration test job`

---

## Modules fonctionnels (résumé)

1. **Dashboard** — solde temps réel, sparkline, donut, histogramme, prochains prélèvements
2. **Saisie rapide** — modale FAB, < 5 secondes, autocomplete enseigne
3. **Transactions** — liste filtrée, swipe actions, recherche full-text
4. **Abonnements** — récurrences, vue dédiée, notifications J-3/J-1/J0
5. **Budget** — enveloppes par catégorie, alertes 80%/100%
6. **Investissements** — portefeuille, P&L, allocation
7. **Objectifs** — épargne ciblée avec deadline et contribution mensuelle
8. **Multi-devises** — 9 devises, taux gelé par transaction, mode pays
9. **Remboursements** — transactions en attente de remboursement
10. **Export** — CSV, PDF, JSON
11. **Module IA** *(v2)* — LLM branché sur le compte de l'utilisateur (Claude/GPT/Gemini/Mistral...)

---

## Roadmap phases

- **Phase 0** : Monorepo + Supabase + migrations + RLS + EAS
- **Phase 1** : Auth + biométrie + Keychain + verrouillage
- **Phase 2** : Core transactions (formulaire, liste, CRUD, TanStack Query, MMKV)
- **Phase 3** : Multi-devises (Edge Function cron, conversion temps réel)
- **Phase 4** : Visualisations + dashboard complet
- **Phase 5** : Récurrences + notifications push
- **Phase 6** : Budget + objectifs
- **Phase 7** : Investissements
- **Phase 8** : Export + settings + RGPD
- **Phase 9** : Publication App Store + Google Play

**Phase courante** : Phase 0

---

## Décisions d'architecture clés (ADR)

- **ADR-001** : React Native + Expo (pas Flutter, pas PWA seule) — stack JS, maturité Expo, push iOS natifs
- **ADR-002** : Supabase (pas Firebase) — PostgreSQL + RLS plus sûr pour données financières
- **ADR-003** : Mutations optimistes via TanStack Query — UX instantanée, rollback auto
- **ADR-004** : Taux de change en BDD via Edge Function — jamais depuis le client
- **ADR-005** : amount_eur gelé à la saisie — cohérence historique des données financières
- **ADR-006** : Monorepo pnpm + core séparé — logique métier testable sans simulateur
- **ADR-007** : workspace_id sur toutes les tables — anticipe le multi-utilisateurs sans migration

---

*Ce fichier est la source de vérité pour Claude Code. Il doit être mis à jour à chaque décision architecturale majeure.*
*Documentation complète → Notion : https://www.notion.so/32127748ca0281ad968bebf687fb73e1*