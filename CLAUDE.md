# FinTrack — Contexte projet pour Claude Code

## Vue d'ensemble

Application de gestion financière personnelle. **v1 = web-first** (Next.js, responsive + PWA installable). Le mobile natif (Expo) existe déjà dans le monorepo (`apps/mobile`, travail de l'ère mobile-first) mais n'est **pas** la cible v1 ; il est conservé pour la v2, pas retravaillé pour l'instant.

Obsessions du projet : **friction zéro à la saisie**, **UI de qualité professionnelle**, **sécurité bancaire-grade**.

**Documentation complète** : Wiki Notion → https://www.notion.so/32127748ca0281ad968bebf687fb73e1

**Phase courante : Phase 10 — Frictions du quotidien livrée (catégories personnalisables, détection auto de catégorie, remboursements, vue mensuelle, mode pays), mergée dans `main`, CI verte. v1.0.0 + v1.1 taguées — backlog restant : v2 (voir Roadmap).**

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
│   │   │   ├── (app)/            ← dashboard, transactions, subscriptions, budget, goals, investments, settings/{account,security,categories,notifications,export} (protégé)
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
│   │   │   ├── investments/      ← dialogs (position/valorisation/clôture), allocation donuts, courbe de performance
│   │   │   ├── categories/       ← dialog (nom/icône/couleur) + liste (visibles/masquées) — Phase 10
│   │   │   ├── settings/         ← export (CSV/JSON/PDF), settings-nav (Compte/Sécurité/Catégories/Notifications/Export), push-notifications-card
│   │   │   ├── app-shell, logo, theme-provider, theme-toggle, providers, IdleTimeout
│   │   ├── hooks/                ← use-transactions (+ catégories, remboursements), use-recurring, use-budgets, use-goals, use-investments, use-categories (optimistes)
│   │   ├── lib/                  ← supabase (client/server/middleware), auth (actions incl. update email/change password, mfa), transactions (+ merchant/remboursement), recurring, budgets, goals, investments, categories, profile (devise par défaut), export (queries/csv/json/pdf/download), dashboard, currencies, push, env, utils
│   │   ├── e2e/                  ← Playwright (chromium + webkit) : auth, transactions, budget/goals, export, mfa/AAL2, accessibilité (axe-core)
│   │   └── middleware.ts         ← refresh session + garde de routes + gate AAL2
│   └── mobile/                   ← Expo (ère mobile-first, v2 — non retravaillé ; lint en dette)
├── packages/
│   ├── core/                     ← Logique métier pure — ZERO dépendance React/Next/Supabase. 209 tests Vitest.
│   │   └── src/
│   │       ├── calculations/     ← balance (+savingsRate), budget (+suggestion), dashboard, goal, health-score, investments (P&L, allocation, historique), reimbursements (solde en attente)
│   │       ├── categorization/   ← suggestCategoryId — détection heuristique déterministe (Phase 10, voir ADR-019)
│   │       ├── currency/         ← conversion (convertToEur), formatting (Intl)
│   │       ├── export/           ← CSV (RFC 4180) + JSON (sauvegarde complète RGPD) — transactions/budgets/investments
│   │       ├── validators/       ← Zod (transaction/recurring/budget/goal/investment/category-schema) + impératifs (auth incl. update email/password, mfa, transaction, recurring)
│   │       └── types/            ← types partagés + SUPPORTED_CURRENCIES (165)
│   ├── ui/                       ← **tokens React Native (pour le mobile v2)** — PAS le design system web
│   └── api-client/               ← Client Supabase typé + database.types.ts (généré)
├── supabase/
│   ├── migrations/               ← Schéma versionné (12 migrations)
│   ├── functions/
│   │   ├── exchange-rates/       ← Cron quotidien : MAJ des taux (open.er-api.com, sans clé)
│   │   └── send-notifications/   ← Cron quotidien 08h UTC : Web Push (VAPID) pour les récurrences J-3/J-1/J0 ✅
│   └── seed.sql
└── docs/adr/
```

---

## Schéma de base de données

```
workspaces          ← Unité de partage (1 par user en v1, N en v2)
workspace_members   ← workspace_id + user_id + role + accepted_at
profiles            ← Extension auth.users (default_currency, locale…)
categories          ← Personnalisables par workspace (14 par défaut, dont Sport ; + hidden depuis Phase 10)
transactions        ← Table centrale (+ amount_eur gelé, + rate_approximate, + merchant, + reimbursement_status/contact/settled_transaction_id depuis Phase 10)
recurring_rules     ← Règles de récurrence (≠ transactions, GÉNÈRE des transactions) ✅
exchange_rates      ← Taux globaux (165 devises), écrits par l'Edge Function uniquement
budgets             ← Enveloppes par catégorie, alertes 80%/100% ✅
investments         ← Positions de portefeuille (P&L latent/réalisé, allocation) ✅
investment_valuations ← Historique de valorisation par position (courbe temporelle) ✅
goals               ← Objectifs d'épargne, contribution mensuelle calculée ✅
push_subscriptions  ← Abonnements Web Push par device/navigateur ✅ (v1.1 — n'existait pas avant, malgré la doc précédente)
```

**Point critique** : toutes les tables métier ont un `workspace_id`, jamais un `user_id` direct (anticipe le multi-utilisateurs). Workspace + profil + catégories par défaut créés automatiquement au signup via triggers PostgreSQL. **Exception assumée : `push_subscriptions`** — un abonnement push est personnel (lié à un device/navigateur précis), pas une donnée financière partagée ; la RLS y est scopée par `user_id = auth.uid()`, pas par appartenance au workspace (le `workspace_id` reste présent sur la table, pour la lookup service-role de l'Edge Function).

**RLS activé sur les 12 tables `public`** (vérifié). Règle fondamentale :
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
- Tout nouveau code dans `packages/core` DOIT avoir un test Vitest. **209 tests actuellement, tous verts, 98,7 % de couverture.**
- Coverage cible 80 % sur `packages/core`.
- `apps/web` : E2E Playwright (`apps/web/e2e/`, chromium + webkit) — signup/login, saisie rapide, budget/objectif, les 3 formats d'export, cycle complet 2FA/AAL2 (codes TOTP réels via `otpauth`), catégories (CRUD + masquage), remboursement (marquer/régler), navigation mensuelle, mode pays (devise par défaut → pré-remplissage). Audit d'accessibilité intégré : chaque page/dialog clé est scannée par `@axe-core/playwright` (WCAG 2 A/AA) dans la même suite — c'est le mécanisme d'audit, pas une relecture manuelle. Tourne en CI (job `E2E`) contre Supabase local + un vrai build de prod.

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

### Catégories, détection & remboursements (Phase 10)
- **Catégories** : jamais de suppression depuis l'UI (orphelinerait `transactions.category_id`, même si la FK a un `ON DELETE SET NULL`) — seulement `hidden` (masquage), qui les retire des sélecteurs sans toucher l'historique. Nom/icône/couleur éditables pour toute catégorie, y compris les catégories par défaut (`is_default`).
- **Détection de catégorie** (`suggestCategoryId`, `packages/core/src/categorization/suggest.ts`) : (1) correspondance exacte sur l'historique du même marchand/libellé (signal le plus fort), (2) sinon règles de mots-clés statiques matchées contre les **noms** de catégories du workspace (pas des IDs fixes, car personnalisables) ; renvoie `null` plutôt que de deviner faux. **Aucune dépendance IA/LLM** — voir ADR-019.
- **Remboursements** : `reimbursement_status` (`none`/`pending`/`settled`) sur `transactions`. Marquer réglé (`settleReimbursementAction`) crée une **nouvelle transaction de revenu liée** (`settled_transaction_id`) plutôt que de muter la dépense d'origine — préserve son `amount_eur` gelé (cohérent avec ADR-005). Éditer une transaction réglée ne peut jamais la faire redescendre en `pending`/`none` (le formulaire d'édition n'a pas de case à cocher pour ce 3ᵉ état).
- **Mode pays** : `profiles.default_currency` pré-remplit la devise du formulaire de saisie rapide (`updateDefaultCurrencyAction`, réglable depuis `/settings/account`) — n'affecte que les *nouvelles* transactions, jamais l'historique.
- **Vue mensuelle** : navigation M-1/M+1 sur `/transactions` (state client, pas d'URL — pas de deep-link vers un mois précis pour l'instant), totaux agrégés via `calculateTotals` déjà existant (Phase 5).

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
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # v1.1 — chaîne base64url (exportApplicationServerKey), PAS un JWK
NEXT_PUBLIC_SITE_URL=              # fallback redirect email

# Secrets Supabase (Vault / dashboard, jamais côté client)
SUPABASE_SERVICE_ROLE_KEY=        # Edge Functions
VAPID_PRIVATE_KEY= / VAPID_PUBLIC_KEY= / VAPID_SUBJECT=   # v1.1 — voir *Web Push* ci-dessous : VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sont chacun un JWK JSON (format @negrel/webpush), PAS des chaînes base64url — ne pas confondre avec NEXT_PUBLIC_VAPID_PUBLIC_KEY qui, lui, en est une
# NB : open.er-api.com est SANS CLÉ → pas de EXCHANGE_RATE_API_KEY nécessaire.
```

### Web Push — génération des clés VAPID

`@negrel/webpush` (voir *Pièges connus*) génère des clés au format JWK, incompatibles avec le CLI `web-push` npm classique. Recette pour en générer une paire fraîche en local (fonction Edge Function jetable, jamais committée) :

```bash
mkdir -p supabase/functions/vapidkeygen
cat > supabase/functions/vapidkeygen/index.ts <<'EOF'
import * as webpush from "https://raw.githubusercontent.com/negrel/webpush/master/mod.ts";
Deno.serve(async () => {
  const keys = await webpush.generateVapidKeys({ extractable: true });
  const exported = await webpush.exportVapidKeys(keys);
  const applicationServerKey = await webpush.exportApplicationServerKey(keys);
  return new Response(JSON.stringify({ exported, applicationServerKey }, null, 2));
});
EOF
supabase functions serve vapidkeygen --no-verify-jwt &
sleep 6
ANON_KEY=$(supabase status -o env | sed -n 's/^ANON_KEY="\(.*\)"/\1/p')
curl -s -X POST http://127.0.0.1:54321/functions/v1/vapidkeygen -H "Authorization: Bearer $ANON_KEY"
kill %1
rm -rf supabase/functions/vapidkeygen
```

La réponse donne trois valeurs : `exported.publicKey` et `exported.privateKey` (JWK — à JSON-stringifier tels quels dans `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`), et `applicationServerKey` (chaîne base64url — dans `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).

---

## Commandes utiles

```bash
nvm use                             # Node 22 (.nvmrc)
pnpm dev                            # Next.js dev (apps/web)  — NE PAS lancer `next build` en parallèle (corrompt .next)
pnpm --filter @fintrack/core test   # tests unitaires
pnpm turbo typecheck lint --filter=@fintrack/core --filter=@fintrack/web   # (exclut le lint mobile cassé)
pnpm --filter @fintrack/web build
pnpm --filter @fintrack/web exec playwright test              # E2E — nécessite Supabase local + app servie sur :3000 (auto via webServer si aucun serveur ne tourne déjà)
pnpm --filter @fintrack/web exec playwright test --ui         # E2E en mode UI (debug pas à pas)
pnpm --filter @fintrack/web exec playwright show-report       # rapport HTML du dernier run

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
4. **Abonnements / Récurrences** — CRUD + génération auto via `pg_cron`, dashboard "prochains prélèvements", alertes Web Push J-3/J-1/J0 ✅
5. **Budget** — CRUD, barres de progression 80%/100%, suggestion 3 mois, taux d'épargne ✅
6. **Investissements** — CRUD positions, P&L latent/réalisé, allocation par classe/devise, courbe de valorisation, encart patrimoine dashboard ✅
7. **Objectifs** — CRUD, jauge, contribution mensuelle nécessaire, alerte échéance dépassée ✅
8. **Multi-devises** — 165 devises, taux gelé, flag approximatif ; mode pays (devise par défaut du workspace) ✅
9. **Remboursements** — marquer une dépense « à rembourser », règlement via transaction de revenu liée, encart « en attente » sur `/transactions` ✅
10. **Export** — CSV (transactions, période paramétrable), JSON (sauvegarde complète, portabilité RGPD), PDF (rapport mensuel — résumé, répartition catégories, budgets, transactions) ✅
11. **Réglages du compte** — changement d'email (double confirmation Supabase), changement de mot de passe (ré-authentification), gestion 2FA TOTP ✅
12. **Catégories** — création/édition (nom/icône/couleur)/masquage, détection automatique déterministe à la saisie ✅
13. **Vue mensuelle** — navigation M-1/M+1 + totaux agrégés sur `/transactions` ✅
14. **Module IA** — v2

---

## Roadmap

- **Phase 0** ✅ Socle : monorepo, Next.js, Supabase, migrations, RLS, CI
- **Phase 1** ✅ Auth + middleware + 2FA TOTP + onboarding + RGPD
- **Phase 2** ✅ Design system (shadcn dans apps/web) + shell + responsive + rebrand or
- **Phase 3** ✅ Transactions (Zod, formulaire, liste, TanStack Query optimiste)
- **Phase 4** ✅ Multi-devises (Edge Function open.er-api, 165 devises, flag approximatif)
- **Phase 5** ✅ Dashboard + visualisations Recharts
- **Phase 6** ✅ Récurrences (génération auto pg_cron, CRUD, dashboard) — *Web Push livré en v1.1*
- **Phase 7** ✅ Budget (progression, alertes, suggestion, taux d'épargne) + Objectifs (jauge, contribution mensuelle)
- **Phase 8** ✅ Investissements (positions, P&L latent/réalisé, allocation, courbe de valorisation, encart patrimoine)
- **Phase 9** ✅ Export (CSV/JSON/PDF) + Réglages compte (email/mdp) + accessibilité (axe-core) + E2E Playwright (CI)

**v1.0.0 taguée.**

- **v1.1** ✅ Fermeture de dette technique + Developer Experience — Web Push effectif (Edge Function `send-notifications` réécrite, VAPID via `@negrel/webpush`), PWA (manifest, icônes, service worker), page Réglages → Notifications, `README.md`, `scripts/setup.sh` (setup 1-commande).
- **Phase 10** ✅ Frictions du quotidien — catégories personnalisables (CRUD + masquage), détection automatique de catégorie (heuristique déterministe, sans IA), workflow de remboursement (marquer/régler), vue mensuelle des transactions (M-1/M+1 + totaux), mode pays (devise par défaut).

Prochaine étape : backlog v2 (voir ci-dessous) — pas de v1.2/Phase 11 planifiée pour l'instant.

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
- **ADR-016** *(Phase 9)* : export PDF **généré côté client** (jsPDF, tableaux + un histogramme dessiné avec les primitives du package) plutôt qu'en finalisant le stub Edge Function `export-pdf`. Aucun round-trip serveur, aucun secret à gérer pour cette fonctionnalité, et surtout testable en E2E dans le même run que le reste (le stub, jamais implémenté, est supprimé — cf. Pièges connus pour la découverte qui a motivé ce choix). Le rapport est volontairement textuel/tabulaire plutôt qu'une capture des graphes Recharts du dashboard (pas de dépendance html2canvas/rasterisation SVG).
- **ADR-017** *(Phase 9)* : audit d'accessibilité fait via **scans automatisés `@axe-core/playwright`** intégrés à la suite E2E (chaque page/dialog clé, tags `wcag2a`/`wcag2aa`), pas une relecture manuelle du code. A immédiatement trouvé un vrai échec de contraste WCAG AA (`--muted-foreground` à 4,39:1, corrigé à 4,5:1+) qu'une relecture aurait pu manquer — preuve que l'automatisation est la bonne méthode ici, à reconduire pour toute nouvelle page.
- **ADR-018** *(v1.1)* : Web Push implémenté avec **`@negrel/webpush`** (Web Crypto API native, importé depuis GitHub raw — `jsr:@negrel/webpush` a renvoyé 403 en environnement Claude Code, contourné via `https://raw.githubusercontent.com/negrel/webpush/master/mod.ts`) plutôt que le package npm `web-push` (import `https://esm.sh/web-push@…?target=deno`). **Vérifié en local via `supabase functions serve`** : `web-push` échoue avec `Not implemented: crypto.ECDH` dans l'Edge Runtime (basé sur Node `crypto`, absent de ce runtime Deno) ; `@negrel/webpush` fonctionne (basé sur `crypto.subtle`, disponible). Conséquence assumée : les clés VAPID sont des paires JWK propres à cette librairie (générées via son propre script, pas via le CLI `web-push`), voir *Web Push — génération des clés VAPID* ci-dessus. `send-notifications` a été entièrement réécrite (le stub précédent visait Expo Push, pertinent pour le mobile v2, pas le web).
- **ADR-019** *(Phase 10)* : remboursement réglé = **nouvelle transaction de revenu liée** (`settled_transaction_id`), pas une mutation de la dépense d'origine. Alternative rejetée : changer le `type`/`amount` de la transaction existante — aurait cassé son `amount_eur` gelé (ADR-005) et son historique d'édition. Détection de catégorie volontairement **sans IA/LLM** (règles de mots-clés + historique du marchand) — déterministe, testable à 100 % en Vitest, aucune latence/coût d'appel externe, et le brief produit l'excluait explicitement.

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
- **Le package npm `web-push` ne fonctionne PAS dans l'Edge Runtime Supabase (Deno)** — `Not implemented: crypto.ECDH`, quelle que soit la façon dont on l'importe (`esm.sh?target=deno` inclus). Utiliser `@negrel/webpush` (Web Crypto API native). Voir ADR-018 et *Web Push — génération des clés VAPID*.
- **La Push API ne peut pas être testée end-to-end via Playwright.** Chromium refuse `pushManager.subscribe()` dans un contexte incognito (celui que Playwright utilise toujours par défaut) — `context.grantPermissions(["notifications"])` ne change rien à cette limite. WebKit, de son côté, ne fait pas passer `Notification.permission` à `"granted"` via `grantPermissions` sous Playwright (reste `"default"` même après l'appel). Les deux confirmés en local (v1.1) — pas un bug applicatif. `e2e/notifications.spec.ts` teste donc seulement le rendu de la page, pas le flux d'abonnement complet ; la fonction serveur est testée séparément via `supabase functions serve` + données de test insérées à la main (voir CLAUDE.md historique de session ou refaire la manip : insérer une `recurring_rule` avec `next_occurrence = current_date` et une `push_subscriptions` de test, puis `curl` la fonction).
- **`process.env[nom]` (accès dynamique) ne fonctionne JAMAIS côté navigateur.** Next.js inline les variables `NEXT_PUBLIC_*` en remplaçant l'expression **littérale** `process.env.NEXT_PUBLIC_X` à la compilation — un accès calculé (`process.env[name]`) ne peut jamais matcher ce pattern et vaut `undefined` dans tout bundle client. `lib/supabase/client.ts` utilisait le `requireEnv(name)` générique (conçu pour le serveur/edge, où `process.env` est un vrai objet) — cassé silencieusement en Phase 9, masqué partout ailleurs par le fallback `initialData` de TanStack Query qui ne fait jamais remonter l'échec du refetch en arrière-plan. **Toujours écrire `process.env.NEXT_PUBLIC_X` en toutes lettres pour tout code exécuté dans le navigateur** ; `requireEnv` reste correct pour `middleware.ts` (edge) et `lib/supabase/server.ts` (Node).
- **Une redirection `redirect()` dans une Server Action ne « chaîne » pas de façon fiable à travers une redirection du middleware côté client.** `signInAction` redirigeait toujours vers `/dashboard` en comptant sur le middleware pour rediriger ensuite vers `/mfa` si un step-up AAL2 était en attente — le serveur calculait bien la bonne destination et servait `/mfa`, mais l'URL du navigateur restait bloquée sur `/dashboard`. Fix : l'action qui vient d'authentifier l'utilisateur doit décider elle-même de la destination (appeler `getAuthenticatorAssuranceLevel()` et rediriger directement vers `/mfa` si nécessaire), pas déléguer au prochain aller-retour.
- **Dans les dialogs Radix (bouton d'en-tête « Ajouter » qui ouvre + bouton de soumission du formulaire dans le dialog) : les deux boutons partagent le même nom accessible.** `page.getByRole("button", { name: "Ajouter" })` non scopé est ambigu pendant que le dialog est ouvert — a cassé les tests E2E (dialog qui ne se referme jamais). Toujours scoper le clic de soumission : `page.getByRole("dialog").getByRole("button", { name: "..." })`.
- **CI E2E : épingler la CLI Supabase (`supabase/setup-cli@v1` → `version: 2.75.0`), jamais `latest`.** Avec `latest`, `createGoalAction`/`createBudgetAction`/`createTransactionAction` échouaient de façon reproductible avec « Espace introuvable » juste après un signup frais (le trigger `on_auth_user_created` semblait ne pas avoir fini de créer le workspace), uniquement en CI — jamais en local, y compris en reproduisant un `supabase db reset` à froid en boucle. Ne monter la version qu'après l'avoir revérifiée manuellement.
- **Le build « env placeholder » (étape CI-équivalente de la validation locale) contamine ensuite tout run E2E local si on réutilise le même `.next`.** Next.js inline les variables `NEXT_PUBLIC_*` dans le bundle **à la compilation**, y compris côté Server Actions (pas seulement le bundle navigateur) — un `pnpm turbo build` lancé avec `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co` produit un `.next` qui pointe vers ce faux host, même en `next start`. Le `webServer` de Playwright (`reuseExistingServer: true` en local) peut alors réutiliser silencieusement ce serveur cassé. **Toujours refaire un `rm -rf apps/web/.next && pnpm --filter @fintrack/web build` sans l'override placeholder juste avant `pnpm exec playwright test`** — l'étape 3 (build placeholder) et l'étape 5 (E2E) de la séquence de validation ne doivent jamais partager le même `.next`.
- **Contraste WCAG AA du token `--success` retombé sous le seuil à l'usage réel (Phase 10).** `--success` avait été calibré pour du texte large (`text-xl`, barre de progression budget) ; la nouvelle ligne de totaux mensuels l'utilisait en `text-sm` (14px, seuil 4,5:1, pas 3:1) et n'atteignait que 3,72:1 — trouvé par le scan axe existant sur le dialog de saisie rapide (arrière-plan visible derrière la modale), pas par une relecture. Confirme ADR-017 : re-scanner systématiquement, ne jamais supposer qu'un token déjà utilisé ailleurs est sûr à un nouveau poids/taille. `--success` light passé de `oklch(0.59 0.13 150)` à `oklch(0.5 0.13 150)` (calculé pour ≥4,5:1 sur fond page **et** carte blanche, marge vérifiée par script).

---

## Outillage & Capacités Locales

- **GitHub CLI (`gh`)** : Disponible pour gérer les PRs et le statut de la CI (`gh pr create`, `gh pr checks --watch`, `gh run view --log-failed`).
- **Base de données & Docker** : Supabase local tourne sous Docker (`localhost:54322`). Toujours inspecter le schéma ou tester les migrations via le client local avant de valider.
- **Notion** : MCP connecté. Consulter le Wiki du projet avant d'entamer une nouvelle phase pour aligner les specs, et mettre à jour les pages de suivi une fois la phase livrée.
- **Playwright** : navigateurs installés localement (`pnpm --filter @fintrack/web exec playwright install --with-deps chromium webkit`). Permet de réellement cliquer-tester l'app (contrairement aux phases précédentes, vérifiées uniquement via REST/curl) — privilégier `pnpm --filter @fintrack/web exec playwright test` en local avant de pousser toute modification touchant `apps/web/e2e/`.

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
