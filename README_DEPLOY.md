# SCMD Pro — Benchmark Learning Mode Patch

## Áp dụng patch

Giải nén và chép đè vào thư mục gốc dự án. Sau đó chạy:

```bash
# 1. Chạy migration SQL (thêm columns benchmark vào DB)
psql $DATABASE_URL -f prisma/migrations/add_benchmark_to_checkpoints.sql

# 2. Regenerate Prisma Client
npx prisma generate

# 3. Restart server
npm run dev
```

## Các file được thay thế

| File | Thay đổi |
|------|----------|
| `src/apps/security/interfaces/TenantAdminDashboard.tsx` | Thêm sub-tab Learning Mode vào tab "Site & Mục tiêu" |
| `src/apps/security/interfaces/components/BenchmarkLearningMode.tsx` | **MỚI** — Component Learning Mode hoàn chỉnh |
| `src/server/core/use-cases/patrol/record-benchmark.usecase.ts` | **MỚI** — Use case ghi/reset benchmark (Clean Architecture) |
| `src/server/routes.ts` | Thêm 3 routes: POST/DELETE benchmark, GET analytics |
| `prisma/schema.prisma` | Thêm 7 benchmark fields + model PatrolBenchmarkDeviation |
| `prisma/migrations/add_benchmark_to_checkpoints.sql` | **MỚI** — Migration SQL với RLS đầy đủ |

## Xóa file cũ (không còn dùng)

```bash
rm src/apps/security/interfaces/AdminBenchmarkRecorder.tsx
```

## Bảo mật Seeding (V.4.38.2)

Khi thực hiện seed dữ liệu ban đầu, bạn **BẮT BUỘC** phải cấu hình mật khẩu thông qua biến môi trường để tránh lộ lọt thông tin quản trị:

```bash
# Đặt mật khẩu trong runtime hoặc file .env
SEED_SUPERADMIN_PASSWORD=YourStrongPassword!
SEED_TENANT_ADMIN_PASSWORD=YourDemoPass!
SEED_GUARD_PASSWORD=GuardPass!

# Thực thi seed
npm run seed
```

*Lưu ý: Nếu không đặt biến môi trường, hệ thống sẽ sử dụng mật khẩu mặc định (Chỉ dùng cho môi trường Lab). Trên production, tuyệt đối không được bỏ trống.*
