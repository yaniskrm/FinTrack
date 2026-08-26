#!/usr/bin/env bash
# FinTrack — full local restart: Docker → Supabase → Next.js dev server.
#
# Usage:
#   ./scripts/dev-restart.sh          # restart everything, wait until ready
#   ./scripts/dev-restart.sh --reset  # also `supabase db reset` (WIPES local data)
#
# Safe to re-run any time the app looks dead ("Safari ne parvient pas à se
# connecter au serveur" usually just means the Next.js dev server isn't
# running — Docker/Supabase are typically still fine).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
LOG_FILE="/tmp/fintrack-dev.log"
APP_URL="http://127.0.0.1:3000"

RESET_DB=false
if [[ "${1:-}" == "--reset" ]]; then
  RESET_DB=true
fi

info()  { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m✓\033[0m %s\n' "$1"; }
warn()  { printf '\033[1;33m!\033[0m %s\n' "$1"; }
fail()  { printf '\033[1;31m✗\033[0m %s\n' "$1"; exit 1; }

cd "$ROOT_DIR"

# ─── 1. Node version ─────────────────────────────────────────────
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  nvm use --silent >/dev/null 2>&1 || warn "nvm use failed — continuing with current Node ($(node -v))"
fi
ok "Node $(node -v)"

# ─── 2. Docker daemon ─────────────────────────────────────────────
info "Vérification de Docker…"
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

# ─── 3. Supabase local ────────────────────────────────────────────
info "Vérification de Supabase…"
if ! supabase status >/dev/null 2>&1; then
  info "Supabase n'est pas démarré — lancement (peut prendre un moment la 1re fois)…"
  if ! supabase start; then
    warn "Premier démarrage échoué (souvent un souci réseau Docker transitoire) — nouvelle tentative après un stop propre…"
    supabase stop >/dev/null 2>&1 || true
    supabase start || fail "supabase start a échoué deux fois de suite. Vérifie 'supabase status' / les logs Docker manuellement."
  fi
fi
ok "Supabase actif"

if [ "$RESET_DB" = true ]; then
  warn "--reset demandé : sauvegarde des comptes existants avant le wipe…"
  "$ROOT_DIR/scripts/db-backup.sh"
  warn "Wipe + réapplication des migrations + seed…"
  supabase db reset
  info "Restauration des comptes sauvegardés…"
  "$ROOT_DIR/scripts/db-restore.sh"
  ok "Base réinitialisée, comptes restaurés"
fi

# ─── 4. .env.local (créé si absent, à partir des clés Supabase locales) ──
ENV_FILE="$WEB_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  info "apps/web/.env.local absent — génération à partir de 'supabase status'…"
  API_URL=$(supabase status -o env 2>/dev/null | sed -n 's/^API_URL="\(.*\)"/\1/p')
  ANON_KEY=$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"/\1/p')
  {
    echo "NEXT_PUBLIC_SUPABASE_URL=${API_URL:-http://127.0.0.1:54321}"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}"
  } > "$ENV_FILE"
  ok ".env.local généré"
else
  ok ".env.local déjà présent"
fi

# ─── 5. Stopper tout ancien serveur dev + cache potentiellement corrompu ──
info "Arrêt de l'éventuel serveur dev existant…"
pkill -f "next dev" 2>/dev/null && sleep 1 || true
pkill -f "next-server" 2>/dev/null || true
rm -rf "$WEB_DIR/.next"
ok "Ancien serveur arrêté, cache .next nettoyé"

# ─── 6. Démarrage ──────────────────────────────────────────────────
info "Démarrage de 'pnpm dev' en arrière-plan (log: $LOG_FILE)…"
nohup pnpm dev > "$LOG_FILE" 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > /tmp/fintrack-dev.pid

info "Attente que $APP_URL réponde (jusqu'à 30s)…"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' "$APP_URL/login" 2>/dev/null | grep -q "200"; then
    ok "App prête sur $APP_URL (pid $DEV_PID)"
    echo ""
    echo "  Studio     → http://127.0.0.1:54323"
    echo "  Emails     → http://127.0.0.1:54324"
    echo "  Logs dev   → tail -f $LOG_FILE"
    echo "  Arrêter    → kill \$(cat /tmp/fintrack-dev.pid)"
    exit 0
  fi
  sleep 1
done

fail "L'app ne répond toujours pas après 30s. Regarde $LOG_FILE pour l'erreur (pid $DEV_PID toujours actif)."
