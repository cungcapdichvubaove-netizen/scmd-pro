---
name: scmddeploycheck
description: >-
  Dùng khi chuẩn bị deploy SCMD PRO lên production: kiểm tra build, Prisma,
  Docker, migration, RLS, biến môi trường, và bảo mật. Trigger khi người dùng
  nói "deploy", "production", "release", "docker", "migration", "build lỗi",
  "staging check", hoặc hỏi "có thể lên production chưa".
---

# SCMD PRO — Deploy Check

Luôn trả lời bằng **tiếng Việt**.

## Nguyên tắc

Một deploy thất bại trong production tốn kém hơn nhiều so với 30 phút kiểm tra
kỹ ở đây. Mỗi mục dưới đây đều có lý do tồn tại — đừng bỏ qua mục nào.

---

## Thứ tự ưu tiên kiểm tra (theo mức độ chặn deploy)

```
🔴 P0 — Phải pass trước khi tiếp tục
🟠 P1 — Phải fix trước production
🟡 P2 — Nên fix, có thể deploy nhưng theo dõi
```

---

## Checklist chi tiết

### 🔴 Build & Dependency (P0)

```bash
npm ci                        # Clean install, không dùng npm install
npx prisma validate           # Schema Prisma hợp lệ
npx prisma generate           # Client generate thành công
npm run build                 # Build pass, 0 TypeScript error
```

Kiểm tra thêm:
- [ ] Không có TypeScript error (`tsc --noEmit`)
- [ ] Internal imports có `.js` extension (Native ESM)
- [ ] Không có package trong `devDependencies` bị dùng trong production code

### 🔴 Database & Migration (P0)

- [ ] Migration chạy clean trên **staging** trước
- [ ] Schema Prisma khớp với DB thực tế
- [ ] Không có destructive migration (DROP, ALTER TYPE) mà không có backup plan
- [ ] `rls_setup.sql` được cập nhật cho bảng tenant-scoped mới
- [ ] Index `(tenantId, date)` và `(tenantId, status)` có trên bảng lớn

```bash
# Kiểm tra migration pending
npx prisma migrate status

# Chạy migration (staging trước)
npx prisma migrate deploy
```

### 🔴 Security (P0)

- [ ] Không có `prisma.*` trực tiếp trong tenant flow
- [ ] Tenant API dùng `db.forTenant()` / `db.withTenant()`
- [ ] `db.system()` chỉ xuất hiện ở Super Admin flow
- [ ] RBAC check có trên mọi tenant endpoint
- [ ] Zod validation có trên mọi input
- [ ] Không có API key / secret trong code (dùng env vars)
- [ ] Error response không leak stack trace hoặc internal path

### 🟠 Runtime & Infra (P1)

- [ ] Redis connection có auth và hoạt động
- [ ] BullMQ workers đang chạy và configured đúng
- [ ] Heavy jobs (PDF, AI, report) không chạy sync trong HTTP request
- [ ] Socket.io emit sau commit, không trước
- [ ] OpenTelemetry/audit trace configured nếu có

### 🟠 Docker (P1)

```bash
docker compose config         # Validate compose file
docker compose build          # Build thành công
```

- [ ] Không có `npm install` trong production runtime container
- [ ] Không có dev-only command trong production compose
- [ ] Secrets đến từ env, không hardcode trong Dockerfile / compose
- [ ] Healthcheck cho app, DB, Redis
- [ ] Volume mount cho data persistent (nếu cần)

### 🟡 Environment Variables (P1→P2)

Tạo checklist từ `.env.example` hoặc template. Xác nhận từng biến:
- [ ] DATABASE_URL có SSL mode phù hợp với production
- [ ] REDIS_URL có auth
- [ ] JWT_SECRET đủ mạnh và khác staging
- [ ] CORS_ORIGIN đúng domain production
- [ ] NODE_ENV=production

---

## Output Format

### Production Readiness Verdict
```
🔴 KHÔNG DEPLOY — có P0 blocker
🟠 DEPLOY CẨN THẬN — có P1 cần theo dõi
✅ SẴN SÀNG — tất cả checklist pass
```

### P0 Blockers
Mỗi blocker: mô tả cụ thể + lệnh/bước để fix.

### P1 Important Fixes
Cần fix trước production hoặc ngay sau deploy.

### P2 Improvements
Có thể để backlog nhưng nên fix sớm.

### Lệnh cần chạy
```bash
# Theo thứ tự cụ thể, copy-paste được
```

### Expected Output
Output thành công trông như thế nào (để không nhầm lẫn).

### Go / No-Go
**GO** nếu tất cả P0 pass và P1 acceptable.
**NO-GO** nếu còn P0 bất kỳ.
