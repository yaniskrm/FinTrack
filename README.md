# FinTrack

FinTrack est une application de gestion financière personnelle **web-first**, pensée pour la friction zéro à la saisie, une UI de qualité professionnelle et une sécurité de niveau bancaire.

Suivez vos dépenses et revenus, vos abonnements récurrents, vos budgets, vos objectifs d'épargne et vos investissements — dans plus de 160 devises, avec conversion automatique en euro.

> 📖 Documentation complète du projet : [Wiki Notion](https://www.notion.so/32127748ca0281ad968bebf687fb73e1)

---

## Fonctionnalités

- **Dashboard** — solde, évolution (sparkline), répartition par catégorie, histogramme mensuel, score de santé financière.
- **Saisie rapide** — ajout d'une transaction en quelques secondes (raccourci clavier `N`).
- **Transactions** — liste, édition, duplication, suppression, mise à jour instantanée (mutations optimistes).
- **Abonnements / récurrences** — gestion des prélèvements récurrents, génération automatique des transactions, aperçu des prochaines échéances.
- **Budgets** — enveloppes par catégorie avec barres de progression et alertes à 80 % / 100 %, suggestion basée sur les 3 derniers mois.
- **Objectifs d'épargne** — jauge de progression, contribution mensuelle nécessaire calculée automatiquement, alerte en cas de retard.
- **Investissements** — suivi de portefeuille, plus/moins-values latentes et réalisées, répartition par classe d'actifs et par devise, courbe de valorisation.
- **Multi-devises** — 165 devises supportées, taux de change mis à jour quotidiennement, montant en EUR figé à la saisie.
- **Export** — CSV, JSON (sauvegarde complète, portable RGPD) et PDF (rapport mensuel).
- **Sécurité** — authentification Supabase, double authentification (2FA TOTP), déconnexion automatique après inactivité, RLS (Row Level Security) sur toutes les données.
- **PWA** — application installable, responsive sur mobile comme sur desktop.

L'application mobile native (Expo, dossier `apps/mobile`) existe dans le monorepo mais n'est pas la cible de la v1 — elle est conservée pour une v2.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Web app | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Composants | shadcn/ui + Radix |
| Graphes | Recharts |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| State / données | Zustand + TanStack Query |
| Formulaires | React Hook Form + Zod |
| Tests | Vitest (unitaire) + Playwright (E2E) |
| Monorepo | pnpm workspaces + Turborepo |

---

## Installation

### Prérequis

- [Node.js 22](https://nodejs.org/) (voir `.nvmrc` — `nvm use`)
- [pnpm](https://pnpm.io/) ≥ 9
- [Docker](https://www.docker.com/) (pour faire tourner Supabase en local)
- La [CLI Supabase](https://supabase.com/docs/guides/cli)

### Setup en une commande

```bash
git clone <url-du-repo>
cd FinTrack
./scripts/setup.sh
```

Ce script vérifie les prérequis (Node 22, pnpm, Docker, CLI Supabase), installe les dépendances, démarre Supabase en local (migrations + données de test appliquées automatiquement) et génère `apps/web/.env.local`. Il est idempotent — relançable sans risque à tout moment.

> ⚠️ Toujours l'invoquer directement (`./scripts/setup.sh` ou `bash scripts/setup.sh`), jamais via un alias `pnpm run` : pnpm lui-même a besoin de Node ≥ 18 pour démarrer, alors que le Node par défaut du shell peut encore être une vieille version tant que `nvm use` (fait *à l'intérieur* du script) n'a pas tourné.

Une fois le setup terminé :

```bash
pnpm dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

> ⚠️ Ne lancez jamais `next build` pendant que `pnpm dev` tourne (même dossier `.next`) — cela corrompt les assets. Arrêtez le serveur de dev avant de builder.

### Étapes manuelles (si vous préférez ne pas utiliser le script)

<details>
<summary>Détail des 4 étapes</summary>

**1. Cloner et installer**
```bash
git clone <url-du-repo>
cd FinTrack
nvm use
pnpm install
```

**2. Démarrer Supabase en local**
```bash
supabase start
```
Démarre PostgreSQL, Supabase Studio (`http://localhost:54323`) et Inbucket pour les emails de test (`http://localhost:54324`), puis applique les migrations du dossier `supabase/migrations`. À la fin, la CLI affiche une `API URL` et une `anon key`.

**3. Configurer les variables d'environnement**
```bash
cp apps/web/.env.local.example apps/web/.env.local
```
Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` avec les valeurs de l'étape précédente. Voir *Gestion des secrets* ci-dessous pour `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (optionnel, notifications push).

**4. Lancer**
```bash
pnpm dev
```

</details>

### Redémarrer l'environnement local

Si l'app ne répond plus (serveur dev planté, Docker relancé…), `./scripts/dev-restart.sh` relance tout proprement (Docker → Supabase → `pnpm dev`) sans repasser par un setup complet. `./scripts/dev-restart.sh --reset` réinitialise en plus la base (`supabase db reset` — supprime les données locales).

---

## Utilisation, une fois installée

### Créer un compte

Rendez-vous sur `/signup` pour créer un compte. Un espace de travail (« workspace ») et une catégorie par défaut sont créés automatiquement. En local, les emails (confirmation, réinitialisation de mot de passe) sont capturés par Inbucket sur `http://localhost:54324` plutôt qu'envoyés réellement.

### Saisir une transaction

Depuis le dashboard ou la page Transactions, cliquez sur « Ajouter » (ou appuyez sur `N`) pour ouvrir le formulaire de saisie rapide : montant, devise, catégorie, date et note. La transaction apparaît immédiatement dans l'interface, avant même la confirmation du serveur.

### Suivre ses abonnements

Dans la page Abonnements, créez une règle de récurrence (montant, fréquence, catégorie). Les transactions correspondantes sont générées automatiquement à chaque échéance ; le dashboard affiche les prochains prélèvements à venir.

### Définir un budget ou un objectif

Dans Budget, créez une enveloppe par catégorie et par période ; la progression s'affiche avec des seuils de couleur (vert / orange / rouge). Dans Objectifs, définissez un montant cible et une échéance : la contribution mensuelle nécessaire est calculée automatiquement.

### Suivre ses investissements

Dans Investissements, ajoutez une position (quantité, prix d'achat, devise) puis mettez à jour sa valorisation au fil du temps. La page affiche la plus/moins-value latente, la répartition du portefeuille et une courbe de performance.

### Activer la double authentification (2FA)

Depuis `/settings/security`, activez l'authentification à deux facteurs (TOTP, compatible avec toute application d'authentification comme Google Authenticator ou 1Password). Une fois activée, une vérification supplémentaire est demandée à chaque connexion.

### Exporter ses données

Depuis `/settings/export`, exportez vos données au format CSV (transactions sur une période donnée), JSON (sauvegarde complète, portable) ou PDF (rapport mensuel récapitulatif).

---

## Commandes utiles

```bash
./scripts/setup.sh                    # setup complet (première fois) — voir Installation
./scripts/dev-restart.sh              # relance tout proprement (Docker → Supabase → dev server)
./scripts/dev-restart.sh --reset      # idem + réinitialise la base (supabase db reset)

pnpm dev                              # démarre l'application web en local
pnpm build                            # build de tous les packages/apps
pnpm test                             # tests unitaires (packages/core)
pnpm lint                             # lint (core + web)
pnpm typecheck                        # vérification des types (core + web)
pnpm --filter @fintrack/web exec playwright test   # tests E2E (chromium + webkit)

supabase start                        # démarre Supabase en local (Docker)
supabase stop                         # arrête Supabase
supabase db reset                     # réinitialise la base (migrations + données de test)
```

---

## Flux de travail Git

Une branche par phase/tâche, mergée dans `main` une fois la CI verte — jamais de push direct sur `main`.

```bash
git checkout -b feat/nom-de-la-tache main   # ou fix/…, chore/…
# développer, committer avec `type(scope): description` (Conventional Commits)
git push -u origin feat/nom-de-la-tache
gh pr create --fill
gh pr checks --watch                        # attendre la CI
# une fois verte : merge, puis mettre à jour CLAUDE.md si la tâche change l'archi/les conventions
```

Avant tout merge, valider la chaîne complète en local (mêmes commandes que la CI) :

```bash
rm -rf packages/core/dist apps/web/.next
pnpm turbo lint typecheck --filter=@fintrack/core --filter=@fintrack/web
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key pnpm turbo build --filter=@fintrack/web
pnpm --filter @fintrack/core test:coverage
pnpm --filter @fintrack/web exec playwright test
```

Détail complet du workflow (ADR-014) et de l'historique des décisions techniques : [`CLAUDE.md`](./CLAUDE.md).

---

## Gestion des secrets

**Aucun secret ne doit jamais être committé.** `apps/web/.env.local`, `supabase/functions/.env` et tout fichier `.env*` sont dans `.gitignore` — ne les retirez jamais de cette liste.

| Variable | Où | Sensible ? | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Non (clé publique) | Générées par `supabase start` en local ; en prod, valeurs du dashboard Supabase. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `apps/web/.env.local` | Non (clé publique) | Notifications push — voir ci-dessous pour la générer. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets Edge Functions (jamais côté client) | **Oui** | Bypass RLS — usage serveur uniquement. |
| `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Secrets Edge Functions | **Oui** (la privée) | Voir génération ci-dessous. |
| `project_url` / `service_role_key` | Supabase Vault (`vault.create_secret`) | **Oui** | Lus par les jobs `pg_cron` (`exchange-rates`, `send-notifications`) — no-op tant qu'absents, y compris en local. |

**Générer une paire de clés VAPID** (notifications push — bibliothèque [`@negrel/webpush`](https://github.com/negrel/webpush), pas le CLI `web-push` npm classique dont le format de clé est incompatible) : voir [`CLAUDE.md`](./CLAUDE.md) (section Web Push) pour la recette exacte (Edge Function one-off jetable) et le format attendu de `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (JWK JSON, pas les chaînes base64url du CLI npm).

En production, les secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, secrets Vault…) se configurent dans le dashboard Supabase / les variables d'environnement Vercel — jamais dans un fichier commité.

---

## Structure du projet

```
fintrack/
├── apps/
│   ├── web/          # Application Next.js (la cible v1)
│   └── mobile/        # Application Expo (v2, non retravaillée pour l'instant)
├── packages/
│   ├── core/          # Logique métier pure (calculs, validation, export)
│   ├── ui/             # Tokens de design pour le mobile (React Native)
│   └── api-client/    # Client Supabase typé
└── supabase/
    ├── migrations/     # Schéma de base de données versionné
    └── functions/      # Edge Functions (taux de change, notifications)
```

Pour plus de détails sur l'architecture, les conventions de code et les décisions techniques, voir [`CLAUDE.md`](./CLAUDE.md) et le [Wiki Notion](https://www.notion.so/32127748ca0281ad968bebf687fb73e1).
