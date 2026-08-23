# FinTrack — Contexte projet pour Claude Code

## Vue d'ensemble

Application de gestion financière personnelle. **v1 = web-first** (Next.js, responsive + PWA installable). Le mobile natif (Expo) existe déjà dans le monorepo (`apps/mobile`, travail de l'ère mobile-first) mais n'est **pas** la cible v1 ; il est conservé pour la v2, pas retravaillé pour l'instant.

Obsessions du projet : **friction zéro à la saisie**, **UI de qualité professionnelle**, **sécurité bancaire-grade**.

**Documentation complète** : Wiki Notion → https://www.notion.so/32127748ca0281ad968bebf687fb73e1

**Phase courante : Phases 0→8 livrées (web), mergées dans `main`, CI verte. Prochaine : Phase 9 — export + réglages compte + accessibilité + E2E.**

> `main` contient tout le travail web à jour. Workflow : une branche `feat/web-phase-N` par phase, mergée dans `main` (`--no-ff`) en fin de phase une fois le CI vérifié. Voir *Workflow Git*.

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
│   │   │   ├── (app)/            ← dashboard, transactions, subscriptions, budget, goals, settings/security (protégé)
│   │   │   ├── auth/callback/    ← échange du code PKCE (email + reset)
│   │   │   ├── mfa/              ← step-up 2FA au login
│   │   │   ├── privacy/          ← RGPD (template, à faire relire juridiquement)
│   │   │   └── icon.svg          ← favicon (logo or)
│   │   ├── components/
│   │   │   ├── ui/               ← shadcn primitives (button, input, dialog, select, command, popover, sonner…)
│   │   │   ├── dashboard/        ← charts Recharts + stat tiles + upcoming-recurring
│   │   │   ├── transactions/     ← dialog de saisie, liste, combobox devise
│   │   │   ├── recurring/        ← dialog + liste des abonnements
│   │   │   ├── budgets/          ← dialog + liste (barres de progression)
│   │   │   ├── goals/            ← dialog + liste (jauges de progression)
│   │   │   ├── app-shell, logo, theme-provider, theme-toggle, providers, IdleTimeout
│   │   ├── hooks/                ← use-transactions, use-recurring, use-budgets, use-goals (optimistes)
│   │   ├── lib/                  ← supabase (client/server/middleware), auth (actions, mfa), transactions, recurring, budgets, goals, dashboard, currencies, env, utils
│   │   └── middleware.ts         ← refresh session + garde de routes + gate AAL2
│   └── mobile/                   ← Expo (ère mobile-first, v2 — non retravaillé ; lint en dette)
├── packages/
│   ├── core/                     ← Logique métier pure — ZERO dépendance React/Next/Supabase. 151 tests Vitest.
│   │   └── src/
│   │       ├── calculations/     ← balance (+savingsRate), budget (+suggestion), dashboard, goal, health-score, investments (P&L, allocation, historique)
│   │       ├── currency/         ← conversion (convertToEur), formatting (Intl)
│   │       ├── validators/       ← Zod (transaction/recurring/budget/goal/investment-schema) + impératifs (auth, mfa, transaction, recurring)
│   │       └── types/            ← types partagés + SUPPORTED_CURRENCIES (165)
│   ├── ui/                       ← **tokens React Native (pour le mobile v2)** — PAS le design system web
│   └── api-client/               ← Client Supabase typé + database.types.ts (généré)
├── supabase/
│   ├── migrations/               ← Schéma versionné (10 migrations)
│   ├── functions/
│   │   ├── exchange-rates/       ← Cron quotidien : MAJ des taux (open.er-api.com, sans clé)
│   │   ├── send-notifications/   ← (stub — Web Push récurrences, reste de la Phase 6)
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
recurring_rules     ← Règles de récurrence (≠ transactions, GÉNÈRE des transactions) ✅
exchange_rates      ← Taux globaux (165 devises), écrits par l'Edge Function uniquement
budgets             ← Enveloppes par catégorie, alertes 80%/100% ✅
investments         ← Positions de portefeuille (P&L latent/réalisé, allocation) ✅
investment_valuations ← Historique de valorisation par position (courbe temporelle) ✅
goals               ← Objectifs d'épargne, contribution mensuelle calculée ✅
push_subscriptions  ← (reste de la Phase 6 — Web Push)
```

**Point critique** : toutes les tables métier ont un `workspace_id`, jamais un `user_id` direct (anticipe le multi-utilisateurs). Workspace + profil + catégories par défaut créés automatiquement au signup via triggers PostgreSQL.

**RLS activé sur les 11 tables `public`** (vérifié). Règle fondamentale :
```sql
workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
)
```
**Couche 2FA (AAL2)** : policies `RESTRICTIVE` sur **7 tables financières** (`categories`, `transactions`, `recurring_rules`, `budgets`, `investments`, `investment_valuations`, `goals`) — un user ayant un facteur TOTP vérifié ne peut lire/écrire ces données qu'avec une session `aal2` (non contournable côté serveur). Voir `20260822000000_mfa_aal2_rls.sql` + `20260825000000_investments_portfolio.sql`.

⚠️ **Règle à appliquer dès la conception pour toute future page lisant une table financière** : elle **doit** être ajoutée à `AUTH_REQUIRED_PREFIXES` et `AAL2_GATED_PREFIXES` dans `apps/web/lib/supabase/middleware.ts`, sinon un user 2FA bloqué en AAL1 atterrit sur la page et voit des données vides silencieusement au lieu d'être renvoyé vers `/mfa` (bug trouvé et corrigé en Phase 6 pour `/transactions`/`/subscriptions`, appliqué dès la conception pour `/budget`/`/goals` en Phase 7 et `/investments` en Phase 8).

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
- Tout nouveau code dans `packages/core` DOIT avoir un test Vitest. **151 tests actuellement, tous verts, 98,6 % de couverture.**
- Coverage cible 80 % sur `packages/core`.
- `apps/web` : pas encore de tests (E2E Playwright prévu Phase 9). Vérification actuelle = API REST directe (curl/node) contre Supabase local + tests de garde de routes.

### Récurrences (Phase 6)
- Une `recurring_rule` **n'est pas** une transaction — elle en **génère**. Fonction SQL pure `generate_due_recurring_transactions()` (`supabase/functions` non, c'est une fonction PostgreSQL dans une migration), appelée quotidiennement à 05h00 UTC par `pg_cron` (appel direct, pas de `pg_net` car interne à la DB).
- Rattrape **toutes** les échéances en retard depuis `next_occurrence` (boucle `while`), gèle `amount_eur` au taux courant (+ flag `rate_approximate`), lie la transaction via `recurring_rule_id`, avance le curseur `next_occurrence`. **Idempotente** (vérifié : re-run = 0 nouvelle transaction).
- Éditer une règle ne touche jamais `start_date`/`next_occurrence` (curseur système, jamais re-backfillé par une édition).
- Supprimer une règle **garde** les transactions déjà générées (`recurring_rule_id` → `ON DELETE SET NULL`).

### Budget & Objectifs (Phase 7)
- `budgets`/`goals` stockent **directement en EUR** (`amount_eur`, `target_amount_eur`, `current_amount_eur` — pas de colonne `currency`) : formulaires sans `CurrencyCombobox`, juste un input EUR.
- Contrainte unique `(workspace_id, category_id, period)` sur `budgets` — un budget par catégorie et par période. `createBudgetAction`/`updateBudgetAction` mappent l'erreur Postgres `23505` (unique_violation) vers un message clair plutôt que de la laisser remonter brute.
- Barres de progression : vert (`--success`) < 80 %, orange (`--chart-3`) 80–99 %, rouge (`--destructive`) ≥ 100 % — seuils déjà encodés dans `calculateBudgetStatuses` (`isWarning`/`isExceeded`), présents depuis la Phase 5.
- « Aucun budget défini = aucune barre affichée » (jamais de valeur arbitraire) — règle explicite de la Spec Fonctionnelle Notion.
- Suggestion de budget = moyenne des 3 mois calendaires **précédents** (exclut le mois en cours, forcément partiel).
- Contribution mensuelle nécessaire d'un objectif = `(cible − actuel) / mois restants`, mois restants planchés à 1. Statut `overdue` si échéance dépassée sans avoir atteint la cible (= alerte « contribution insuffisante »).
- Éditer un budget/objectif ne touche jamais `created_at` ; éditer une règle récurrente reste le seul cas où un champ « curseur système » (`next_occurrence`) est protégé contre l'édition.

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

**Une branche par phase, mergée dans `main` en fin de phase.** `main` contient tout le travail livré (Phases 0→6). Processus à chaque fin de phase :
1. `git checkout -b feat/web-phase-N main`, développer, committer.
2. **Avant de merger**, vérifier le CI en conditions réelles en local (voir *Pièges connus* — sinon le decalage core/dist fait planter le CI) :
   ```bash
   rm -rf packages/core/dist apps/web/.next
   pnpm turbo lint typecheck --filter=@fintrack/core --filter=@fintrack/web
   NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key pnpm turbo build --filter=@fintrack/web
   pnpm --filter @fintrack/core test:coverage
   ```
3. `git checkout main && git merge --no-ff feat/web-phase-N && git push origin main`.
4. **Mettre à jour ce `CLAUDE.md`** (roadmap, ADR si décision d'archi, pièges connus) — À FAIRE SYSTÉMATIQUEMENT à chaque fin de phase, ne pas attendre qu'on le demande.
5. Vérifier le run CI sur GitHub Actions — `gh` **est disponible** dans l'env (`gh pr checks --watch`, `gh run watch <id> --exit-status`) depuis la Phase 7, plus besoin de vérification manuelle au navigateur.

Commits : `type(scope): description`. **Jamais de push direct sur `main` sans être passé par une branche + vérif CI locale d'abord.**

---

## Modules fonctionnels

1. **Dashboard** — solde, sparkline, donut catégories, histogramme mensuel, score de santé ✅
2. **Saisie rapide** — Dialog + raccourci `N`, < 5 s ✅
3. **Transactions** — liste, édition/duplication/suppression, mutations optimistes ✅
4. **Abonnements / Récurrences** — CRUD + génération auto via `pg_cron`, dashboard "prochains prélèvements" ✅ (Web Push notifications restant)
5. **Budget** — CRUD, barres de progression 80%/100%, suggestion 3 mois, taux d'épargne ✅
6. **Investissements** — CRUD positions, P&L latent/réalisé, allocation par classe/devise, courbe de valorisation, encart patrimoine dashboard ✅
7. **Objectifs** — CRUD, jauge, contribution mensuelle nécessaire, alerte échéance dépassée ✅
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
- **Phase 6** ✅ Récurrences (génération auto pg_cron, CRUD, dashboard) — *reste* : PWA + Web Push
- **Phase 7** ✅ Budget (progression, alertes, suggestion, taux d'épargne) + Objectifs (jauge, contribution mensuelle)
- **Phase 8** ✅ Investissements (positions, P&L latent/réalisé, allocation, courbe de valorisation, encart patrimoine)
- **Phase 9** ← *prochaine* : Export + **Réglages (compte : email/mdp)** + accessibilité + E2E

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
- **ADR-013** *(Phase 6)* : génération des transactions récurrentes en **fonction PostgreSQL pure + `pg_cron`** (pas d'Edge Function ni `pg_net`) — la logique ne dépend d'aucune API externe, donc autant rester 100 % en base : plus simple, pas de secret Vault à gérer, plus robuste (tourne même si les Edge Functions sont down).
- **ADR-014** *(Phase 6)* : workflow Git formalisé — une branche par phase, merge `--no-ff` dans `main` en fin de phase après vérification CI locale (voir *Workflow Git*). `CLAUDE.md` mis à jour à chaque fin de phase, systématiquement.
- **ADR-015** *(Phase 8)* : `investments` étendue plutôt que réécrite. Deux sources Notion (Spec Fonctionnelle Module 6, page « Schéma de Base de Données ») décrivaient un modèle différent (`type`/`amount_invested`/`current_value`, et la seconde encore en `user_id` — un brouillon antérieur au pivot `workspace_id`, ADR-007). Le schéma déjà livré (`quantity`/`buy_price_eur`/`current_price_eur`) est plus précis pour le P&L ; `montant investi`/`valeur actuelle` en sont dérivés, pas dupliqués. Colonnes additives (`asset_type`, `broker`, `opened_at`, `notes`, `closed_at`, `sale_price_eur`) + nouvelle table `investment_valuations` pour l'historique de valorisation (absent des deux schémas Notion, pourtant requis par la Roadmap).

---

## Pièges connus (vérifiés dans cette session)

- **`@supabase/ssr` doit être aligné avec `supabase-js`.** ssr 0.6 ne transmet pas le générique `Database` à supabase-js ≥ 2.100 → toutes les tables typées `never`, `.insert()` refusé. Fix : ssr `^0.12` + supabase-js `^2.112`, puis régénérer `database.types.ts` avec un CLI récent (`pnpm dlx supabase@latest gen types`).
- **Ne jamais lancer `next build` pendant que `pnpm dev` tourne** (même dossier `.next`) → assets corrompus. Stopper le dev d'abord.
- **`git reset --hard` détruit les modifs non commitées** (c'est ainsi qu'une version antérieure de ce fichier a été perdue). Committer avant tout reset.
- **Le repo était dans `~/Desktop`, synchronisé iCloud** → créait périodiquement des copies de conflit `« fichier 2.ext »` (voire des `.sql` dupliqués dans `supabase/migrations/`, dangereux pour `db reset`). **Résolu le 23/08/2026** : synchro iCloud désactivée pour ce dossier. Si des fichiers `« … 2.* »` réapparaissent, c'est le signe que la synchro a été réactivée par erreur.
- **`database.types.ts` est généré** → ignoré par ESLint (`eslint.config.mjs`). Ne pas l'éditer à la main.
- **Lint mobile cassé** (45 erreurs pré-existantes) → scoper les commandes turbo sur `@fintrack/core` + `@fintrack/web`.
- **Drapeaux emoji** : rendus sur macOS/iOS/Android, remplacés par le code pays sur Windows (le code devise reste affiché → pas de perte d'info).
- **Le CI doit builder `@fintrack/core` avant de typechecker/builder le web** (`main`/`types` de core pointent vers `./dist`, absent tant que non buildé). Le CI utilise désormais **Turbo** (`pnpm turbo lint typecheck` / `pnpm turbo build --filter=@fintrack/web`), dont les tâches ont `dependsOn: ["^build"]` → core buildé en premier automatiquement. Ne JAMAIS revenir à `pnpm --filter @fintrack/web typecheck` en direct dans le CI (ça a cassé le pipeline une fois, cf. `.github/workflows/ci.yml`). Le **lint est activé** dans le CI depuis ce fix (scopé core+web).
- **Gate AAL2 du middleware** : toute page qui lit une table financière (voir liste plus haut) doit être ajoutée à `AUTH_REQUIRED_PREFIXES` **et** `AAL2_GATED_PREFIXES` dans `apps/web/lib/supabase/middleware.ts`. Oublié pour `/transactions` et `/subscriptions` jusqu'à ce que ce soit trouvé et corrigé en Phase 6 — vérifier systématiquement pour Phase 7/8 (`/budget`, `/investments`, `/goals`).

---

## Outillage & Capacités Locales

- **GitHub CLI (`gh`)** : Disponible pour gérer les PRs et le statut de la CI (`gh pr create`, `gh pr checks --watch`, `gh run view --log-failed`).
- **Base de données & Docker** : Supabase local tourne sous Docker (`localhost:54322`). Toujours inspecter le schéma ou tester les migrations via le client local avant de valider.
- **Notion** : MCP connecté. Consulter le Wiki du projet avant d'entamer une nouvelle phase pour aligner les specs, et mettre à jour les pages de suivi une fois la phase livrée.

## Protocole de livraison autonome

1. **Specs** : Consulter la doc Notion liée à la phase courante.
2. **Implémentation & Tests** :
   - Coder les migrations / RLS / composants / tests Vitest.
   - Valider la suite de checks locaux (`turbo lint typecheck`, tests core).
3. **Publication** :
   - Ouvrir la PR via `gh pr create --fill`.
   - Surveiller le run avec `gh pr checks --watch`.
   - Si la CI échoue, analyser les logs (`gh run view --log-failed`), corriger et repousser.
4. **Clôture** :
   - Mettre à jour `CLAUDE.md` (ADR, pièges connus, roadmap).
   - Mettre à jour le Wiki Notion avec l'avancement.

---

*Source de vérité pour Claude Code. **À mettre à jour systématiquement à la fin de chaque phase** (pas seulement sur décision d'archi majeure) : roadmap, structure, compteurs (tests/migrations), nouveaux ADR, nouveaux pièges connus. C'est une étape du workflow de fin de phase (voir *Workflow Git*), pas une tâche à part.*
*Documentation complète → https://www.notion.so/32127748ca0281ad968bebf687fb73e1*
