# FinTrack — Contexte projet pour Claude Code

## Vue d'ensemble

Application de gestion financière personnelle. **v1 = web-first** (Next.js, responsive + PWA installable). Le mobile natif (Expo) existe déjà dans le monorepo (`apps/mobile`, travail de l'ère mobile-first) mais n'est **pas** la cible v1 ; il est conservé pour la v2, pas retravaillé pour l'instant.

Obsessions du projet : **friction zéro à la saisie**, **UI de qualité professionnelle**, **sécurité bancaire-grade**.

**Documentation complète** : Wiki Notion → https://www.notion.so/32127748ca0281ad968bebf687fb73e1

**Phase courante : Phases 0→5 livrées (web). Prochaine : Phase 6 — récurrences.**

> ⚠️ Tout le travail web vit sur des **branches `feat/web-*` empilées, non mergées dans `main`** (`main` est resté à l'état mobile-first). Voir *Workflow Git*.

---

## Stack technique (réel)

| Couche | Technologie |
|---|---|
| Web app | Next.js 15 (App Router, RSC) — `apps/web` |
| Styling | Tailwind CSS v4 (CSS-first, `@theme inline`) |
| Composants | shadcn/ui + Radix — **dans `apps/web/components/ui`** (voir ADR-010) |
| Graphes | Recharts 2.x |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| State | Zustand |
| Queries / mutations | TanStack Query v5 (mutations optimistes) |
| Formulaires | React Hook Form + Zod (v4) |
| Toasts | sonner |
| Tests | Vitest (unit, sur `packages/core`) |
| Hébergement | Vercel (free tier) |
| CI/CD | GitHub Actions |
| Monorepo | pnpm workspaces + Turborepo |
| Langage | TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Node | **22** (`.nvmrc`, CI) — Node 20 fait planter ESLint 10 |

Client Supabase : `@supabase/ssr ^0.12` + `@supabase/supabase-js ^2.112` (alignés — cf. *Pièges connus*).

---

## Structure du monorepo (réel)

```
fintrack/
├── apps/
│   ├── web/                      ← Next.js 15 — LA cible v1
│   │   ├── app/
│   │   │   ├── (auth)/           ← login, signup, forgot-password, reset-password
│   │   │   ├── (app)/            ← dashboard, transactions, settings/security (protégé)
│   │   │   ├── auth/callback/    ← échange du code PKCE (email + reset)
│   │   │   ├── mfa/              ← step-up 2FA au login
│   │   │   ├── privacy/          ← RGPD (template, à faire relire juridiquement)
│   │   │   └── icon.svg          ← favicon (logo or)
│   │   ├── components/
│   │   │   ├── ui/               ← shadcn primitives (button, input, dialog, select, command, popover, sonner…)
│   │   │   ├── dashboard/        ← charts Recharts + stat tiles
│   │   │   ├── transactions/     ← dialog de saisie, liste, combobox devise
│   │   │   ├── app-shell, logo, theme-provider, theme-toggle, providers, IdleTimeout
│   │   ├── hooks/                ← use-transactions (optimiste)
│   │   ├── lib/                  ← supabase (client/server/middleware), auth (actions, mfa), transactions, dashboard, currencies, env, utils
│   │   └── middleware.ts         ← refresh session + garde de routes + gate AAL2
│   └── mobile/                   ← Expo (ère mobile-first, v2 — non retravaillé ; lint en dette)
├── packages/
│   ├── core/                     ← Logique métier pure — ZERO dépendance React/Next/Supabase. 90 tests Vitest.
│   │   └── src/
│   │       ├── calculations/     ← balance, budget, dashboard (donut/sparkline), health-score
│   │       ├── currency/         ← conversion (convertToEur), formatting (Intl)
│   │       ├── validators/       ← Zod (transaction-schema) + impératifs (auth, mfa, transaction, recurring)
│   │       └── types/            ← types partagés + SUPPORTED_CURRENCIES (165)
│   ├── ui/                       ← **tokens React Native (pour le mobile v2)** — PAS le design system web
│   └── api-client/               ← Client Supabase typé + database.types.ts (généré)
├── supabase/
│   ├── migrations/               ← Schéma versionné (8 migrations)
│   ├── functions/
│   │   ├── exchange-rates/       ← Cron quotidien : MAJ des taux (open.er-api.com, sans clé)
│   │   ├── send-notifications/   ← (stub — Phase 6, Web Push récurrences)
│   │   └── export-pdf/           ← (stub — Phase 9)
│   └── seed.sql
└── docs/adr/
```

---

## Schéma de base de données

```
workspaces          ← Unité de partage (1 par user en v1, N en v2)
workspace_members   ← workspace_id + user_id + role + accepted_at
profiles            ← Extension auth.users (default_currency, locale…)
categories          ← Personnalisables par workspace (14 par défaut, dont Sport)
transactions        ← Table centrale (+ amount_eur gelé, + rate_approximate)
recurring_rules     ← Règles de récurrence (≠ transactions) — table prête, feature Phase 6
exchange_rates      ← Taux globaux (165 devises), écrits par l'Edge Function uniquement
budgets             ← Enveloppes par catégorie (Phase 7)
investments         ← Positions de portefeuille (Phase 8)
goals               ← Objectifs d'épargne (Phase 7)
push_subscriptions  ← (Phase 6)
```

**Point critique** : toutes les tables métier ont un `workspace_id`, jamais un `user_id` direct (anticipe le multi-utilisateurs). Workspace + profil + catégories par défaut créés automatiquement au signup via triggers PostgreSQL.

**RLS activé sur les 10 tables `public`** (vérifié). Règle fondamentale :
```sql
workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
)
```
**Couche 2FA (AAL2)** : policies `RESTRICTIVE` sur les tables financières — un user ayant un facteur TOTP vérifié ne peut lire/écrire ses données qu'avec une session `aal2` (non contournable côté serveur). Voir `20260822000000_mfa_aal2_rls.sql`.

---

## Règles de développement — À RESPECTER ABSOLUMENT

### Architecture
- **`packages/core` n'importe JAMAIS React, Next.js ou Supabase.** Logique pure, testée en Node. C'est ce qui rend le mobile v2 peu coûteux.
- Les mutations sont **optimistes** (TanStack Query) : UI mise à jour avant confirmation serveur, **rollback + toast** en cas d'échec. ⚠️ Toujours remplacer la ligne optimiste par la vraie réponse serveur dans `onSuccess` (l'estimation client de `amount_eur` est fausse pour les devises ≠ EUR).
- Le `amount_eur` est **gelé** à la saisie/édition avec le taux du moment (jamais recalculé rétroactivement). Calcul côté serveur (Server Action), pas côté client. Flag `rate_approximate` si le taux avait > 48 h.
- **Validation** : Zod pour les transactions (`transactionInputSchema` partagé form ↔ serveur). Les validateurs auth/mfa/recurring restent **impératifs** (legacy, testés) — à migrer vers Zod à l'occasion, sans les casser.
- RSC pour les pages de consultation (premier paint), Client Components pour les interactions.

### Sécurité
- Mots de passe : **bcrypt via Supabase/GoTrue** — jamais de hachage maison.
- **2FA TOTP** (Supabase MFA) : enrôlement `/settings/security`, step-up `/mfa`, enforcement middleware + RLS AAL2. Doit être **activé dans le dashboard Supabase** en prod (désactivé par défaut).
- Les taux de change sont appelés **exclusivement** par l'Edge Function (`service_role`) — jamais depuis le client.
- Re-auth après 30 min d'inactivité : `IdleTimeout` (client-side, best-effort ; renforcer via JWT court côté serveur).
- Aucune donnée financière dans les logs.
- Redirect `next` du callback auth validé (chemins internes only — anti open-redirect).

### Conventions de code
- TypeScript strict, pas de `any` (`unknown`).
- `camelCase` / `PascalCase` / `SCREAMING_SNAKE`. Un composant = un fichier.
- Imports relatifs `.js`-less côté `apps/web` (Next bundler) ; `.js` suffixés dans `packages/core` (ESM compilé).
- Accessibilité non négociable : clavier + labels.

### Tests
- Tout nouveau code dans `packages/core` DOIT avoir un test Vitest. **90 tests actuellement, tous verts.**
- Coverage cible 80 % sur `packages/core`.
- `apps/web` : pas encore de tests (E2E Playwright prévu Phase 9).

---

## Multi-devises

- **165 devises** (toutes celles cotées par le fournisseur, sauf le DTS/XDR). Liste : `SUPPORTED_CURRENCIES` dans `packages/core`.
- **Fournisseur : open.er-api.com** (gratuit, sans clé, ~160 devises dont MAD/AED que la BCE/Frankfurter ne fournit pas).
- Métadonnées d'affichage **auto-générées** (`apps/web/lib/currencies.ts` → `currencyMeta`) : drapeau depuis le code pays ISO, nom FR via `Intl.DisplayNames`. Ne PAS écrire une table à la main.
- Sélecteur devise = **combobox avec recherche** (cmdk) — filtre code + nom.
- `exchange_rates` bootstrappé par migration (intégrité FK) et rafraîchi **quotidiennement** par l'Edge Function (`pg_cron` 16h UTC ≈ 17h CET via `pg_net` + secrets Vault). Fallback : si l'API échoue, on garde les derniers taux.

---

## Design system

- Marque : **or `#C9A961`** (logo = 3 barres), sur base **charbon chaud**. Tokens CSS dans `apps/web/app/globals.css` (light + dark, `next-themes`).
- L'or est un **accent en aplat** (boutons, focus, logo, sparkline) avec texte foncé dessus — **jamais en texte sur fond clair** (contraste ~2.2:1, échoue WCAG). Les liens = texte foreground + souligné or.
- **Graphes** : palette catégorielle multi-teintes validée (skill dataviz), tokens `--chart-1..6`. Toujours **valider une nouvelle palette** avec le script du skill avant de shipper.

---

## Variables d'environnement

```bash
# apps/web/.env.local (ne jamais committer ; gitignore OK)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # Phase 6
NEXT_PUBLIC_SITE_URL=              # fallback redirect email

# Secrets Supabase (Vault / dashboard, jamais côté client)
SUPABASE_SERVICE_ROLE_KEY=        # Edge Functions
VAPID_PRIVATE_KEY= / VAPID_SUBJECT= / RESEND_API_KEY=   # Phase 6
# NB : open.er-api.com est SANS CLÉ → pas de EXCHANGE_RATE_API_KEY nécessaire.
```

---

## Commandes utiles

```bash
nvm use                             # Node 22 (.nvmrc)
pnpm dev                            # Next.js dev (apps/web)  — NE PAS lancer `next build` en parallèle (corrompt .next)
pnpm --filter @fintrack/core test   # tests unitaires
pnpm turbo typecheck lint --filter=@fintrack/core --filter=@fintrack/web   # (exclut le lint mobile cassé)
pnpm --filter @fintrack/web build

supabase start                      # Postgres + Studio (54323) + Inbucket emails (54324)
supabase migration up --local       # applique les migrations SANS wiper les données
supabase db reset                   # reset + migrations + seed (wipe)
supabase functions serve exchange-rates --no-verify-jwt   # tester l'Edge Function en local
pnpm dlx supabase@latest gen types typescript --local > packages/api-client/src/database.types.ts
```

---

## Workflow Git

`main` = prod (protégée, PR obligatoires). Tout le web est sur des branches `feat/web-*` **empilées** (`phase-0` → `phase-1` → … → `phase-5` → `enhancements`), **aucune encore mergée** dans `main`. Ouvrir les PR dans l'ordre. Le CLI `gh` n'est pas dispo dans l'env → PR via lien navigateur.

Commits : `type(scope): description`. **Jamais de push direct sur `main`.**

---

## Modules fonctionnels

1. **Dashboard** — solde, sparkline, donut catégories, histogramme mensuel, score de santé ✅
2. **Saisie rapide** — Dialog + raccourci `N`, < 5 s ✅
3. **Transactions** — liste, édition/duplication/suppression, mutations optimistes ✅
4. **Abonnements / Récurrences** — Phase 6 (table prête, génération auto via `pg_cron`)
5. **Budget** — Phase 7
6. **Investissements** — Phase 8
7. **Objectifs** — Phase 7
8. **Multi-devises** — 165 devises, taux gelé, flag approximatif ✅
9. **Remboursements** — catégorie présente, workflow à préciser
10. **Export** — CSV/PDF/JSON — Phase 9
11. **Module IA** — v2

---

## Roadmap

- **Phase 0** ✅ Socle : monorepo, Next.js, Supabase, migrations, RLS, CI
- **Phase 1** ✅ Auth + middleware + 2FA TOTP + onboarding + RGPD
- **Phase 2** ✅ Design system (shadcn dans apps/web) + shell + responsive + rebrand or
- **Phase 3** ✅ Transactions (Zod, formulaire, liste, TanStack Query optimiste)
- **Phase 4** ✅ Multi-devises (Edge Function open.er-api, 165 devises, flag approximatif)
- **Phase 5** ✅ Dashboard + visualisations Recharts
- **Phase 6** ← *prochaine* : Récurrences (génération auto pg_cron) + PWA + Web Push
- **Phase 7** : Budget + objectifs
- **Phase 8** : Investissements
- **Phase 9** : Export + **Réglages (compte : email/mdp)** + accessibilité + E2E

**Backlog v2** : app mobile Expo (reprise), Open Banking (détection auto d'abonnements), module IA, multi-utilisateurs.

---

## ADR — décisions clés

- **ADR-002** : Supabase (pas Firebase) — PostgreSQL + RLS.
- **ADR-003** : Mutations optimistes via TanStack Query.
- **ADR-004** : Taux de change en BDD via Edge Function — jamais depuis le client.
- **ADR-005** : `amount_eur` gelé à la saisie.
- **ADR-006** : Monorepo pnpm + `core` séparé.
- **ADR-007** : `workspace_id` sur toutes les tables.
- **ADR-008** : Pivot web-first Next.js, mobile Expo en v2 *(remplace ADR-001)*.
- **ADR-009** : Web Push VAPID en v1 (Phase 6), APNs natifs en v2.
- **ADR-010** *(session)* : shadcn/ui vit dans `apps/web/components/ui`, PAS dans `packages/ui` (qui reste tokens React Native pour le mobile v2). Design system web et mobile disjoints, assumé.
- **ADR-011** *(session)* : taux de change via **open.er-api.com** (gratuit, sans clé, MAD/AED inclus) plutôt que Frankfurter (ECB, pas de MAD/AED) ou un fournisseur à clé. Cron quotidien.
- **ADR-012** *(session)* : support de **165 devises** (étend le « 9 » initial) grâce aux métadonnées auto-générées — motivé par les besoins voyageurs.

---

## Pièges connus (vérifiés dans cette session)

- **`@supabase/ssr` doit être aligné avec `supabase-js`.** ssr 0.6 ne transmet pas le générique `Database` à supabase-js ≥ 2.100 → toutes les tables typées `never`, `.insert()` refusé. Fix : ssr `^0.12` + supabase-js `^2.112`, puis régénérer `database.types.ts` avec un CLI récent (`pnpm dlx supabase@latest gen types`).
- **Ne jamais lancer `next build` pendant que `pnpm dev` tourne** (même dossier `.next`) → assets corrompus. Stopper le dev d'abord.
- **`git reset --hard` détruit les modifs non commitées** (c'est ainsi qu'une version antérieure de ce fichier a été perdue). Committer avant tout reset.
- **`database.types.ts` est généré** → ignoré par ESLint (`eslint.config.mjs`). Ne pas l'éditer à la main.
- **Lint mobile cassé** (45 erreurs pré-existantes) → scoper les commandes turbo sur `@fintrack/core` + `@fintrack/web`. La CI ne lance pas le lint.
- **Drapeaux emoji** : rendus sur macOS/iOS/Android, remplacés par le code pays sur Windows (le code devise reste affiché → pas de perte d'info).

---

*Source de vérité pour Claude Code. À mettre à jour à chaque décision architecturale majeure.*
*Documentation complète → https://www.notion.so/32127748ca0281ad968bebf687fb73e1*
