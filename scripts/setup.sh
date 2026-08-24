#!/usr/bin/env bash
# FinTrack — one-command first-time local setup.
#
# Checks prerequisites (Node 22, pnpm, Docker, Supabase CLI), installs
# dependencies, starts Supabase local (applies migrations + seed), and
# generates apps/web/.env.local from the local Supabase keys.
#
# Safe to re-run any time — every step is idempotent. For a quick restart
# once you're already set up, use scripts/dev-restart.sh instead.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m!\033[0m %s\n' "$1"; }
fail()  { printf '\033[1;31m✗\033[0m %s\n' "$1"; exit 1; }

cd "$ROOT_DIR"

# ─── 1. Node 22 ────────────────────────────────────────────────────
info "Vérification de Node.js…"
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  if ! nvm use >/dev/null 2>&1; then
    info "Node 22 non installé via nvm — installation…"
    nvm install >/dev/null
    nvm use >/dev/null
  fi
fi
NODE_VERSION="$(node -v 2>/dev/null || echo "absent")"
if [[ "$NODE_VERSION" != v22* ]]; then
  fail "Node 22 requis (trouvé : $NODE_VERSION). Installe nvm (https://github.com/nvm-sh/nvm) puis relance ce script, ou lance 'nvm use' manuellement."
fi
ok "Node $NODE_VERSION"

# ─── 2. pnpm ────────────────────────────────────────────────────────
info "Vérification de pnpm…"
command -v pnpm >/dev/null 2>&1 || fail "pnpm introuvable. Installe-le : https://pnpm.io/installation"
ok "pnpm $(pnpm --version)"

# ─── 3. Docker ──────────────────────────────────────────────────────
info "Vérification de Docker…"
command -v docker >/dev/null 2>&1 || fail "Docker introuvable. Installe Docker Desktop : https://www.docker.com/products/docker-desktop"
if ! docker info >/dev/null 2>&1; then
  warn "Docker ne répond pas — tentative de démarrage de Docker Desktop…"
  open -a Docker 2>/dev/null || fail "Impossible de lancer Docker Desktop automatiquement. Lance-le à la main puis relance ce script."
  for i in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 2
  done
  docker info >/dev/null 2>&1 || fail "Docker n'a pas démarré après 2 min. Relance le script une fois Docker prêt."
fi
ok "Docker prêt"

# ─── 4. Supabase CLI ────────────────────────────────────────────────
info "Vérification de la CLI Supabase…"
command -v supabase >/dev/null 2>&1 || fail "CLI Supabase introuvable. Installe-la : https://supabase.com/docs/guides/cli/getting-started"
ok "Supabase CLI $(supabase --version)"

# ─── 5. Dépendances ──────────────────────────────────────────────────
info "Installation des dépendances (pnpm install)…"
pnpm install
ok "Dépendances installées"

# ─── 6. Supabase local (migrations + seed appliqués au premier démarrage) ──
info "Démarrage de Supabase en local…"
if ! supabase status >/dev/null 2>&1; then
  supabase start
else
  ok "Supabase déjà démarré"
fi

# ─── 7. apps/web/.env.local ──────────────────────────────────────────
ENV_FILE="$WEB_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  info "Génération de apps/web/.env.local à partir de Supabase local…"
  API_URL=$(supabase status -o env 2>/dev/null | sed -n 's/^API_URL="\(.*\)"/\1/p')
  ANON_KEY=$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"/\1/p')
  {
    echo "NEXT_PUBLIC_SUPABASE_URL=${API_URL:-http://127.0.0.1:54321}"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}"
  } > "$ENV_FILE"
  ok ".env.local généré (NEXT_PUBLIC_VAPID_PUBLIC_KEY reste à ajouter à la main si tu testes les notifications push — voir CLAUDE.md)"
else
  ok ".env.local déjà présent — inchangé"
fi

echo ""
ok "Setup terminé."
echo ""
echo "  Prochaine étape → pnpm dev"
echo "  App             → http://127.0.0.1:3000"
echo "  Studio          → http://127.0.0.1:54323"
echo "  Emails de test  → http://127.0.0.1:54324"
echo "  Redémarrage     → ./scripts/dev-restart.sh"
