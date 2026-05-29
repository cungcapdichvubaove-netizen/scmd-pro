#!/bin/sh
# =============================================================
# SCMD Pro — entrypoint.sh v2.2
# FIX [E-01]: Seed failure là non-fatal — app PHẢI start dù seed lỗi
# FIX [E-02]: Log rõ ràng từng bước để debug qua: docker logs scmd-desktop-app
# FIX [E-03]: Seed timeout 120s — kill nếu tsx treo (prisma.$disconnect thiếu)
# =============================================================
set -e

echo "============================================="
echo " SCMD Pro — Container Startup"
echo " NODE_ENV=${NODE_ENV}"
echo " AUTO_SEED=${AUTO_SEED:-false}"
echo "============================================="

# ── STEP 1: Prisma Migrate ────────────────────────────────────
echo ""
echo "[1/4] Running prisma migrate deploy..."
npx prisma migrate deploy
echo "[1/4] Done."

# ── STEP 2: Custom Migrations (RLS + PostGIS) ─────────────────
echo ""
echo "[2/4] Running custom migrations (RLS + PostGIS)..."
node run-migration.mjs
echo "[2/4] Done."

# ── STEP 3: Seed ─────────────────────────────────────────────
echo ""
echo "[3/4] Seeding platform data (idempotent upsert)..."

if [ "${AUTO_SEED}" = "false" ]; then
  echo "[3/4] AUTO_SEED=false — Bo qua seed."
  echo "      Dam bao tai khoan superadmin da ton tai trong DB!"
  echo "      Neu fresh install hoac loi dang nhap: dat AUTO_SEED=true va restart."
else
  # FIX [E-03]: tsx co the treo vo han neu seed.ts thieu prisma.$disconnect().
  # Prisma connection pool giu Node event loop → process khong bao gio exit.
  # Dung timeout 120s (BusyBox-compatible) de hard-kill neu bi hung.
  # Exit code 124 = timeout; cac code khac = seed error.
  #
  # FIX [E-01]: Seed non-fatal — app van start ke ca khi seed loi/timeout.
  # Seed dung upsert (idempotent) → safe to retry tren lan restart tiep theo.
  #
  # Fix dai han cho root cause: them prisma.$disconnect() cuoi seed.ts:
  #   main().catch(...).finally(async () => { await prisma.$disconnect(); });
  SEED_TIMEOUT=120
  echo "[3/4] Chay seed voi timeout ${SEED_TIMEOUT}s..."

  if timeout "${SEED_TIMEOUT}" npm run db:seed; then
    echo "[3/4] Seed completed successfully."
  else
    SEED_EXIT=$?
    if [ "${SEED_EXIT}" -eq 124 ]; then
      echo "[3/4] WARNING: Seed timeout sau ${SEED_TIMEOUT}s."
      echo "      Root cause: seed.ts thieu prisma.\$disconnect() → Node giu event loop."
      echo "      Fix: them prisma.\$disconnect() vao cuoi seed.ts (finally block)."
    else
      echo "[3/4] WARNING: Seed loi (exit code: ${SEED_EXIT}) — non-fatal."
    fi
    echo "      App se start. Neu login loi, kiem tra:"
    echo "        docker logs scmd-desktop-app --tail=100"
  fi
fi

# ── STEP 4: Start App ─────────────────────────────────────────
echo ""
echo "[4/4] Starting app on port 3000..."
exec npm run start
