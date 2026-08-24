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

### 1. Cloner le dépôt et installer les dépendances

```bash
git clone <url-du-repo>
cd FinTrack
nvm use
pnpm install
```

### 2. Démarrer Supabase en local

```bash
supabase start
```

Cette commande démarre PostgreSQL, l'interface Supabase Studio (`http://localhost:54323`) et Inbucket pour les emails de test (`http://localhost:54324`), puis applique les migrations du dossier `supabase/migrations`.

À la fin de la commande, la CLI affiche une `API URL` et une `anon key` : vous en aurez besoin à l'étape suivante.

### 3. Configurer les variables d'environnement

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Renseignez dans `apps/web/.env.local` les valeurs récupérées à l'étape précédente :

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-affichée-par-supabase-start>
```

### 4. Lancer l'application

```bash
pnpm dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

> ⚠️ Ne lancez jamais `next build` pendant que `pnpm dev` tourne (même dossier `.next`) — cela corrompt les assets. Arrêtez le serveur de dev avant de builder.

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
pnpm dev                              # démarre l'application web en local
pnpm build                            # build de tous les packages/apps
pnpm test                             # tests unitaires (packages/core)
pnpm lint                             # lint (core + web)
pnpm typecheck                        # vérification des types (core + web)

supabase start                        # démarre Supabase en local (Docker)
supabase stop                         # arrête Supabase
supabase db reset                     # réinitialise la base (migrations + données de test)
```

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
