#!/bin/sh
# =============================================================
# SCMD Pro — Docker Entrypoint (v4-final)
# Entry point: dist/index.js (esbuild bundle — build:server)
# dist-backend/ = tsc type output, KHÔNG dùng để chạy
# =============================================================
set -e

echo "========================================"
echo "  SCMD Pro — Starting Production Server"
echo "========================================"

START_TIME=$(date +%s)

DB_HOST=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname)")
DB_PORT=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.port||5432)")
DB_USER=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.username)")
DB_NAME=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.pathname.replace('/','').split('?')[0])")

echo ""
echo "⏳ [1/3] Waiting for PostgreSQL..."
echo "   Target: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

MAX_RETRIES=40
RETRY_COUNT=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database not ready after ${MAX_RETRIES} attempts. Exiting."
    exit 1
  fi
  SLEEP_TIME=$(( (RETRY_COUNT / 2) + 1 ))
  SLEEP_TIME=$(( SLEEP_TIME > 5 ? 5 : SLEEP_TIME ))
  echo "   Attempt ${RETRY_COUNT}/${MAX_RETRIES} — retry in ${SLEEP_TIME}s..."
  sleep "$SLEEP_TIME"
done

DB_ELAPSED=$(( $(date +%s) - START_TIME ))
echo "✅ Database connected (${DB_ELAPSED}s elapsed)."



MIGRATE_ELAPSED=$(( $(date +%s) - START_TIME ))
echo ""
echo "✅ [3/3] Starting SCMD Pro on PORT=${PORT:-3000} (${MIGRATE_ELAPSED}s since start)..."
exec node dist/index.js
