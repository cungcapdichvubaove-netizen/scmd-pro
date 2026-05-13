#!/bin/sh
set -e
echo "[1/4] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[2/4] Running custom migrations (RLS + PostGIS)..."
node run-migration.mjs

# Seed luôn chạy vì seed.ts dùng upsert (idempotent - an toàn khi chạy lại nhiều lần).
# Điều này đảm bảo Super Admin và dữ liệu nền tảng luôn tồn tại sau mỗi lần deploy.
# Đặt AUTO_SEED=false CHỈ KHI bạn chắc chắn DB đã có data và KHÔNG muốn reset demo data.
echo "[3/4] Seeding platform data (idempotent upsert)..."
if [ "$AUTO_SEED" = "false" ]; then
  echo "  ⚠️  AUTO_SEED=false — Bỏ qua seed. Đảm bảo tài khoản superadmin đã tồn tại trong DB!"
  echo "  ℹ️  Nếu đây là lần cài đặt mới hoặc bị lỗi đăng nhập, hãy đặt AUTO_SEED=true và restart."
else
  npm run db:seed
fi

echo "[4/4] Starting app..."
exec npm run start
