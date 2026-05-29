# SCMD Pro — Contact & Support Intake Flow

## Mục tiêu

Flow này tách riêng 2 nguồn dữ liệu:

1. **Public contact lead** từ trang `/contact`: khách chưa đăng nhập, chưa có `tenantId`, phục vụ sales/support intake.
2. **Tenant feedback/support ticket** trong app: người dùng đã đăng nhập, có `tenantId`, phục vụ hỗ trợ vận hành nội bộ.

Không dùng chung `feedback` cho public lead để tránh gán sai tenant và tránh phá tenant isolation.

## Public contact lead

```text
/contact
→ POST /api/v1/public/contact-leads
→ publicContactLeadLimiter
→ Zod validate + normalize
→ optional/required Turnstile server-side verification
→ honeypot / duplicate suppression / email daily throttle
→ PostgreSQL advisory transaction lock theo emailHash
→ db.withTenant('SYSTEM')
→ contact_leads
→ 202 + trackingCode
```

### Bảng `contact_leads`

Bảng này là **platform-scope intake**, không thuộc tenant RLS. Quyền đọc/ghi phải được giới hạn bởi service role/backend. Không expose API đọc public.

Dữ liệu PII:

- `full_name`
- `email`
- `phone`
- `company`
- `message`
- `user_agent`

Dữ liệu giảm rủi ro:

Raw email không được index ở DB; lookup/throttle/dedupe dùng `email_hash`.

- `ip_hash`: hash SHA-256, không lưu IP raw.
- `email_hash`: hash SHA-256 để throttle/deduplicate mà không cần query email thô.
- `content_hash`: hash fingerprint cho duplicate suppression.

### Validation và constraint

Ứng dụng validate bằng Zod. DB có `CHECK` constraint cho:

- `intent`: `DEMO_REQUEST`, `TECHNICAL_SUPPORT`, `SYSTEM_INCIDENT`, `BUSINESS_PARTNERSHIP`, `BILLING`, `OTHER`
- `source`: `PUBLIC_CONTACT_PAGE`, `LANDING_PAGE`, `PRICING_PAGE`, `DOCS_PAGE`, `SUPPORT_LINK`
- `status`: `NEW`, `CONTACTED`, `QUALIFIED`, `RESOLVED`, `SPAM`

Phone chỉ cho phép `+`, số, khoảng trắng, dấu `-`, dấu `.`, dấu ngoặc. Source là enum server-side, không nhận string tùy ý từ client.

### Anti-abuse

Các lớp bảo vệ hiện có:

1. IP rate limit: `publicContactLeadLimiter`.
2. Honeypot field `website`.
3. PostgreSQL advisory transaction lock theo `emailHash` trước khi check duplicate/throttle để tránh race condition khi burst concurrent requests.
4. Duplicate suppression: cùng `emailHash + contentHash` trong 60 phút trả lại tracking code cũ, không tạo bản ghi mới.
5. Email daily throttle: tối đa 3 lead/email hash/ngày.
6. Tracking code entropy 8 bytes + retry 5 lần khi gặp Prisma unique constraint `P2002` trên `tracking_code`.
7. Public error response luôn sanitized, không trả stack trace/Prisma error cho client.

### CAPTCHA/Turnstile

Backend hỗ trợ verify Cloudflare Turnstile server-side trước khi ghi DB.

Env production bắt buộc cho public traffic:

```env
VITE_TURNSTILE_SITE_KEY=<site-key>
CONTACT_LEAD_TURNSTILE_REQUIRED=true
CLOUDFLARE_TURNSTILE_SECRET_KEY=<secret>
CONTACT_LEAD_TURNSTILE_TIMEOUT_MS=3000
```

Frontend `/contact` render Cloudflare Turnstile khi có `VITE_TURNSTILE_SITE_KEY` và gửi token qua `turnstileToken`. Backend verify token server-side với timeout ngắn và fail-closed khi token/secret không hợp lệ.

Quy tắc mặc định: nếu `NODE_ENV=production` và không set `CONTACT_LEAD_TURNSTILE_REQUIRED=false`, bootstrap yêu cầu đủ `VITE_TURNSTILE_SITE_KEY` + `CLOUDFLARE_TURNSTILE_SECRET_KEY` và fail-fast nếu thiếu. Khi challenge bắt buộc nhưng cấu hình không hợp lệ ở runtime, API trả lỗi sanitized `CONTACT_LEAD_UNAVAILABLE` thay vì ghi DB.

Desktop/local/demo có thể tắt có chủ đích bằng:

```env
CONTACT_LEAD_TURNSTILE_REQUIRED=false
```

Riêng `docker-compose.desktop.yml` không dùng trực tiếp giá trị production-template `CONTACT_LEAD_TURNSTILE_REQUIRED` từ `.env`; nó map `DESKTOP_CONTACT_LEAD_TURNSTILE_REQUIRED=false` thành flag backend để container desktop chạy được dù build vẫn là `NODE_ENV=production`. Muốn test Turnstile trên desktop, set:

```env
DESKTOP_CONTACT_LEAD_TURNSTILE_REQUIRED=true
VITE_TURNSTILE_SITE_KEY=<site-key>
CLOUDFLARE_TURNSTILE_SECRET_KEY=<secret>
```

Không tắt challenge khi mở public traffic thật hoặc chạy ads.

### Retention đề xuất

Retention đã có script thực thi dạng **dry-run mặc định**:

```bash
npm run contact:retention
```

Muốn ghi/xóa thật phải xác nhận rõ target DB và set:

```bash
CONTACT_RETENTION_CONFIRM=delete npm run contact:retention
```

Mặc định:

- `SPAM`: xóa sau 30 ngày (`CONTACT_LEAD_SPAM_RETENTION_DAYS`).
- `RESOLVED`: anonymize PII sau 730 ngày (`CONTACT_LEAD_RESOLVED_RETENTION_DAYS`).
- Khi anonymize, hệ thống xóa `fullName/email/company/phone/subject/message/userAgent/ipHash` và rotate `emailHash/contentHash` để giảm khả năng link lại PII cũ.
- `NEW` không được xử lý: cần dashboard/ops review định kỳ sau 90 ngày.
- Không dùng bảng này cho analytics dài hạn nếu chưa anonymize PII.

## Tenant feedback/support ticket

```text
HelpCenter
→ POST /api/v1/tenant/feedback
→ requireAuth + requirePermission('log:write')
→ TenantController.submitFeedback
→ SubmitFeedbackUseCase
→ feedback
```

Backend hỗ trợ compatibility:

- Client mới: `description + severity`.
- Client cũ: `message + priority`.

Quy tắc mới:

- `severity/priority` được normalize uppercase.
- Chỉ nhận `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Nếu gửi cả `severity` và `priority` nhưng khác nhau, backend trả 400 với lỗi `AMBIGUOUS_FEEDBACK_SEVERITY`.

## Kiểm tra bắt buộc trước merge

```bash
npm run security:scan
npm run architecture:scan
npm run version:check
npx prisma validate
npm run db:generate
npm run test:coverage
npm run lint
npm run build
docker compose config
```

Không xóa `.env` tự động trong hướng dẫn áp dụng. Nếu cần kiểm tra gói source sạch, hãy backup hoặc loại `.env` khỏi zip/repo thay vì chạy lệnh destructive trên môi trường dev/staging.
