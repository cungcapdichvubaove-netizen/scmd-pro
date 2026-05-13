# SCMD Pro — Patch Guide

Tài liệu này mô tả **tất cả các lỗi được phát hiện** và cách áp dụng fix.

---

## 🟡 Lỗi 11 (MEDIUM): [M-01] Cache metadata auth 5 phút — token revoke delay

### Root Cause

Hệ thống cache metadata xác thực (role, status, tenant status) trong 5 phút (300 giây) để giảm tải cho Database. Tuy nhiên, điều này tạo ra một khoảng thời gian trễ đáng kể khi Admin đình chỉ người dùng hoặc thay đổi quyền hạn — người dùng bị ảnh hưởng vẫn có thể tiếp tục thao tác trong tối đa 5 phút.

### Fix

1. Giảm TTL của cache auth metadata xuống **60 giây** trong `auth.middleware.ts`.
2. Triển khai **Active Invalidation**: Gọi `cache.del()` cho key `auth_metadata:${userId}` ngay trong các UseCase thay đổi dữ liệu nhân sự (`UpdateStaffUseCase`, `DeleteStaffUseCase`).

### File cần fix

```
src/server/shared/middlewares/auth.middleware.ts
src/server/modules/staff/application/update-staff.usecase.ts
src/server/modules/staff/application/delete-staff.usecase.ts
```

### Áp dụng

Sử dụng `cache.del` sau khi thực hiện các thay đổi tại tầng Repository/Database.

---

## 🟠 Lỗi 10 (MEDIUM): [H-04] WebSocket rate limit quá thô — 1 event/giây/user dễ bị bypass

### Root Cause

Cơ chế rate limit WebSocket hiện tại chỉ giới hạn 1 event mỗi giây cho mỗi *loại* event. Điều này cho phép một client gửi hàng chục requests mỗi giây bằng cách sử dụng các event types khác nhau. Ngoài ra, một số events quan trọng như `join_tenant` hoàn toàn không bị giới hạn, dẫn đến nguy cơ bị spam và làm quá tải tài nguyên phòng (room) của Socket.io.

### Fix

Áp dụng kiến trúc rate limit 3 tầng (Multi-layered Rate Limiting) sử dụng Redis:
1. **Global Rate Limit**: Cấu hình giới hạn cứng 30 events tổng hợp mỗi giây cho mỗi identifier.
2. **Critical Action Limit**: Giới hạn riêng cho `join_tenant` (5 lần/phút) để bảo vệ tính toàn vẹn của logic đa người dùng.
3. **Per-Type Rate Limit**: Giữ nguyên giới hạn 1 event/giây cho mỗi loại để chống spam đặc thô.

### File cần fix

```
src/server/infra/socket/service.ts
```

### Áp dụng

Sử dụng `redisClient.incr` kết hợp `expire` cho global counter và `set NX` cho per-event lock.

---

 ## 🔵 Lỗi 9 (MEDIUM): [H-03] Default seed credentials lộ trong plaintext — seed.ts

### Root Cause

File seed (`src/server/modules/auth/seed.ts`) chứa mật khẩu plaintext mặc định cho các tài khoản Super Admin và Tenant Admin. Nếu người vận hành chạy script seed trên môi trường production mà không thay đổi mật khẩu ngay lập tức, kẻ tấn công có thể sử dụng các thông tin đăng nhập mặc định này để chiếm quyền kiểm soát hệ thống.

### Fix

Loại bỏ mật khẩu plaintext trong code. Thay thế bằng cơ chế đọc từ biến môi trường (`SEED_SUPERADMIN_PASSWORD`, `SEED_TENANT_ADMIN_PASSWORD`). Nếu không có biến môi trường, script sẽ cảnh báo và sử dụng mật khẩu mặc định (chỉ dành cho lab) nhưng không hiển thị công khai thông tin này trong bảng tổng kết nếu đã được ghi đè.

### File cần fix

```
src/server/modules/auth/seed.ts
.env.example
README_DEPLOY.md
```

### Áp dụng

Cập nhật script seed để sử dụng `process.env`. Thêm hướng dẫn thiết lập mật khẩu mạnh vào tài liệu triển khai.

---

## 🟢 Lỗi 8 (HIGH): [H-02] SSRF không hoàn chỉnh trong PDF service — localhost được phép

### Root Cause

PDF service (chạy Puppeteer) cho phép bất kỳ URL nào có hostname là `localhost` hoặc `127.0.0.1` mà không giới hạn port. Điều này cho phép kẻ tấn công thực hiện SSRF (Server-Side Request Forgery) để truy cập và thăm dò các dịch vụ nội bộ chạy trên các port khác (như Redis - 6379, Postgres - 5432, Prometheus - 9090) vốn chỉ lắng nghe local.

### Fix

Triển khai cơ chế **Port Allowlist** nghiêm ngặt cho các hostname nội bộ. Chỉ cho phép truy cập port 3000 (API chính) khi gọi tới localhost hoặc api service.

### File cần fix

```
scripts/pdf-server.js
```

### Áp dụng

Cập nhật hàm `isAllowed` để kiểm tra cả port:
```js
const INTERNAL_SERVICES = { 'api': [3000], 'localhost': [3000], '127.0.0.1': [3000] };
// ... logic validation port ...
```

---

## 🔴 Lỗi 1 (CRITICAL): `client[commandNameWithVersion] is not a function`

### Root Cause

BullMQ nội bộ gọi các lệnh Redis theo pattern dynamic:

```js
// Bên trong bullmq/dist/cjs/classes/scripts.js
const commandName = client[commandNameWithVersion]; // e.g. client['lmpop2']
await commandName.call(client, ...args);
```

Code hiện tại truyền **Proxy wrapper** (`redisClient`) vào BullMQ.
Proxy chỉ forward các method **tồn tại** trên ioredis instance thật, không hỗ trợ dynamic property access theo `commandNameWithVersion`.

### Fix

**3 files cần thay thế:**

```
src/server/core/redis.ts              ← Tách getBullRedis() (raw client)
src/server/infra/redis/client.ts      ← Re-export getBullRedis + initBullRedis
src/server/core/queue/index.ts        ← Dùng getBullRedis() thay vì redis Proxy
```

### Áp dụng

```bash
cp fix/src/server/core/redis.ts              src/server/core/redis.ts
cp fix/src/server/infra/redis/client.ts      src/server/infra/redis/client.ts
cp fix/src/server/core/queue/index.ts        src/server/core/queue/index.ts
```

---

## 🔴 Lỗi 2 (CRITICAL): Redis chưa sẵn sàng khi app khởi động

### Root Cause

`docker-compose.yml` cũ dùng `condition: service_started` cho Redis.
App khởi động khi Redis container đang start nhưng **chưa accept connections**.
BullMQ worker cố kết nối ngay → lỗi ECONNREFUSED liên tục.

### Fix

```yaml
# docker-compose.yml — thêm healthcheck cho Redis
redis:
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 10

app:
  depends_on:
    redis:
      condition: service_healthy   # ← đổi từ service_started
```

### Áp dụng

```bash
cp fix/docker-compose.yml docker-compose.yml
```

---

## 🟡 Lỗi 3 (MEDIUM): Puppeteer download Chromium trong build

### Root Cause

`npm install` chạy postinstall script của puppeteer → tải Chromium (~300MB).
Trong Docker build (không có internet hoặc bị chặn) → build fail hoặc rất chậm.

### Fix

```dockerfile
# Dockerfile
RUN npm install --legacy-peer-deps --ignore-scripts
RUN npx prisma generate || true   # chạy riêng scripts cần thiết
```

### Áp dụng

```bash
cp fix/Dockerfile Dockerfile
```

---

## 🟡 Lỗi 4 (MEDIUM): `rate-limit-redis` sendCommand type mismatch

### Root Cause

`rate-limit-redis` v4 yêu cầu signature:
```ts
sendCommand: (command: string, ...args: string[]) => Promise<unknown>
```

Code cũ dùng `...args: string[]` và gọi `redisClient.call(...args)` không đúng type.

### Fix

```bash
cp fix/src/server/core/middleware/rate-limit.middleware.ts \
   src/server/core/middleware/rate-limit.middleware.ts
```

---

## ✅ Checklist áp dụng toàn bộ fix

```bash
# 1. Copy tất cả file đã fix
cp fix/src/server/core/redis.ts              src/server/core/redis.ts
cp fix/src/server/infra/redis/client.ts      src/server/infra/redis/client.ts
cp fix/src/server/core/queue/index.ts        src/server/core/queue/index.ts
cp fix/src/server/core/middleware/rate-limit.middleware.ts \
   src/server/core/middleware/rate-limit.middleware.ts
cp fix/docker-compose.yml                    docker-compose.yml
cp fix/Dockerfile                            Dockerfile

# 2. Xóa file backup cũ (không cần thiết)
rm -f src/server/core/redis.ts.bak
rm -f src/server/core/queue/index.ts.bak

# 3. Rebuild
docker compose down -v          # xóa volumes cũ nếu cần reset DB
docker compose up --build
```

---

## Kiến trúc Redis sau khi fix

```
┌─────────────────────────────────────────────────────┐
│                   Redis Clients                     │
├──────────────────┬──────────────────┬───────────────┤
│   redisPool      │   _bullRedis     │  redisPubSub  │
│ (pool 5 clients) │ (1 dedicated)    │ (pub + sub)   │
│                  │                  │               │
│ → redisClient    │ → getBullRedis() │ → getPub()    │
│   (Proxy)        │   (raw ioredis)  │   getSub()    │
│                  │                  │               │
│ Dùng cho:        │ Dùng cho:        │ Dùng cho:     │
│ • cache          │ • BullMQ Queue   │ • socket.io   │
│ • rate-limit     │ • BullMQ Worker  │   adapter     │
│ • session        │ • Scheduler      │ • pg-notify   │
└──────────────────┴──────────────────┴───────────────┘
```

---

## Thứ tự init trong bootstrap() (src/server/index.ts)

Thứ tự hiện tại đã **đúng**, không cần thay đổi:

```ts
await initRedis();      // pool + pubsub
await initBullRedis();  // BullMQ dedicated raw client
// ... sau đó mới import và tạo Queue/Worker
const { initWorkers } = await import('./core/queue/automation.worker.js');
```

---

## 🔴 Lỗi 5 (CRITICAL): `Worker.run()` block vô tận — HTTP server không bao giờ start

### Root Cause

BullMQ `Worker.run()` là một vòng lặp poll Redis **vô tận** — Promise trả về **không bao giờ resolve** trừ khi gọi `worker.close()`.

Code cũ:

```ts
// automation.worker.ts
const results = await Promise.allSettled([
  _heavyWorker.run(),  // ← BLOCK MÃI MÃI
  _lightWorker.run(),  // ← không bao giờ đến đây
]);
```

`await Promise.allSettled([...])` chờ TẤT CẢ Promise resolve → hang vô tận.

**Triệu chứng trong log:**
- Thấy `✅ Database seeded and synchronized`
- KHÔNG thấy `🔥 Service [ALL] running on port 3000`
- App container start nhưng port 3000 không có response

### Fix

```ts
// Chạy worker ngầm — KHÔNG await (fire-and-forget)
worker.run().catch((err) => {
  logger.error({ err, worker: name }, `Worker crashed`);
});
logger.info(`Worker [${name}] started (background)`);
```

### File cần fix

```
src/server/core/queue/automation.worker.ts
```

---

## 🔴 Lỗi 6 (CRITICAL): Node.js version mismatch — node:20 vs node:22

### Root Cause

`package.json` khai báo `"engines": { "node": ">=22.0.0" }`.

`build:server` dùng `--target=node22` (esbuild), cho phép dùng các API Node 22+.

`Dockerfile` dùng `node:20-slim` cho cả builder và runner → có thể gây lỗi runtime với code sử dụng API Node 22.

### Fix

```dockerfile
# Trước (SAI)
FROM node:20-slim AS builder
FROM node:20-slim

# Sau (ĐÚNG)
FROM node:22-slim AS builder
FROM node:22-slim
```

### File cần fix

```
Dockerfile
```

---

## 🟡 Lỗi 7 (MEDIUM): REDIS_URL dùng `container_name` thay vì service name

### Root Cause

Docker Compose DNS resolution hoạt động theo **service name** (key trong `services:`), không phải `container_name`.

`REDIS_URL=redis://scmd_redis:6379` dùng `scmd_redis` là `container_name` → có thể không resolve trong network nội bộ Docker.

### Fix

```yaml
# docker-compose.yml
- REDIS_URL=redis://redis:6379  # 'redis' là service name, luôn resolve được
```

### File cần fix

```
docker-compose.yml
```

---

## ✅ Checklist đầy đủ (bao gồm lỗi mới)

```bash
# Fix lỗi 5, 6, 7 (mới phát hiện)
cp fix/src/server/core/queue/automation.worker.ts  src/server/core/queue/automation.worker.ts
cp fix/Dockerfile                                   Dockerfile
cp fix/docker-compose.yml                           docker-compose.yml

# Rebuild hoàn toàn
docker compose down
docker compose build --no-cache
docker compose up
```

