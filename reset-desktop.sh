#!/bin/bash
# SCMD Pro - Factory Reset & Deploy for Linux/macOS

echo "========================================================="
echo "     SCMD PRO - FACTORY RESET & DEPLOY (DESKTOP)         "
echo "========================================================="
echo ""
echo "[CANH BAO NGHAY HIEM]"
echo "Thao tac nay se XOA TOAN BO DU LIEU HIEN TAI (Database, Redis, Logs)"
echo "va khoi tao he thong trang tinh tu dau!"
echo ""
read -p "An Enter de DONG Y, hoac bam Ctrl+C de HUY BO..."

echo ""
echo "[1/3] RESETING: Dang xoa bo cac services, networks, va volumes rác..."
docker compose -f docker-compose.desktop.yml down -v --remove-orphans

echo ""
echo "[2/3] BUILDING: Dang xay dung lai Core System (Khong dung cache)..."
docker compose -f docker-compose.desktop.yml build --no-cache

echo ""
echo "[3/3] DEPLOYING: Dang khoi dong he thong..."
docker compose -f docker-compose.desktop.yml up --force-recreate -d

echo ""
echo "[4/4] SEEDING: Dang cho container san sang va nap du lieu mau..."
echo "Dang cho app khoi dong (co the mat toi 90-150s cho cold start)..."
MAX_WAIT=180
ELAPSED=0
until curl -sf http://localhost:3000/api/health >/dev/null 2>&1; do
  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "⚠️  Server chưa phản hồi sau ${MAX_WAIT}s. Kiểm tra logs:"
    echo "   docker compose -f docker-compose.desktop.yml logs --tail=30 app"
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "  ... đang chờ ($ELAPSED/${MAX_WAIT}s)"
done
docker compose -f docker-compose.desktop.yml exec app npm run db:seed

echo ""
echo "========================================================="
echo "✅ KHOI TAO LAI THANH CONG! He thong dang hoat dong tai:"
echo "   👉 http://localhost:3000"
echo "========================================================="
echo ""
echo "Ban co the xem logs bang lenh: docker compose -f docker-compose.desktop.yml logs -f app"
