#!/usr/bin/env bash
# Convenience deploy script for the Solana NFT Marketplace (frontend-only SPA).
#
# Usage:
#   ./deploy.sh build      # install + production build into ./dist
#   ./deploy.sh docker     # build + run the nginx container on :8080
#   ./deploy.sh preview    # build + serve locally with vite preview
#   ./deploy.sh vercel     # deploy to Vercel (requires `vercel` CLI + login)
set -euo pipefail

cd "$(dirname "$0")/.." # Go to repo root

# Load .env if present so build-time VITE_* vars are available.
if [[ -f client/.env ]]; then
  set -a; # shellcheck disable=SC1091
  source client/.env; set +a
fi

cmd="${1:-build}"

case "$cmd" in
  build)
    echo "▶ Installing dependencies…"
    cd client && npm install
    echo "▶ Building…"
    npm run build
    echo "✅ Build complete → ./client/dist"
    ;;
  docker)
    echo "▶ Building + starting Docker container…"
    docker compose -f docker/docker-compose.yml up --build -d
    echo "✅ Running at http://localhost:8080"
    ;;
  preview)
    cd client && npm install
    npm run build
    npm run preview
    ;;
  vercel)
    cd client
    command -v vercel >/dev/null || { echo "Install the Vercel CLI: npm i -g vercel"; exit 1; }
    vercel --prod
    ;;
  *)
    echo "Unknown command: $cmd"
    echo "Usage: ./scripts/deploy.sh [build|docker|preview|vercel]"
    exit 1
    ;;
esac

