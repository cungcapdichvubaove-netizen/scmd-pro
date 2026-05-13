# SCMD Pro - Enterprise Security Management System Documentation

## Version: V.5.0.0 (Semantic Versioning Baseline)

## Source of Truth (SOT) - The SCMD Pro Whitepaper

Tài liệu này là **Sách trắng (White Paper)** chính thức, đóng vai trò là kiến trúc chuẩn, đặc tả nghiệp vụ và chiến lược công nghệ cho nền tảng SCMD Pro. Mọi quyết định kỹ thuật, quy mô và vận hành phải tuân thủ tuyệt đối các nguyên tắc trong tài liệu này. Mọi thay đổi lịch sử theo từng phiên bản vui lòng tham khảo tại `CHANGELOG.md`.

---

## 1. Executive Summary & Vision (Tầm nhìn & Tổng quan)

SCMD Pro không chỉ là phần mềm quản lý bảo vệ, mà là một **Hệ sinh thái Chỉ huy An ninh Thông minh (Security Command Center)** dành cho doanh nghiệp và tập đoàn. Hệ thống giải quyết các bài toán rủi ro hoạt động (Operational Risks), gian lận thời gian, và độ trễ trong ứng phó sự cố thông qua dữ liệu thời gian thực và trí tuệ nhân tạo (AI Watchdog).

**Mục tiêu cốt lõi:**

- **Zero-Trust Operation:** Không tin tưởng bất kỳ ai mà không có nguồn gốc dữ liệu xác thực (GPS, Chữ ký số, Timestamp từ Server).
- **Proactive Security:** Chuyển đổi từ phản ứng thụ động sang phòng ngừa chủ động thông qua Phân tích dự báo (Predictive Analysis) và SLO Monitoring.
- **Enterprise-Grade Reliability:** Sẵn sàng phục vụ quy mô tập đoàn với SLA 99.99%, Data Isolation an toàn tuyệt đối.
- **Data Integrity Assurance (Mới v4.20):** Tự động kiểm soát tính toàn vẹn dữ liệu tại mọi điểm chạm, ngăn chặn rác dữ liệu và vi phạm policy cấp hệ thống.

---

## 2. Technology Stack (Công nghệ Cốt lõi)

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Zustand (Global State), React Query (Server State), Leaflet (Maps). PWA Support.
- **Backend:** Node.js (v22+, Native ESM), Express.js, TypeScript.
- **Database:** PostgreSQL (Mã nguồn dữ liệu duy nhất - SSOT), Prisma ORM, PostGIS.
- **Cache & Queue:** Redis, BullMQ.
- **Real-time:** Socket.io (Redis Adapter), PostgreSQL LISTEN/NOTIFY.
- **AI & Integrations:** Google Gemini 1.5 Flash (Phân tích dữ liệu), Zalo OA API (Cảnh báo).
- **Observability:** OpenTelemetry (Distributed Tracing), Prometheus, Grafana, Pino (Structured Logging).

---

## 3. High-level Architecture (Kiến trúc cấp cao)

Hệ thống thiết kế theo cơ chế **B2B SaaS Multi-tenancy**, sử dụng **Clean Architecture** tại Backend và **Event-Driven Microservices pattern**.

### 3.1 Data Flow Diagram (Luồng dữ liệu)

```text
[PWA / Web App / Mobile] --- (HTTPS/WSS) ---> [Nginx Load Balancer / Proxy]
                                                      |
                                          +-----------+-----------+
                                          |                       |
                               [Express.js API Layer]      [PDF Service]
                                          |          (Isolated Puppeteer Worker)
                                          v
                               [Prisma ORM / Data Layer]
        +---------------------------------+---------------------------------+
        v                                 v                                 v
[PostgreSQL DB]                  [Redis Cluster]             [External APIs (Gemini/Zalo)]
(Master Data, RLS,             (BullMQ, Pub/Sub, Cache,       (AI Analysis, ZNS Notify)
 Outbox Events)                 Socket.io Adapter)
```

### 3.3. Data Storage & Single Source of Truth (SSOT)

- **PostgreSQL là trái tim của hệ thống (Single Source of Truth):** Toàn bộ dữ liệu nghiệp vụ (Staff, Task, Incident, PatrolLog, Evidence, và trạng thái Real-time) BẮT BUỘC lưu trữ và xử lý tại PostgreSQL.
- **NGHIÊM CẤM kiến trúc Dual-source / Firebase:** Tuyệt đối KHÔNG SỬ DỤNG Firebase (Firestore, Realtime DB) cho bất kỳ tính năng nào. Việc bảo vệ toàn vẹn dữ liệu (Data Integrity) và cô lập dữ liệu (Tenant Isolation qua RLS) diễn ra đồng nhất 100% tại level database (PostgreSQL). Phát sinh event real-time sẽ được xử lý qua PostgreSQL `LISTEN/NOTIFY` (Outbox Pattern) và Pub/Sub qua Redis/Socket.io.

### 3.4 Infrastructure & Scaling (Hạ tầng & Khả năng Mở rộng)

- **Horizontal Scaling & Connection Pooling:** Layer API chạy đa replica (`replicas: 2+`). Database scale bằng connection pool (PgBouncer/Supavisor) ở chế độ Transaction Mode, cho phép phục vụ hàng chục ngàn requests với số lượng DB Connection nhỏ.
- **Microservices-lite:** Tách biệt tác vụ nặng như Render PDF (Puppeteer) ra khỏi HTTP Request Lifecycle chính (đẩy qua port độc lập hoặc container khác) để không gây block Event Loop.
  - **SSRF Hardening (v4.38.1):** Áp dụng **Strict Port Allowlist** cho PDF Service. Chỉ cho phép truy cập ngược lại API nội bộ tại Port 3000. Mọi nỗ lực truy cập vào các port dịch vụ hạ tầng khác (Redis, DB, Monitoring nội bộ) từ PDF Service sẽ bị chặn đứng tại tầng Logic Validation, đảm bảo an toàn tuyệt đối cho mạng nội bộ.
- **WebSocket Resilience (v4.38.3):** Củng cố hạ tầng Real-time bằng cơ chế **Multi-layered Rate Limiting**. Ngăn chặn tấn công DoS và spam thông qua WebSocket bằng cách giới hạn tổng lưu lượng (Global Limit: 30 events/s) và các hành động nhạy cảm (Join Tenant: 5 events/min) thông qua Redis.
- **Active Session Revocation (v4.38.4):** Cải thiện cơ chế thu hồi quyền truy cập bằng cách giảm TTL của auth metadata cache (60s) và triển khai **Active Invalidation** trong các UseCase quản trị nhân sự. Đảm bảo mọi thay đổi về trạng thái tài khoản có hiệu lực tức thì, bảo vệ hệ thống khỏi các tài khoản đã bị vô hiệu hóa.
- **Seeding Security (v4.38.2):** Loại bỏ hoàn toàn plaintext password trong script khởi tạo (Seed). Bắt buộc sử dụng biến môi trường (`SEED_SUPERADMIN_PASSWORD`) để cấu hình mật khẩu quản trị, đảm bảo tính vẹn toàn ngay cả khi source code bị rò rỉ.
- **L1/L2 Caching & Coalescing Strategy (SCMD Pro v4.0.5):**
  - **L1 (In-Process Coalescing):** Sử dụng cơ chế Single-flight (thông qua `authMetadataLocks` Map) để gộp các request đồng thời từ cùng một người dùng vào một DB query duy nhất trong vòng đời của một Process. Lưu ý: Đây là cơ chế local-to-node; trong môi trường multi-replica, các process khác nhau vẫn có thể thực hiện query DB song song cho cùng một metadata trước khi Cache L2 kịp populate. Quyết định này giúp tối ưu Latency bảo vệ Database mà không cần overhead từ Distributed Locking.
  - **L2 (Distributed Cache - Redis):** Lưu trữ metadata xác thực, trạng thái Tenant và phân quyền (TTL: 1h + Jitter 0-5m). Đồng bộ hóa thông báo vô hiệu hóa cache (Invalidation) giữa các Node thông qua Redis Pub/Sub.
  - **Thundering Herd & Exponential Backoff Guard (v4.33.16):** Cơ chế đồng bộ hóa `CacheManager.wrap()` bắt buộc sử dụng cấu trúc Exponential Backoff (`Math.min(50 * Math.pow(2, attempt), 500)`) khi xử lý lock miss. Chiến lược này giúp triệt tiêu hiện tượng dội bom poll liên tục vào Redis, giảm lãng phí CPU cho Node.js Event Loop, và phân mảnh các request tới cùng khóa bộ nhớ đệm, bảo vệ tối đa Database Cluster và Caching Layer.

### 3.3 Multitenancy & Data Isolation (Cô lập Dữ liệu Multi-Tenant)

- **Subdomain-based Routing & Identification:** Phân định danh tính workspace qua biến `tenantId` lấy từ Subdomain (Ví dụ: `vincom.scmdpro.com`).
- **Prisma Middlewares (Vách ngăn Logic):** Toàn bộ truy vấn Database từ Use Cases bắt buộc đi qua vách ngăn `db.forTenant(tenantId)`, DB Extension sẽ ngầm định gắn `WHERE tenantId = ...` vào mọi layer.
- **PostgreSQL Row-Level Security (RLS) & DB Users:** (Tier PRO MAX) Tận dụng RLS tầng Database để ngăn lộ lọt dữ liệu ngay cả khi code có lỗi Injection.

---

## 4. Technical Invariants (Quy tắc Kỹ thuật Bất biến)

### 4.1 Database Performance & Data Integrity

- **Optimized Indices:** Các bảng siêu lớn (như `audit_logs`, `patrol_logs`) bắt buộc có các Composite Index (`[tenantId, createdAt, status]`).
- **Pagination Standard:** Xóa sổ `offset/skip`. Bắt buộc dùng **Cursor-based Pagination** (với `take`, `cursor`) trên tất cả Feed (Timeline, SOC Incident) có biến động thời gian thực (tránh duplicates/missing items do insert mới).
- **Read Replica & CQRS Lite Pattern:** Toàn bộ Query thuần túy (`GET` APIs, Repository Read-only methods) BẮT BUỘC phải truyền flag `{ readOnly: true }` vào `db.withTenant(...)` hoặc `db.forTenant(...)`. Tính năng này sẽ điều hướng request sang Connection Pool của **Read Replica** (thông qua `DATABASE_READ_URL`), nhằm giải phóng áp lực tải trên Primary Database chuyên dụng cho các Transaction Write.
- **Relational Aggregation:** Báo cáo tuần/tháng sử dụng SQL Native, xử lý dạng Batch hoặc Materialized View thay vì Query O(N) về RAM của Node.js.
- **Database-Level Data Integrity (Enums):** Ưu tiên Native PostgreSQL Enums (thông qua Prisma Enum) thay vì định dạng cột `String` cho các trường phân loại/trạng thái cốt lõi (như `Incident.status`, `Staff.role`, `Task.status`). Việc triển khai Native Enums giúp thắt chặt tính toàn vẹn dữ liệu (Data Integrity) ở mức Storage (Single Source of Truth), đồng thời tận dụng Enum Index Optimization của PostgreSQL khi truy vấn. Quá trình chuyển đổi từ String sang Enum được thực hiện thành các migration nhỏ độc lập để giảm thiểu Downtime (Table Locking).
- **Strict Enum Matching (v4.38.5):** Nghiêm cấm tuyệt đối sử dụng JS string literals (e.g. `'reported'`, `'open'`) để so sánh hoặc gán giá trị cho các cột Enum của Prisma (như `IncidentStatus`). Do TypeScript chỉ check type ở compile time đối với `String`, nhưng DB yêu cầu chính xác định dạng Enum (khi compile thì mất mapping, sinh ra silent bugs ở runtime logic). **BẮT BUỘC** sử dụng các Object property Enum chuẩn xác xuất ra từ Prisma Client (`IncidentStatus.REPORTED`). Quy tắc này áp dụng cho mọi tầng (Controller, Service, Workers).
- **Automated Two-Stage Integrity Monitoring (v4.20):**
  - **Giai đoạn 1 (Structural - Synchronous):** Toàn bộ Request Mutation (Create/Update) đi qua Zod Validation và logic `IntegrityGuard`. Guard này thực hiện các check: Quota Check (ví dụ: tối đa số nhân viên), Reference Cross-check (đảm bảo Ref IDs thuộc cùng Tenant).
  - **Giai đoạn 2 (Stateful - Asynchronous):** Sau khi Transaction hoàn tất, hệ thống sử dụng Outbox Pattern để đẩy sự kiện sang Workers. Workers sẽ thực hiện "Hậu kiểm" (Integrity Audit) nhằm phát hiện các sai lệch trạng thái phức tạp mà Giai đoạn 1 bỏ qua, hoặc đồng bộ hóa các Metrics trạng thái liên quan.
- **Performance & Query Optimization (v.4.33.17):**
  - **PostgreSQL Aggregation thay vì N+1 / N-Query Memory Aggregation:** Tuyệt đối không dùng `include` đa tầng ở cấp độ Repository để lấy hàng vạn dòng và đếm (`ShiftReconciliationUseCase`), hay dispatch hàng loạt Promise.all `count()` song song cùng lúc lấy metrics (`StaffRepository.checkReputation`). Mọi tính toán Dashboard, thống kê phải cấu trúc bằng Database-level aggregates qua hàm `db.model.groupBy` hoặc `Raw SQL COUNT(*) FILTER` để đẩy khối lượng tính toán về CSDL thay vì Node.js Event Loop.
  - **Chống Over-fetching trong Read-queries:** Bắt buộc áp dụng `.select` loại bỏ việc Include toàn bộ data cây tổ chức không cần thiết.
  - **Idempotency High-Throughput (Redis-Backed):** Chuyển dịch thiết kế Idempotency Record sang chủ yếu xử lý bằng khóa (SetNX) và trạng thái của Redis với TTL 24h. Giảm tối đa lệnh Hard-Upsert xuống PostgreSQL trong các Transaction Flow cường độ rất lớn (Webhook, Checkpoint Syncing) để hạn chế triệt để Database Write-Contention.

### 4.2 Reliability & Resilience

- **Outbox Pattern:** Các giao dịch chéo ranh giới (ví dụ: Lưu log -> Báo cảnh báo) được bảo chứng bằng bảng `outbox` trong cùng DB Transaction, sau đó được phát thông qua cơ chế `PG LISTEN/NOTIFY` tới worker, cam kết **At-Least-Once Delivery**.
- **Robust API Error Handling:**
  - **Gateway Interceptor:** Các lỗi validation Zod và Exception không lường trước đều được bắt ở cấp Middleware để ngăn lộ StackTrace. Error Response format chuẩn mực: `{ error: { message, code, details, traceId } }`. Zod errors được pass toàn bộ issue list xuống HTTP payload.
  - **Frontend Diagnostic Toasts:** `apiFetch` tự động rã payload lỗi (ví dụ: hỗ trợ đọc array `details` từ lỗi Zod, nối format `[field] message`) để xuất ra thông báo toast cụ thể rõ ràng mà không đòi hỏi xử lý `catch` dư thừa từng API call đơn lẻ ở Component.
  - **Server Logging:** Mọi Exception chưa được handle đều đính kèm `traceId` (OpenTelemetry/Contextual metadata), ghi cấu trúc qua `pino` giúp truy vết log cross-stack (userId, tenantId).
- **Circuit Breaker (opossum):** Phủ trên mọi Network Call ra ngoài (Gemini AI, Zalo OA, Email). Mở mạch (Open) và rớt ngay sau N lần lỗi, trả payload lỗi sanitized (không leak stack-trace), tự động retry thăm dò sau một thời gian cấu hình (Half-Open).
- **AI Cost Control (Mới v4.0.0):** Triển khai Application-level throttle (`aiLimiter` và `aiQuotaTracking`) cho toàn bộ các endpoint `/ai/*` (Gemini API) nhằm bảo vệ hạn mức chi phí AI (ngăn chặn Tenant/DDoS vượt hạn mức). Cấu hình tracking quota linh hoạt qua `SystemConfig` (mặc định 1000 lượt/tháng).
- **Asynchronous Queues:**
  - _Light Worker (Concurrency: 30):_ Gửi Notification, Sync Cache, Audit Logs Trivial.
  - _Heavy Worker (Concurrency: 3):_ Render PDF, LLM Evaluation, Report XLS Generation.

### 4.3 Security & Zero-Trust Protocols

- **Zod & Zero-Trust Validation (Hardened v5.0.1.1):** 
  - **UseCase Level Enforcement:** KHÔNG chỉ validate ở Controller. Mọi UseCase BẮT BUỘC phải thực hiện `schema.parse(input)` ngay tại entry point để bảo vệ ranh giới Domain (Zero Trust Boundary).
  - **Input/Output Mapping:** Mọi endpoint bắt buộc có validation payload tường minh. Không tin tưởng dữ liệu FE.
  - **reCAPTCHA Resilience (v5.0.1.3):** Áp dụng cơ chế **Fail-Open** cho toàn bộ các luồng xác thực (Login & Trial Registration). Hệ thống sẽ bỏ qua kiểm tra reCAPTCHA nếu Google API không thể truy cập, đảm bảo dịch vụ không bị gián đoạn do yếu tố bên thứ ba.
- **RBAC & Attribute-Based Checks:** Hệ thống cấp phép phân tầng (Tenant Staff, Tenant Admin, System Admin). Không bypass.
- **Data Mutation Audit Trail:** Mọi sửa đổi trạng thái thực thể lõi phải chèn dòng vào `audit_logs` có kèm tham chiếu `traceId`.
- **Domain Error Handling:** (Mới v4.38.5) Ngừng sử dụng pattern string-matching (`throw new Error('NOT_FOUND: ...')`). Bắt buộc sử dụng hệ thống `DomainError` (e.g. `NotFoundError`, `BadRequestError`, `ForbiddenError` từ `domain.error.ts`) tại tầng Use Case. `errorHandler` trung tâm sẽ tự động map và trả về HTTP status code tương ứng để tránh HTTP 500 lỗi logic và tăng type safety.

---

## 5. Domain Architectures (Đặc tả Kiến trúc Chức năng Cốt lõi)

### 5.1 Smart Patrol (Tuần tra thông minh & Chống Gian Lận)

- **Anti-Fraud Mechanics (Hardened v5.0.1.1):**
  1. Yêu cầu mã QR luân chuyển (QR Injection qua WebSocket).
  2. **GPS Forensic Verification**: Sử dụng Haversine Formula cho kinh độ/vĩ độ, max tolerance < 50m so với Checkpoint chủ. Nếu vi phạm, hệ thống tự động trigger `isValid: false` và dán nhãn `SUSPICIOUS` tại Database metadata để phục vụ hậu kiểm.
  3. Image Timestamp & Hardware Signatures xác thực ảnh upload.
- **Offline Reliability:** App PWA sử dụng IndexedDB lưu tạm cache tuần tra nếu sập mạng. Sync Queue tự động đẩy dữ liệu khi `Navigator.onLine` active.

### 5.2 Real-time SOC (Security Operations Center)

- **State Transition:** Socket.io (có Redis Adapter gắn kết Node Instances). Only Event-emitters. Không xử lý business trong Socket Payload. Database Transaction là điểm quyết định state, sau đó báo `Notify` cho socket server update UI.
- **Presence & Heartbeat:** Cập nhật trạng thái "Đang làm việc", "Mất tín hiệu" của nhân viên qua Redis `SETEX` keys.

### 5.3 The AI Watchdog (Trí Tuệ Nhân Tạo)

- **LLM Governance:** Không truyền PII (Personally Identifiable Information) thô trực tiếp cho Gemini nếu không cần thiết. Format prompts cấu trúc JSON rõ ràng.
- Sử dụng Gemini API (Pro/Flash) để thực thi Use cases: Đánh giá hành vi bảo vệ, Phân tích sơ đồ chuỗi vi phạm, Gợi ý tự động (Predictive Analysis) tại Dashboard quản trị viên.

### 5.4 Vendor Evaluation (SLA Ngầm & Đánh giá Nhà Thầu)

- **Time-Series SLAs:** Tính điểm hằng ngày thông qua Job Cron (1:00 AM). Điểm SLA bị trừ tự nhiên dựa trên số lỗi Compliance bị vi phạm trong ngày. Report xuất theo tháng là Data Aggregation, không tính toán Real-time để tiết kiệm tài nguyên.

---

## 6. Observability & Operations (Giám sát & Quản lý)

### 6.1 Telemetry (Đo lường từ xa)

- **Prometheus Exporter (`/api/v1/monitor/metrics`):** Thu thập Throughput, Error Rate (% 5xx HTTP), Queue Depth (BullMQ backlog).
- **Distributed Tracing (OpenTelemetry):** Mỗi Request được đính kèm `traceId`. `traceId` luân chuyển qua Prisma, Axios Outbound, Redis, BullMQ Job. Bất cứ Log lỗi (`error.toISOString`) cũng có `traceId` để filter log chéo microservices trên Grafana Loki hoặc Jaeger.

### 6.2 Disaster Recovery (Khôi phục thảm họa)

- **Data Backup:** Postgres tự động thực hiện WAL Archiving & Daily Snapshot.
- **Graceful Shutdown:** SIGTERM traps trên Node.js để hoàn thành nốt HTTP Requests & dừng Queue Poll một cách an toàn không mất job (BullMQ Pause).

### 6.3 Cố định Định dạng Chụp ảnh & Chống Giả mạo (Anti-Spoofing Camera API) - v4.33.5

- **Live Evidence Capture:** BẮT BUỘC sử dụng MediaDevices API (`navigator.mediaDevices.getUserMedia`) đối với các tính năng chụp ảnh làm bằng chứng (Sự cố, Check-in, Báo cáo). Nghiêm cấm sử dụng input type file truyền thống để ngăn chặn việc Guard upload ảnh giả mạo từ thư viện (gallery).
- **Watermarking (Dấu thời gian & Vị trí):** Mọi ảnh chụp thông qua luồng Live Evidence phải được đính kèm trực tiếp thông tin TimeStamp và GPS Coordinates trên thẻ Canvas trước khi được upload, tạo thành một khung hình nguyên khối. Điều này giúp ngăn chặn hoàn toàn việc can thiệp Exif Data.
- **Vòng đời tài nguyên (Memory/Battery Management):** Stream từ Camera phải thực thi Clean-up hook (tắt các Tracks) ngay lập tức khi unmount Component để chống rò rỉ tài nguyên, suy giảm pin của thiết bị.

---

## 8. Luồng Nghiệp vụ & Logic Chi tiết (Detailed Business Flows)

### 8.1 Luồng Onboarding & Trial (Đăng ký dùng thử)

1. **Khởi tạo:** User đăng ký qua Form Trial. Hệ thống validate reCAPTCHA v3 và Check Email trùng lặp.
2. **Provisioning:**
   - Tạo bản ghi `Tenant` với subdomain định danh.
   - Tạo `Staff` đầu tiên với role `TENANT_ADMIN`.
   - Khởi tạo `TenantSubscription` mặc định gói `FREE`.
3. **Setup:** Admin thiết lập Checkpoints và gán QR Codes cho các vị trí tuần tra.

### 8.2 Luồng Tuần tra & Chống gian lận (Patrol Workflow)

1. **Check-in:** Nhân viên quét QR qua Mobile App (PWA).
2. **Validation:**
   - **GPS Guard:** Hệ thống so sánh tọa độ `(lat, lng)` của thiết bị với tọa độ Checkpoint đã lưu. Sai số > 50m sẽ gắn cờ `SUSPICIOUS`.
   - **QR Rotation:** Mã QR có thể được cấu hình thay đổi theo thời gian thực (WebSocket) để ngăn chặn việc chụp ảnh QR dán tại nhà.
3. **AI Analysis:** Kết thúc ca trực, dữ liệu được gửi sang Gemini API để phân tích hành vi (Check-in có quá nhanh không? Có bỏ sót điểm rủi ro không?).

### 8.3 Luồng Xử lý Sự cố (Incident Lifecycle)

1. **Reporting:** Chụp ảnh, mô tả sự cố tại Checkpoint.
2. **Escalation:** System đẩy Alert qua Zalo (ZNS) hoặc Socket.io tới Manager.
3. **Resolution:** Manager phê duyệt phương án xử lý, cập nhật trạng thái `Resolved`. Mọi bước đều lưu `AuditLog`.

---

## 9. Chi tiết Hạ tầng & Logic Đặc biệt (Specialized Logic)

### 9.1 Hệ thống PDF Microservice (Managed Microservice)

- **Cơ chế:** Khi Admin yêu cầu xuất báo cáo (CV, Patrol Report), API Server gửi yêu cầu (gọi internal) tới port `3001` (spawned node process).
- **Isolaton:** Puppeteer chạy trong process riêng để đảm bảo Memory Leak không làm sập API chính.
- **Resilience:** Nếu Microservice lỗi, Client sẽ nhận được thông báo lỗi cụ thể thay vì timeout trắng trang.

### 9.2 Billing & Activation System (v4.32.2)

- **Manual Activation:** Super Admin kiểm tra mã Giao dịch (`PaymentRef`) và kích hoạt Gói cước.
- **Transaction Safety:** Việc cập nhật gói cước (`Subscription`) và tạo bản ghi Thanh toán (`Payment`) được thực thi trong một `Prisma Transaction` duy nhất.
- **Mock Data Visualization:** Hệ thống cung cấp bộ dữ liệu demo (tại `.mock-data.json`) chứa các trạng thái `Active`, `Expired`, `Pending` để kiểm thử UI Dashboard Billing trực quan.

### 9.3 Zero-Trust Data Layer (Row Level Security)

- **Tenant ID Bound:** Toàn bộ query Database là "Tenant-Aware". Developer không cần viết `where tenantId = ...` thủ công nhờ cơ chế Global DB Extension.
- **RBAC Strictness:** Manager không thể can thiệp vào cấu hình Billing; Super Admin không thể xem nội dung Sự cố chi tiết của Tenant trừ khi được cấp quyền đặc biệt.

---

## 10. Kịch bản Kiểm thử & Xác thực trước Deploy (Pre-deployment Validation)

| Thành phần           | Kịch bản Kiểm thử                                                                | Kết quả mong đợi                                                              |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Multi-tenancy**    | Truy cập `/api/v1/tenant/staff` từ subdomain A nhưng dùng Token của subdomain B. | **403 Forbidden** hoặc **404 Not Found** (RLS Block).                         |
| **Integrity Guard**  | Cố tình tạo 10 nhân viên trong khi Gói cước giới hạn 2 người.                    | **402 Payment Required** hoặc Validation error.                               |
| **PDF Service**      | Xuất báo cáo CV của nhân viên có dung lượng ảnh lớn (> 5MB).                     | Microservice xử lý ổn định, không bị OOM, trả về file PDF < 10s.              |
| **Billing UI**       | Super Admin kích hoạt gói cho một Tenant rác.                                    | Bảng thanh toán cập nhật đúng ngày hết hạn, Audit log ghi nhận `activatedBy`. |
| **GPS Verification** | Mock GPS cách xa Checkpoint 500m và thực hiện tuần tra.                          | Dashboard hiện cảnh báo đỏ `SUSPICIOUS_FLAG`.                                 |

---

## 11. Kiến trúc Multi-Tenant Image Storage & Billing (V4.34.0)

Cập nhật kiến trúc Storage Tiering sử dụng S3-compatible API (R2) kết hợp với Time-weighted Billing.

### 11.1. Storage Architecture

- **Presigned URL Flow**: Client trực tiếp upload file thông qua Presigned URL do API Server cấp phát, giảm thiểu 100% bandwidth upload cho hệ thống Node.js.
- **Validation Strict**: Policy của Presigned URL giới hạn chẽ size (`content-length-range`) và chuẩn MIME types định sẵn theo yêu cầu ứng dụng để khóa chặn file có hại.
- **Image Lifecycle Engine**: Quản lý vòng đời ảnh bằng DB (Pending -> Active -> Expired -> Deleting -> Deleted). DB là Source of Truth nhằm ngăn ngừa lỗi Orphan Data hay Ghost Billing.

### 11.2. Time-weighted Usage Billing

- Áp dụng mô hình Event-based cho Usage Billing (PostgreSQL bảng `tenant_usage_events`), ghi lại mọi `delta_bytes` upload/delete.
- Tính toán thông lượng lưu trữ tự động hóa, replayable không phụ thuộc vào tình trạng cloud storage tại các bản snapshot point.

### 11.3. Outbox Pattern

- Async task: `IMAGE_UPLOADED` và `IMAGE_DELETED` được trigger tới BullMQ thông qua Event Outbox pattern từ PostgreSQL, cách ly Node layer đối với Data consistency. Môi trường Heavy Worker tiếp tục audit dọn dẹp các Orphan chunks dư thừa.

---

## 12. Global Audit Log & Accountability (V4.36.0)

Nhằm đảm bảo tính minh bạch và tránh tranh chấp trách nhiệm (non-repudiation) với khách hàng/tenant, hệ thống áp dụng cơ chế giám sát **Global Audit Log** cho Super Admin. Quá trình triển khai yêu cầu triệt tiêu hoàn toàn rủi ro kỹ thuật (Hardening).

### 12.1. Cốt lõi thiết kế (Architecture Design)

- **Centralized Cross-Tenant View**: Bổ sung API `GET /api/v1/sys-manage/audit-logs` tại node Super Admin khai thác `db.system().auditLog.findMany()`. Đây là ngoại lệ có kiểm soát của quy tắc Tenant Isolation, bắt buộc phải bảo vệ bởi quyền `system:manage`.
- **Strict Bounding & Offset Elimination**: Truy vấn toàn cầu đối mặt với hàng chục triệu dòng dữ liệu. Bắt buộc dùng Cursor-based Pagination. Đặc biệt, để ngăn chặn **Full Table Scan** khi không có `tenantId`, Database BẮT BUỘC phải tạo Index toàn cục `@@index([createdAt(sort: Desc)])` (nên tạo bằng Concurrent Indexing).
- **Date Range Limiter**: Bắt buộc cưỡng ép mốc thời gian tối đa `from/to` trong queries. Nếu client không truyền, hệ thống tự động gán giới hạn độ phân giải tối đa 30/90 ngày gần nhất (unbound history guard).

### 12.2. Kiểm soát rủi ro bảo mật & Dữ liệu

- **Recursive Data Scrubbing**: Việc làm sạch Payload (Masking) phải đệ quy qua các node (kể cả Array tại Root level) và trang bị bộ từ điển alias nghiêm ngặt (`pwd`, `passwd`, `pass`, `token`, vân vân).
- **Infinite Loop Prevention (Audit the Auditor)**: Tránh đệ quy sinh log rác làm phình to Data khi Super Admin thao tác truy vấn Log, bằng cách thiết kế bảng Schema ẩn danh hoặc Filter Ignore action type `SUPERADMIN_VIEW_GLOBAL_AUDIT_LOGS`.
- **Throttling & Rate-Limit**: Bổ sung bộ đếm Global Rate Limit (ví dụ: 30 requests/phút) riêng cho endpoint cực nặng này.
- **Data Cold Storage**: Bảng `audit_logs` sẽ tự động lên lịch export ra các nền tảng Cold Storage (S3/R2 .parquet files) trước khi thực hiện xóa (DELETE older than 180 days) nhằm xoá gánh nặng DBMS mà vẫn đảm bảo được bằng chứng nếu có tranh chấp trong tương lai.

---

## 13. CI/CD & Quality Assurance (Đảm bảo chất lượng)

Hệ thống áp dụng quy trình kiểm soát chất lượng nghiêm ngặt thông qua GitHub Actions.

### 13.1. CI Workflow

- **Linting**: Thực thi `eslint . && tsc --noEmit` để đảm bảo code sạch và type-safe.
- **Testing**: Chạy toàn bộ bộ test `vitest` cho cả logic Business và Security Rules.
- **Migration Safety Guard**: Sử dụng `prisma migrate diff` để phát hiện schema drift. Nếu schema hiện tại không khớp với lịch sử migration, pipeline sẽ báo lỗi (Exit 1).
- **Migration Lock**: Kiểm tra sự tồn tại của `migration_lock.toml` để ngăn chặn rủi ro race-condition khi migration database.
- **Build Verification**: Chạy `npm run build` để xác nhận bundle frontend và backend sẵn sàng cho production.

### 13.2. Environment Consistency

Pipeline CI sử dụng PostgreSQL service thực tế (`postgres:15-alpine`) để chạy các integration tests, đảm bảo môi trường test tiệm cận nhất với production.
