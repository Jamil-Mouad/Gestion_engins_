#!/usr/bin/env bash
# Runs Flyway-style migrations in lexical order on first container start.
# Spring Boot Fleet-Core will own Flyway in production; this shim handles local dev.
set -euo pipefail

echo "==> Running FleetTracker schema migrations…"
for f in /docker-entrypoint-initdb.d/migrations/V*.sql; do
    echo "    applying $f"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done
echo "==> Migrations complete."
