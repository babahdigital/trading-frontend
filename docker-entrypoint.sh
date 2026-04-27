#!/bin/sh
# ─────────────────────────────────────────────────────────────────
# docker-entrypoint.sh — Run prisma migrate deploy then start server.
#
# Eliminates the "deploy → SSH manual to apply migrations" gap by making
# migration application part of container startup. Safe for single-replica
# deployments (current VPS3 setup); for multi-replica add an init job
# instead of running migrate on every container.
#
# DATABASE_URL must be set in the runtime env. If migration fails (e.g.
# DB unreachable, version skew), the container exits non-zero so the
# health check / restart policy decides next action.
# ─────────────────────────────────────────────────────────────────
set -e

if [ "${SKIP_MIGRATE:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_MIGRATE=1 — skipping prisma migrate deploy"
else
  echo "[entrypoint] Running prisma migrate deploy..."
  if ! node ./node_modules/prisma/build/index.js migrate deploy; then
    echo "[entrypoint] ERROR: prisma migrate deploy failed"
    exit 1
  fi
  echo "[entrypoint] Migrations applied successfully."
fi

echo "[entrypoint] Starting Next.js server..."
exec node server.js
