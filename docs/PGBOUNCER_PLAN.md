# Kế Hoạch Triển Khai PgBouncer & Scale Connection Pool (SCMD Pro)
# Tình trạng: Planning (Chuẩn bị cho Scale 50+ Active Tenants)

## Mở Bài (Bối cảnh)
Hiện tại dự án SCMD Pro đang sử dụng tính năng Connection pooling trực tiếp từ Prisma client/PostgreSQL với giới hạn connection phụ thuộc vào max connections của PostgreSQL server.
Với quy mô dưới 50 tenants, kiến trúc này vẫn đáp ứng tốt. Tuy nhiên, khi đạt mốc 50+ active tenants (đặc biệt khi kết hợp background workers cho AI, Queue và real-time SOS),
việc mở quá nhiều connection sẽ khiến PostgreSQL quá tải (Memory/CPU bị tiêu tốn cho việc duy trì idle connections, connection thrashing), làm tăng query latency hoặc timeout. 
Vì vậy, việc triển khai PgBouncer theo mô hình Transaction-based pooling là cấu phần bắt buộc tiếp theo.

## Mục Tiêu (SLOs/KPIs cho Database Layer)
1. **Connection Multiplexing:** Phục vụ hàng chục nghìn client connections (từ API Servers, Worker Servers) nhưng chỉ duy trì lượng cấu hình thực tế trên PostgreSQL (e.g., 50-100 real connections).
2. **Giảm Latency:** Hạn chế TCP handshake và PostgreSQL process forking cho mỗi connection.
3. **Transparent cho Application Code:** Không phá vỡ kiến trúc Prisma RLS hiện tại, application chỉ thấy kết nối database nhanh và ổn định hơn.

## Các Bước Triển Khai

### 1. Phân Tích Hiện Trạng Codebase (SCMD Pro v2.5.x)
- Prisma Client đã hỗ trợ cờ `isProxy`. Khi kích hoạt (hoặc phát hiện URI bắt đầu bằng `prisma://`), Prisma sẽ tự động định tuyến connection queries logic theo cơ chế PgBouncer.
- RLS / Tenant setup: `db.forTenant()` sử dụng các custom parameters trên transaction (`set_config(app.tenant_id, ...)`). PgBouncer sử dụng **Transaction Mode** sẽ đảm bảo config session không bị chia sẻ chéo giữa các connection multiplex trên cùng 1 server socket (bảo mật Tenant Isolation - Zero Trust).

### 2. Cấu Hình PgBouncer cho SCMD Pro
- **Mode:** BẮT BUỘC dùng **Transaction Mode** (để query state giữa các transaction không bị lẫn lộn giữa các tenants). Session Mode sẽ không đem lại hiệu năng pooling cao cho môi trường REST/Microservices, còn Statement Mode chặn multi-statement transactions.
- **Max Client Connections:** `max_client_conn = 10000` (Cho phép 10k connections request tới PgBouncer).
- **Default Pool Size:** `default_pool_size = 50` (Tùy thuộc vào resources server PostgreSQL, e.g., 50-100 db connections thực sự).
- Tích hợp Auth: Cấu hình `auth_query` và `auth_file` để quản lý tài khoản DB.

### 3. Tích hợp Infrastructure (Docker / Kubernetes)
#### Với Docker Compose (Self-hosted/On-premise):
Thêm một block service trong `docker-compose.yml`:
```yaml
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/scmdpro # Connection tới DB vật lý
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=10000
      - DEFAULT_POOL_SIZE=50
    ports:
      - "6432:5432"
    depends_on:
      - db
```

#### Với Managed Database (AWS RDS Proxy, Supabase, Neon.tech):
- Nếu sử dụng Supabase (có sẵn Transaction pooler port `6543`), đổi `DATABASE_URL` sang port `6543`.
- `DIRECT_URL` (cho Database Migrations) tiếp tục sử dụng port `5432` hoặc session pooler.

### 4. Tác động tới Prisma Schema & Environment Variables
- `.env`: Cập nhật cấu hình môi trường.
  ```env
  # Transaction Pooler (cho Serverless/Web App API - Routing qua PgBouncer)
  DATABASE_URL="postgres://user:pass@pgbouncer_host:6432/scmdpro?pgbouncer=true"

  # Direct connection (Dùng riêng cho npx prisma migrate - port gốc 5432)
  DIRECT_URL="postgres://user:pass@db_host:5432/scmdpro"
  ```
- Application code: Cờ `isProxy` hoặc param `?pgbouncer=true` trong Prisma client sẽ ngăn Prisma chạy các statements không tương thích với Transaction mode như chuẩn bị prepared statements. 

### 5. Deployment Rollout
- **Giai đoạn 1 (Testing/Staging):**
  - Boot PgBouncer container nội bộ. Đổi config API chạy qua PgBouncer.
  - Run **Load Test** (K6) giả lập 10,000 QR check-ins / giây (burst-load) để test outbox processor limit và connection limit.
  - Đảm bảo các Audit Log queue không drop kết nối do load spike.
- **Giai đoạn 2 (Production):**
  - Đưa PgBouncer lên. Chuyển đổi Environment Variables (Zero-downtime deploy).
  - Monitoring CPU của RDS PostgreSQL để kiểm chứng metrics `idle connections` sụt giảm.

## Rủi Ro Cần Lưu Ý
- **Prepared Statements Validation:** Trong Prisma Client, pgbouncer=true mặc định disable prepared statements. Sẽ cần đảm bảo Prisma queries không bị negative impact về latency (dù pooler overhead thường tốt hơn).
- **Session State (SET LOCAL):** Do Prisma dùng `SET LOCAL "app.current_tenant_id"` trong Transaction, khi run ở **Transaction Mode** trên PgBouncer thì state bị reset mỗi giao dịch -> Data Leakage không xảy ra. Tắt các logic global state (Session mode). 

## Checklist Kích Hoạt (When ready)
- [ ] Bật server PgBouncer.
- [ ] Set `DB_POOL_MIN` và `DB_POOL_MAX` nếu vẫn cần Prisma maintain internal sub-pool nhỏ (VD: 5-10 kết nối túc trực).
- [ ] Configure `DIRECT_URL` trong `.env`.
- [ ] Setup Datadog/Prometheus Monitor capture `pgbouncer_active_client_connections`. 
