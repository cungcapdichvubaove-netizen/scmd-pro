#!/bin/bash
# SCMD Pro - Auto Deploy & Update for Linux/macOS

echo "========================================================="
echo "      SCMD PRO - AUTO DEPLOY & UPDATE (DESKTOP)          "
echo "========================================================="
echo ""
echo "[1/3] STOPPING: Dang tat dich vu cu va don dep he thong..."
docker compose -f docker-compose.desktop.yml down --remove-orphans

echo ""
echo "[2/3] BUILDING: Dang build lai he thong de nhan Code/Thanh phan moi..."
# Chu y: Qua trinh nay su dung cache (--no-cache KHONG duoc su dung) de tang toc do trien khai.
# Chi reset-desktop.sh moi dung --no-cache de thuc he thong triet de.
docker compose -f docker-compose.desktop.yml build

echo ""
echo "[3/3] DEPLOYING: Dang khoi dong toan bo kien truc SCMD Pro..."
docker compose -f docker-compose.desktop.yml up --force-recreate -d

echo ""
echo "========================================================="
echo "  [HEALTH CHECK] Cho app san sang (toi da 90 giay)..."
echo "========================================================="

# [FIX L-01] Cho healthcheck thay vi bao thanh cong ngay lap tuc
MAX_WAIT=90
ELAPSED=0
OK=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        OK=1
        break
    fi
    echo "  ... dang cho ($ELAPSED/$MAX_WAIT giay)"
done

echo ""
echo "========================================================="
if [ $OK -eq 1 ]; then
    echo "✅ CAP NHAT THANH CONG! He thong dang hoat dong tai:"
    echo "   👉 http://localhost:3000"
else
    echo "⚠️  App chua phan hoi sau ${MAX_WAIT}s — kiem tra logs:"
    echo "   docker compose -f docker-compose.desktop.yml logs --tail=50 app"
fi
echo "========================================================="
echo ""
echo "Ban co the xem logs bang lenh: docker compose -f docker-compose.desktop.yml logs -f app"
