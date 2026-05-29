# SCMD Pro — Bộ tài liệu Enterprise Documentation Pack

**Phiên bản tài liệu:** 0.9 — biên soạn từ static analysis codebase `9.zip`  
**Ngày biên soạn:** 2026-05-22  
**Phạm vi:** khách hàng doanh nghiệp, vận hành hiện trường, nhà thầu bảo vệ, đội triển khai kỹ thuật, đội tích hợp, QA/security, pháp chế.  
**Nguyên tắc biên soạn:** chỉ khẳng định nội dung có căn cứ từ codebase, schema, config, route, middleware, service, tài liệu nội bộ. Điểm chưa đủ bằng chứng được ghi rõ **“Chưa xác minh từ codebase”** hoặc phân loại là **khuyến nghị chính sách**.

---

## 0. Tóm tắt xác minh hệ thống

### 0.1 Persona và phạm vi quyền

| Persona / Role | Mã role trong code | Phạm vi chính được xác minh |
|---|---|---|
| Super Admin | `super-admin` | Toàn quyền hệ thống, tenant, billing, permissions, feature flags, audit toàn cục. |
| Tenant Admin / Client Admin | `tenant-admin` | Quản trị vận hành tenant: staff, checkpoint, vendor, contract, report, violation review/resolve. |
| Supervisor / Site Supervisor | `supervisor` | Giám sát staff/checkpoint/log/report/task/vendor, xem dispute, review violation. |
| Vendor Commander | `vendor-commander` | Workspace nhà thầu: staff read/write trong scope vendor, log, report, task, vendor read, submit/view dispute, review violation. |
| Vendor Representative | `vendor-representative` | Đọc staff/log/report/vendor trong scope, submit/view dispute. |
| Guard | `guard` | Đọc checkpoint, ghi/đọc log, đọc task. |
| Technician | `technician` | Checkpoint read/write, log read, task read. |

**Nguồn xác minh:** `src/server/core/architecture/types.ts`, `src/server/core/auth/permissions.ts`, `src/server/shared/security/vendor-actor-scope.ts`.

### 0.2 Tenant model và data isolation

Hệ thống sử dụng mô hình multi-tenant theo `Tenant`, `tenantId` và subdomain/workspace. Phần lớn bảng nghiệp vụ có trường `tenant_id` và index theo tenant. RLS được khai báo trong `prisma/rls_setup.sql`, dùng session variable `app.current_tenant_id`, cho phép bypass có kiểm soát khi context là `SYSTEM`. Các bảng tenant-scoped gồm staff, patrol, incident, vendor, contract, report, violation, attachments, images và nhiều bảng khác. Bảng `tenants`, `system_configs`, `tenant_subscriptions`, `billing_payments` bị giới hạn `SYSTEM`.

**Nguồn xác minh:** `prisma/schema.prisma`, `prisma/rls_setup.sql`, `src/server/core/db/prisma.ts`, `src/server/bootstrap/tenant-context.middleware.ts`, `src/server/shared/middlewares/auth.middleware.ts`.

### 0.3 Entity và workflow lõi

| Nhóm | Entity chính | Vai trò trong hệ thống |
|---|---|---|
| Tenant/Auth | `Tenant`, `Staff`, `TenantSubscription`, `AuditLog`, `Idempotency` | Workspace, người dùng, role, subscription, audit, chống lặp request. |
| Vendor/Contract | `Vendor`, `Site`, `GuardPost`, `Contract`, `ContractVersion`, `ContractLineItem`, `ContractShiftRequirement`, `ContractStaffStandard`, `ContractChecklistRequirement`, `ContractPenaltyRule` | Số hóa hợp đồng, vendor/site/post, versioning, luật ca trực, số quân, tiêu chuẩn, phạt. |
| Shift/Attendance | `ShiftSchedule`, `ShiftAssignment`, `ShiftComplianceItem`, `AttendanceRecord`, `ShiftSession` | Lập lịch, phân công guard, kiểm tra thiếu người, chấm công/ca. |
| Patrol | `Checkpoint`, `PatrolRoute`, `PatrolAssignment`, `PatrolSession`, `PatrolLog`, `PatrolBenchmarkDeviation` | QR/GPS tuần tra, route, session, log, compliance. |
| Incident/SLA | `Incident`, `IncidentTimeline`, `IncidentEvidence`, `IncidentSlaRule`, `Notification` | Sự cố, SLA phản hồi/xử lý, bằng chứng, timeline, cảnh báo. |
| Violation/Report | `ViolationEvent`, `ViolationDispute`, `MonthlyAcceptanceReport`, `VendorScorecard`, `PenaltyItem`, `Attachment` | Vi phạm, giải trình, đối soát tháng, snapshot, tính phạt, xuất báo cáo. |
| System/Infra | `EventOutbox`, Redis/BullMQ, PDF Service, S3/R2 provider, Gemini AI, Zalo service | Tác vụ nền, export, storage, AI, notification ngoài. |

---

# Nhóm I — Bộ tài liệu dành cho Khách hàng và Vận hành

---

# 1. Hướng dẫn Thiết lập Cấu hình Luật Đối soát
## Contract Compliance Setup Guide

### 1.1 Mục đích

Tài liệu này hướng dẫn khách hàng/tenant admin số hóa điều khoản hợp đồng bảo vệ thành “luật vận hành” trong SCMD Pro để hệ thống có thể lập lịch ca, phát hiện thiếu người, đánh giá tuần tra, tính vi phạm, tạo scorecard và lập báo cáo nghiệm thu tháng.

Cơ chế nền tảng đã được xác minh trong codebase là: `Contract` lưu thông tin định danh, `ContractVersion` lưu version hợp đồng, và các bảng con cấu trúc hóa luật gồm `ContractLineItem`, `ContractShiftRequirement`, `ContractStaffStandard`, `ContractChecklistRequirement`, `ContractPenaltyRule`.

### 1.2 Đối tượng sử dụng

- Tenant Admin / Client Admin.
- Bộ phận vận hành dịch vụ bảo vệ phía khách hàng.
- Bộ phận tài chính/kế toán cần dữ liệu đối soát.
- Đội triển khai kỹ thuật khi nhập cấu hình ban đầu.

### 1.3 Phạm vi

Bao gồm cấu hình vendor, site, guard post, contract, contract version, đơn giá/số quân, ca trực, tiêu chuẩn nhân sự, checklist và điều khoản phạt. Không bao gồm OCR/AI tự động bóc tách hợp đồng vì backend hiện chặn cứng `ai_contract_scan` với thông điệp: `AI Contract Scan chưa khả dụng cho đến khi Contract Rule Engine hoàn tất.`

### 1.4 Điều kiện tiên quyết

| Điều kiện | Yêu cầu |
|---|---|
| Quyền truy cập | `tenant-admin` hoặc `super-admin`; `vendor-commander` có quyền vận hành shift nhưng không được sửa luật hợp đồng gốc. |
| Dữ liệu nền | Đã có `Vendor`, `Site`, `GuardPost`. |
| Hợp đồng giấy | Phải có số hợp đồng, kỳ hiệu lực, site/post áp dụng, số quân theo ca, đơn giá, tiêu chuẩn guard, SLA, phạt. |
| Feature flag | Các feature liên quan: `contract_compliance`, `vendor_management`, `shift_planning`, `penalty_engine`, `monthly_acceptance_report`, `vendor_scorecard`. |

### 1.5 Thuật ngữ

| Thuật ngữ | Định nghĩa vận hành |
|---|---|
| Contract | Hợp đồng dịch vụ bảo vệ, gắn vendor/site/tenant. |
| Contract Version | Phiên bản luật vận hành của hợp đồng, có `DRAFT`/`ACTIVE` và `effectiveFrom`. |
| Line Item | Dòng đơn giá/số quân theo site, chốt, ca, số người, đơn giá, chu kỳ. |
| Shift Requirement | Quy định ca trực: chốt, loại ca, giờ bắt đầu/kết thúc, số quân yêu cầu, ngày áp dụng. |
| Staff Standard | Tiêu chuẩn nhân sự: mã tiêu chuẩn, bằng cấp/chứng chỉ/yêu cầu, mức chặn hoặc cảnh báo. |
| Penalty Rule | Luật phạt theo `violationCode`, đơn vị tính, số tiền/tỷ lệ, grace, cap, repeat escalation. |

### 1.6 Vai trò và quyền hạn

| Hoạt động | Tenant Admin | Supervisor | Vendor Commander | Super Admin |
|---|---:|---:|---:|---:|
| Tạo vendor/site/post | A/R | C | I | A/R |
| Tạo/sửa contract | A/R | C | I | A/R |
| Tạo/sửa version DRAFT | A/R | C | I | A/R |
| Active version | A/R | C | I | A/R |
| Generate shift từ contract | A/R | C | R trong vendor scope | A/R |
| Assign guard vào shift | A/R | C | R trong vendor scope | A/R |
| Resolve violation/dispute | A/R | R/C | I | A/R |

A = accountable, R = responsible, C = consulted, I = informed.

### 1.7 Quy trình chi tiết

#### Bước 1 — Tạo Vendor

Nhập các trường tối thiểu: `name`, `contactPerson`, `email`, `phone`. Các trường tùy chọn gồm `taxCode`, `address`, `managerName`, `serviceScope`, `riskLevel`, `notes`, `status`. Validation trong schema yêu cầu email hợp lệ và phone không rỗng.

API liên quan: `POST /api/v1/admin/vendors` hoặc `POST /api/v1/sys-manage/vendors`.

#### Bước 2 — Tạo Site

Nhập `siteName`, `address`, `siteType`, `vendorId` nếu site gắn nhà thầu cụ thể. `geoFence` có thể lưu JSON nhưng định dạng chi tiết chưa thấy schema bắt buộc.

API liên quan: `POST /api/v1/admin/sites`, `PUT /api/v1/admin/sites/:id`.

#### Bước 3 — Tạo Guard Post

Nhập `siteId`, `postName`, `postType`, `requiredGuardCount`, `gpsLat`, `gpsLng`, `radiusMeters`. Validation yêu cầu `gpsLat` và `gpsLng` phải cùng có hoặc cùng không có; `radiusMeters` là số nguyên dương, mặc định 50.

Guard post là điểm neo để tính yêu cầu số quân, ca trực, GPS proximity và lập shift.

#### Bước 4 — Tạo Contract

Trường tối thiểu trong `contractSchema`:

| Field | Bắt buộc | Tác động downstream |
|---|---:|---|
| `vendorId` | Có | Scope vendor, report, scorecard, dispute. |
| `siteId` | Có | Scope site, guard post, report. |
| `startDate`, `endDate` | Có | Hiệu lực hợp đồng; validation `endDate > startDate`. |
| `value` | Có | Tổng giá trị hợp đồng/financial reference. |
| `currency` | Có, default VND | Tính toán tiền/phạt. |
| `guardCountPerShift` | Có | Fallback/legacy số quân theo ca. |
| `slaConfig` | Có | Mục tiêu tuần tra, SLA incident, grace check-in, penalty legacy. |
| `acceptancePolicy` | Không | Chính sách nghiệm thu nếu có. |
| `evidencePolicy` | Không | Chính sách bằng chứng nếu có. |
| `penaltyPolicy` | Không | Legacy policy; backend có sync sang `ContractPenaltyRule`. |

API liên quan: `POST /api/v1/admin/contracts`, `PUT /api/v1/admin/contracts/:id`.

#### Bước 5 — Thiết lập Contract Version và các tab cấu trúc

Codebase có schema cho `ContractVersion` và các bảng con cấu trúc. Tài liệu nội bộ yêu cầu version `ACTIVE` là bất biến và report phải lưu `contractVersionId`. Workflow khuyến nghị:

`Create Contract -> Create Version DRAFT -> Add Line Items/Rules -> Activate Version -> Operate -> Create New DRAFT for changes -> Activate New Version`.

**Chưa xác minh từ codebase:** route API riêng để tạo/sửa từng `ContractVersion` trực tiếp chưa xuất hiện rõ trong `routes.ts`. Code hiện có `ContractSyncService` và repository sync từ `penaltyPolicy`, line items/shift requirements/staff standards/checklist vào bảng cấu trúc khi create/update contract. UI `VendorContractManagement.tsx` cần được QA đối chiếu thao tác thực tế.

#### Tab Đơn giá và Số quân — `ContractLineItem`

Field lõi được xác minh trong schema/tài liệu:

| Field | Ý nghĩa | Bắt buộc vận hành |
|---|---|---|
| `siteId` | Site áp dụng | Có, để scope báo cáo. |
| `guardPostId` | Chốt bảo vệ | Nên có để map ca/chốt. |
| `shiftName` | Tên ca | Có nếu tính theo ca. |
| `requiredStaffCount` | Số quân bắt buộc | Có, ảnh hưởng thiếu người và billing. |
| `unitPrice` | Đơn giá | Có, ảnh hưởng billing. |
| `billingCycle` | Chu kỳ | Mặc định tháng theo tài liệu. |
| `totalAmount` | Thành tiền | Thường = `requiredStaffCount * unitPrice`. |
| `metadata` | Ghi chú/alias legacy | Không. |

Ví dụ đúng: một guard post cổng chính, ca DAY 07:00–19:00, required 2, unit price 12.000.000 VND/tháng, total 24.000.000.  
Ví dụ sai: requiredStaffCount = 0; unitPrice không phải số; guardPost không thuộc site của contract; ca không khớp shift requirement.

#### Tab Chốt/Ca trực — `ContractShiftRequirement`

Field lõi:

| Field | Ý nghĩa | Tác động |
|---|---|---|
| `guardPostId` | Chốt áp dụng | Sinh `ShiftSchedule`. |
| `shiftName`/`shiftType` | Tên/loại ca | Hiển thị và đối chiếu. |
| `startTime`, `endTime` | Giờ ca | Tạo lịch, xác định quá giờ. |
| `requiredStaffCount` | Số người phải có | Thiếu người tạo violation. |
| `patrolRequired` | Ca có yêu cầu tuần tra | Liên quan patrol compliance. |
| Các cờ ngày trong tuần | Ngày áp dụng | Lập lịch đúng ngày. |

Khi shift đã qua giờ bắt đầu mà vẫn thiếu người, repository có logic tạo `ViolationEvent` với `sourceType = SHIFT_SCHEDULE`, `violationType = SHIFT_UNDERSTAFFED`, `status = PENDING_REVIEW`.

#### Tab Tiêu chuẩn nhân sự — `ContractStaffStandard`

Field/thông tin được repository xử lý:

| Field | Ý nghĩa |
|---|---|
| `standardCode`, `standardName` | Mã/tên tiêu chuẩn. |
| `required` | Có bắt buộc hay không. |
| `blockingLevel` | `BLOCK` hoặc `WARN` theo logic repository. |
| `requiredQualifications` | Danh sách chứng chỉ/kỹ năng. |
| `appliesToGuardPostId` | Áp dụng cho chốt cụ thể. |

Assign guard cần kiểm tra staff standard dựa trên `qualifications`, `licenseNumber`, `idNumber`, `idExpiry`. Tài liệu nội bộ yêu cầu critical standard phải chặn assign; thiếu thông tin mềm có thể cảnh báo.

#### Tab Điều khoản phạt — `ContractPenaltyRule`

Field lõi:

| Field | Ý nghĩa |
|---|---|
| `violationCode` | Mã lỗi dùng để match penalty, không chỉ match severity. |
| `penaltyUnit` | `PER_OCCURRENCE`, `PER_HOUR`, `PER_GUARD`, `PERCENT_CONTRACT`. |
| `amount`/`percentValue` | Số tiền hoặc tỷ lệ. |
| `graceCount` | Số lần miễn phạt trong tháng. |
| `maxMonthlyPenalty` | Trần phạt tháng cho rule. |
| `repeatEscalation` | Multiplier tăng theo tái phạm. |
| `isActive` | Rule còn áp dụng hay không. |

Penalty engine V2 tạo `PenaltyItem` với `baseAmount`, `unit`, `quantity`, `graceApplied`, `capApplied`, `finalAmount`, `calculationDetail`, `contractVersionSnapshot` và trạng thái ban đầu `SUGGESTED`.

### 1.8 Kiểm tra trước khi vận hành

- Contract có đúng vendor/site/guard post.
- Contract hoặc version có hiệu lực đúng kỳ.
- Mỗi chốt/ca đều có `requiredStaffCount` > 0.
- Line item có đơn giá và currency đúng.
- Penalty rule dùng cùng `violationCode` với hệ thống tạo violation.
- Staff standard có phân biệt `BLOCK` và `WARN`.
- Generate shift thử một kỳ ngắn và kiểm tra `ShiftSchedule`/`ShiftAssignment`.
- Tạo report thử cho tháng test và đối chiếu `contractVersionId`, snapshot, penalty details.

### 1.9 Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `END_DATE_MUST_AFTER_START_DATE` | Ngày kết thúc trước ngày bắt đầu | Sửa kỳ hợp đồng. |
| `GPS_LAT_LNG_REQUIRED_TOGETHER` | Chỉ nhập lat hoặc lng | Nhập đủ cả lat/lng hoặc bỏ cả hai. |
| Không sinh shift | Thiếu shift requirements hoặc contract/site không đúng scope | Kiểm tra contract active/version và guard post. |
| Guard không assign được | Trùng ca, ngoài vendor/site/contract scope, thiếu tiêu chuẩn chặn | Kiểm tra staff assignment và tiêu chuẩn. |
| Phạt không tính | Violation code không match rule, rule inactive, violation status chưa thuộc nhóm tính phạt | Kiểm tra `ContractPenaltyRule` và lifecycle status. |

### 1.10 Kiểm soát nội bộ/audit

Các thao tác quan trọng như assign guard, generate shift, create/update contract, finalize report cần ghi audit. Codebase có `AuditService`, `AuditLog` và masking dữ liệu nhạy cảm trong audit (`audit.mask.ts`). Cần bảo đảm mọi thao tác cấu hình luật hợp đồng đi qua API có audit log và không sửa trực tiếp DB.

### 1.11 Tiêu chí hoàn tất

- Contract/version ở trạng thái phù hợp và có đầy đủ rule vận hành.
- Shift schedule sinh đúng kỳ.
- Violation test tạo đúng `PENDING_REVIEW` khi thiếu người.
- Report thử có snapshot, score, penalty items.
- QA ký xác nhận mapping hợp đồng giấy ↔ rule hệ thống.

### 1.12 Nguồn xác minh từ codebase

`DOCUMENTATION.md`, `prisma/schema.prisma`, `src/server/modules/vendor/vendor.schema.ts`, `src/server/modules/vendor/vendor.repository.ts`, `src/server/modules/vendor/contract-sync.service.ts`, `src/server/modules/vendor/application/generate-shift-schedules.usecase.ts`, `src/server/modules/vendor/application/assign-shift.usecase.ts`, `src/server/modules/report/application/penalty-engine-v2.ts`, `src/server/modules/report/application/monthly-compliance.shared.ts`, `src/server/shared/middlewares/auth.middleware.ts`.

### 1.13 Khoảng trống cần xác nhận

- UI Structured Authoring cho từng tab cần đối chiếu trực tiếp ở `VendorContractManagement.tsx` vì route CRUD riêng cho `ContractVersion` chưa thể xác nhận đầy đủ.
- Cơ chế “lưu nháp/phê duyệt version” đã có model và tài liệu governance, nhưng route activation/version-specific chưa được xác minh hoàn chỉnh.
- AI Contract Scan hiện bị chặn; không được đưa vào quy trình triển khai thật.

---

# 2. Sổ tay Giám sát Hiện trường
## Site Supervisor Playbook

### 2.1 Mục đích

Hướng dẫn Site Supervisor phía khách hàng giám sát vận hành bảo vệ theo thời gian thực: Command Center, bản đồ, ưu tiên cảnh báo, sự cố, incident SLA, tuần tra, thiếu người và hậu kiểm violation.

### 2.2 Đối tượng sử dụng

- Site Supervisor.
- Tenant Admin phụ trách vận hành.
- Đội an ninh nội bộ khách hàng.

### 2.3 Phạm vi

Dashboard Command Center, monitor, incident workflow, patrol QR/GPS, notification, violation review. Không bao gồm quyền resolve dispute cuối cùng nếu role supervisor không được cấp `violation:resolve` trong permission mặc định.

### 2.4 Điều kiện tiên quyết

- Có tài khoản role `supervisor` hoặc `tenant-admin`.
- Site/checkpoint/guard post/contract đã cấu hình.
- Guard dùng mobile/PWA để check-in, scan QR, gửi incident/evidence.
- Realtime/socket và API backend hoạt động.

### 2.5 Định nghĩa trạng thái quan trọng

| Nhóm | Trạng thái |
|---|---|
| Incident | `REPORTED`, `ACKNOWLEDGED`, `ASSIGNED`, `INVESTIGATING`, `WAITING_VENDOR_RESPONSE`, `ESCALATED`, `RESOLVED`, `RESOLVED_PENDING_APPROVAL`, `REOPENED`, `CLOSED`, `CANCELLED`. |
| Violation | `PENDING_REVIEW`, `DISPUTED`, `CONFIRMED`, `WAIVED`, `PENALIZED` theo lifecycle xử lý trong report/dispute. |
| Patrol log | `scanned` hoặc `exception` khi có lỗi GPS/duplicate/order/evidence. |
| Shift | thiếu người phát sinh `SHIFT_UNDERSTAFFED`. |

### 2.6 Checklist đầu ca

1. Mở Command Center và kiểm tra feed, priorities, map data.
2. Kiểm tra các ca sắp bắt đầu theo site/guard post.
3. Đối chiếu số guard đã assign với yêu cầu hợp đồng.
4. Kiểm tra guard có checkpoint/route được giao.
5. Kiểm tra camera/GPS/mạng trên thiết bị guard nếu có ca trọng yếu.
6. Ghi nhận rủi ro đầu ca vào task/audit nội bộ nếu cần.

### 2.7 Checklist giữa ca

1. Theo dõi cảnh báo `CHUA_CHECK_IN`, thiếu người, tuần tra không hoàn thành.
2. Kiểm tra patrol logs và map: guard có scan đúng checkpoint, đúng khoảng cách GPS hay không.
3. Với incident mới: acknowledge, assign hoặc yêu cầu vendor xử lý theo SLA.
4. Với sự cố nghiêm trọng: escalation cho tenant admin/ban an ninh.
5. Kiểm tra bằng chứng ảnh có watermark thời gian/GPS hoặc evidence metadata.

### 2.8 Checklist cuối ca

1. Đối chiếu ca đủ người/thiếu người.
2. Kiểm tra patrol session hoàn thành, số checkpoint missed/late/out-of-order/gps violation.
3. Kiểm tra incident còn mở hoặc quá SLA.
4. Đưa violation `PENDING_REVIEW` vào danh sách hậu kiểm.
5. Ghi nhận ngoại lệ: mất mạng, thiết bị lỗi, đổi ca, GPS tranh chấp.

### 2.9 Quy trình xử lý Incident SLA

Lifecycle mô tả bằng văn bản:

`REPORTED -> ACKNOWLEDGED -> ASSIGNED/INVESTIGATING -> RESOLVED_PENDING_APPROVAL hoặc RESOLVED -> APPROVED/REJECTED -> CLOSED hoặc REOPENED`.

- Khi incident được tạo, hệ thống lưu `Incident`, có `severity`, `severityWeight`, `description`, `location`, `imageUri`, `reportedAt`.
- SLA dùng các field `responseDueAt`, `resolutionDueAt`, `responseAcknowledgedAt`, `resolutionSubmittedAt`, `slaBreached`.
- `ProcessIncidentSlaBreachUseCase` tìm incident quá hạn phản hồi/xử lý và tạo notification/violation ở trạng thái `PENDING_REVIEW`.
- Phê duyệt phương án xử lý dùng `approve-incident-resolution.usecase.ts`; nếu chưa đủ bằng chứng hoặc không đạt yêu cầu, dùng reject/reopen.

### 2.10 Quy trình hậu kiểm ViolationEvent `PENDING_REVIEW`

1. Xác định nguồn vi phạm: shift, patrol, incident SLA, manual audit.
2. Kiểm tra liên kết vendor/contract/site.
3. Xem evidence snapshots nếu đã có report hoặc evidence attached.
4. Kiểm tra ngoại lệ hợp lệ: mất mạng, GPS yếu, đổi ca được duyệt, checkpoint đóng tạm thời.
5. Ra quyết định sơ bộ:
   - Giữ `PENDING_REVIEW` nếu cần nhà thầu giải trình.
   - Chuyển dispute flow nếu vendor gửi giải trình.
   - Xác nhận/miễn/phạt theo quyền của tenant admin hoặc role được cấp.
6. Đảm bảo mọi quyết định có `responseNote`, audit trail và không sửa DB trực tiếp.

### 2.11 Tình huống bất thường

| Tình huống | Nguyên tắc xử lý |
|---|---|
| Mất mạng | Guard ghi nhận thời điểm, chụp ảnh live nếu có thể, supervisor ghi chú ngoại lệ; dữ liệu offline/PWA chưa xác minh đầy đủ nên không khẳng định auto-sync. |
| Check-in chậm | Đối chiếu `lateCheckInGraceMinutes` trong `slaConfig`, shift schedule và thực tế. |
| Tranh chấp GPS | Kiểm tra `PatrolLog`, checkpoint radius, `location`, accuracy nếu có, ảnh watermark GPS, và route session. |
| Ảnh không hợp lệ | Kiểm tra upload file type, magic bytes, watermark, metadata; nếu upload từ thư viện không bị chặn tuyệt đối ở backend thì cần quy trình QA bằng chứng. |
| Guard đổi ca đột xuất | Vendor Commander/tenant admin cập nhật assignment nếu còn trong thẩm quyền; ghi audit và lý do. |
| Incident quá SLA | Escalate, ghi timeline, kiểm tra notification và violation SLA. |

### 2.12 FAQ

**Supervisor có được xóa violation không?**  
Chưa xác minh có route xóa violation. Theo thiết kế audit, nên dùng resolve/waive/dispute thay vì xóa.

**Có thể tin GPS tuyệt đối không?**  
Không. Code có kiểm tra proximity và QR hash/replay buffer, nhưng tài liệu vận hành vẫn cần bằng chứng bổ trợ như ảnh live, timeline, thiết bị và xác nhận hiện trường.

**Ảnh evidence có chống giả mạo không?**  
Frontend `SecureCameraCapture` dùng camera live, watermark thời gian/GPS, upload blob. Backend kiểm tra mime/magic bytes cho ảnh. Chưa thấy backend chứng minh chặn tuyệt đối upload từ thư viện cho mọi flow.

### 2.13 Nguồn xác minh từ codebase

`src/server/routes.ts`, `src/server/modules/patrol/command-center.controller.ts`, `src/server/modules/patrol/monitor.controller.ts`, `src/server/core/use-cases/patrol/scan-qr.usecase.ts`, `src/server/modules/incident/*`, `src/server/modules/notification/*`, `src/server/modules/vendor/application/process-overdue-shift-shortages.usecase.ts`, `src/apps/security/interfaces/components/CommandFeed.tsx`, `PriorityWidget.tsx`, `TacticalMap.tsx`, `IncidentLifecycleManager.tsx`.

### 2.14 Khoảng trống cần xác nhận

- Offline sync PWA có `sync-manager.ts` nhưng cần test thiết bị thật để khẳng định luồng mất mạng.
- Quyền phê duyệt cuối cùng của supervisor phụ thuộc dynamic permissions; mặc định supervisor có `violation:review`, không có `violation:resolve`.
- Cần UAT để xác nhận tên cảnh báo UI như `THIEU_NGUOI`, `CHUA_CHECK_IN` được hiển thị nhất quán.

---

# 3. Quy trình Nghiệm thu và Đối soát Tài chính Hàng tháng
## Monthly Acceptance & Billing Guide

### 3.1 Mục đích

Hướng dẫn khách hàng xuất, đọc, đối chiếu, xử lý tranh chấp và chốt `MonthlyAcceptanceReport`, làm căn cứ nghiệm thu chất lượng dịch vụ bảo vệ thuê ngoài và chuyển dữ liệu tài chính cho kế toán.

### 3.2 Đối tượng sử dụng

- Tenant Admin / quản lý khách hàng.
- Site Supervisor cung cấp dữ liệu vận hành.
- Vendor Commander/Vendor Representative gửi giải trình.
- Kế toán/finance nhận số liệu phạt/nghiệm thu.

### 3.3 Phạm vi

Report tháng theo `month`, `vendorId`, tùy chọn `contractId`, `siteId`; vendor scorecard; penalty items; violation dispute; export artifact PDF/Excel theo schema.

### 3.4 Điều kiện tiên quyết

- Contract và luật phạt đã cấu hình.
- Ca, tuần tra, incident, violation đã ghi nhận trong tháng.
- Vendor/site/contract scope hợp lệ.
- Người chốt report có quyền `report:finalize`/`violation:resolve`; code gọi `assertClientDisputeDecisionAuthority` khi finalize/resolve dispute.

### 3.5 Dữ liệu snapshot tháng

`generateMonthlyComplianceSnapshot` xây snapshot gồm:

- Patrol sessions, incidents, violations, shift schedules, shift compliance items.
- Vendor snapshot, site snapshot, contract snapshot, `contractVersionId`.
- SLA policy snapshot, penalty policy snapshot.
- Violation snapshots, evidence snapshots.
- Penalty calculation details, generated data hash.
- Metrics: patrol rate, incident SLA rate, shift coverage, evidence completeness, manual audit, total score.
- `PenaltyItem` tạo từ penalty engine.

### 3.6 Lifecycle báo cáo

`Generate -> DRAFT -> Review/Dispute -> Finalize -> FINALIZED`  
Nếu cần sửa sau khi đã chốt: `FINALIZED -> Create Revision DRAFT -> Review -> Finalize Revision`; bản cũ có thể thành `SUPERSEDED` khi revision mới được chốt.

Trạng thái xác minh trong code: `DRAFT`, `FINALIZED`, `SUPERSEDED`.

### 3.7 Quy trình thao tác

#### Bước 1 — Tạo báo cáo tháng

API: `POST /api/v1/tenant/monthly-acceptance-reports/generate`  
Input: `{ month: "YYYY-MM", vendorId, contractId?, siteId? }`.

Nếu đã có report `DRAFT`, code có thể update draft hiện có. Nếu report mới nhất đã `FINALIZED`, code tạo revision mới với `revisionNumber` tăng.

#### Bước 2 — Đọc báo cáo

API: `GET /api/v1/tenant/monthly-acceptance-reports` với filter `month`, `vendorId`, `contractId`, `siteId`, `status`, `limit`, `cursor`, `sortOrder`.

Các phần cần đọc:

| Phần | Cách đọc |
|---|---|
| Summary | Tổng quan điểm, phạt, vi phạm confirmed/pending. |
| Scorecard | `patrolRate`, `incidentRate`, `disciplineRate`, `shiftCoverageRate`, `totalScore`. |
| Violation snapshots | Danh sách lỗi, trạng thái, scope, evidence. |
| Penalty calculation | Mỗi `PenaltyItem`: base, unit, quantity, grace/cap, final amount. |
| Contract/version snapshot | Bảo đảm report dùng đúng rule tại thời điểm phát sinh. |

#### Bước 3 — Xử lý tranh chấp

Vendor gửi dispute qua `POST /api/v1/tenant/violation-disputes`. Schema yêu cầu:

- `violationEventId`: bắt buộc.
- `reportId`: tùy chọn.
- `reason`: 5–4000 ký tự.
- `responseNote`: tối đa 2000 ký tự.

Khi submit, code cập nhật `ViolationEvent.status = DISPUTED` và tạo `ViolationDispute.status = SUBMITTED`. Nếu report đã `FINALIZED`, hệ thống trả lỗi `REPORT_ALREADY_FINALIZED`.

Client resolve bằng `POST /api/v1/tenant/violation-disputes/:id/resolve` với:

- `resolution`: `CONFIRMED`, `WAIVED`, `PENALIZED`.
- `responseNote`: 3–4000 ký tự.

Mapping status: `CONFIRMED -> CONFIRMED`, `WAIVED -> WAIVED`, `PENALIZED -> PENALIZED`; penalty item liên quan chuyển `WAIVED` hoặc `CONFIRMED` theo quyết định.

#### Bước 4 — Chốt báo cáo

API: `POST /api/v1/tenant/monthly-acceptance-reports/:id/finalize` với `notes` tùy chọn.

Khi finalize, code:

- Chặn nếu report đã `FINALIZED`.
- Khóa evidence liên quan bằng `lockedByReportId`, `lockedAt`, `isReportLocked`.
- Cập nhật `PenaltyItem.status = FINALIZED`.
- Cập nhật report `status = FINALIZED`.
- Có thể cập nhật bản cũ thành `SUPERSEDED` nếu đây là revision.
- Cập nhật `VendorScorecard.status = FINALIZED`.

### 3.8 Ma trận trách nhiệm

| Hoạt động | Tenant Admin | Supervisor | Vendor Commander | Finance |
|---|---:|---:|---:|---:|
| Generate report | A/R | C | I | I |
| Kiểm tra vận hành | A | R | C | I |
| Gửi giải trình | I | C | A/R | I |
| Resolve dispute | A/R | C | C | I |
| Finalize report | A/R | C | I | C |
| Chuyển số liệu kế toán | A | I | I | R |

### 3.9 Timeline khuyến nghị

| Mốc | Hoạt động | Ghi chú |
|---|---|---|
| Ngày 1–2 tháng sau | Generate report DRAFT | Khuyến nghị vận hành; chưa thấy cron bắt buộc. |
| Ngày 3–5 | Vendor giải trình | Chưa thấy auto-expiry dispute trong code, cần quy định hợp đồng. |
| Ngày 6–7 | Client resolve dispute | Ghi đủ response note. |
| Ngày 8 | Finalize | Sau finalize, không submit dispute vào report đã chốt. |
| Sau finalize | Finance nhận số liệu | Dùng report snapshot/penalty final. |

### 3.10 Kiểm soát rủi ro sau chốt

- Không sửa report đã `FINALIZED`; dùng revision flow.
- Evidence đã khóa phải được xem là căn cứ lịch sử.
- Khi phát sinh khiếu nại sau chốt, tạo revision hoặc biên bản bổ sung, không ghi đè snapshot.
- Kế toán chỉ dùng số liệu từ report `FINALIZED` hoặc revision mới nhất đã chốt.

### 3.11 Export

Route xác minh: `POST /api/v1/tenant/monthly-acceptance-reports/:id/export`, `GET /api/v1/tenant/monthly-acceptance-reports/:id/artifacts/:attachmentId/download`. Schema hỗ trợ `format: pdf | excel`. Export dùng queue/report artifact storage theo module report.

### 3.12 Nguồn xác minh từ codebase

`src/server/modules/report/report.schema.ts`, `src/server/modules/report/report.controller.ts`, `src/server/modules/report/application/monthly-compliance.shared.ts`, `generate-monthly-acceptance-report.usecase.ts`, `finalize-monthly-acceptance-report.usecase.ts`, `create-monthly-acceptance-revision.usecase.ts`, `submit-violation-dispute.usecase.ts`, `resolve-violation-dispute.usecase.ts`, `penalty-engine-v2.ts`, `monthly-acceptance-scoring.ts`, `prisma/schema.prisma`.

### 3.13 Khoảng trống cần xác nhận

- Chưa xác minh có auto cut-off hoặc auto-expiry dispute; nên đưa vào hợp đồng/SOP nếu cần.
- Tích hợp kế toán SAP/Oracle chưa thấy endpoint hoàn chỉnh; xem Nhóm III, tài liệu API.
- Cần kiểm thử export Excel/PDF trên môi trường production vì PDF service là microservice riêng.

---

# Nhóm II — Bộ tài liệu dành cho Đối tác/Nhà thầu Bảo vệ

---

# 4. Hướng dẫn dành cho Chỉ huy Nhà thầu
## Vendor Commander Workspace Manual

### 4.1 Mục đích

Hướng dẫn `vendor-commander` vận hành nhân sự, lịch ca, cảnh báo và nghĩa vụ tuân thủ hợp đồng trong phạm vi nhà thầu được gán.

### 4.2 Phạm vi dữ liệu được nhìn thấy

Role vendor-scoped chỉ được truy cập dữ liệu khớp `assignedVendorId`; nếu có `assignedSiteId` hoặc `assignedContractId`, scope tiếp tục bị thu hẹp. Helper `applyVendorActorScope` tự thêm `vendorId`, `siteId`, `contractId` vào query. Helper `assertVendorActorValueInScope` chặn input ngoài scope với lỗi `VENDOR_SCOPE_MISMATCH`, `SITE_SCOPE_MISMATCH`, `CONTRACT_SCOPE_MISMATCH`.

### 4.3 Quyền hạn mặc định

Vendor Commander có: staff read/write, checkpoint read, log read/write, report generate, task read/write, vendor read, submit/view dispute, violation review. Không có quyền mặc định: quản trị tenant, system, billing, finalize report, resolve dispute, sửa luật hợp đồng gốc.

### 4.4 Quy trình hằng ngày

#### Đầu ngày

1. Mở workspace vendor/shift scheduler.
2. Lọc shift theo `dateFrom`, `dateTo`, `contractId` nếu cần.
3. Kiểm tra các ca chưa đủ guard.
4. Assign guard phù hợp, tránh overlap và bảo đảm tiêu chuẩn.
5. Ghi chú các ca có rủi ro thiếu người.

#### Trong ca

1. Theo dõi `CHUA_CHECK_IN`, thiếu người, tuần tra chưa hoàn thành.
2. Điều phối guard thay thế nếu có vắng mặt.
3. Kiểm tra patrol logs và incident phát sinh.
4. Phối hợp với supervisor khi có incident SLA.

#### Cuối ca

1. Kiểm tra shift coverage.
2. Xác nhận guard đã hoàn thành patrol/session.
3. Gửi giải trình sớm cho violation hợp lý.
4. Chuẩn bị evidence cho đối soát tháng.

### 4.5 Shift Scheduler

API xác minh:

- `GET /api/v1/admin/shift-schedules`
- `POST /api/v1/admin/shift-schedules/generate`
- `POST /api/v1/admin/shift-assignments`
- `DELETE /api/v1/admin/shift-assignments/:id`

Use case cho generate/assign cho phép `TENANT_ADMIN`, `SUPER_ADMIN`, `VENDOR_COMMANDER`. Khi assign, repository kiểm tra scope và staff standard. Mỗi lần assign ghi `AuditService.log` action `ASSIGN_GUARD_TO_SHIFT`.

### 4.6 Cảnh báo vận hành

| Cảnh báo | Ý nghĩa | Hành động |
|---|---|---|
| `THIEU_NGUOI` / `SHIFT_UNDERSTAFFED` | Ca thiếu guard so với requirement | Bổ sung guard hoặc giải trình. |
| `CHUA_CHECK_IN` | Guard chưa xác nhận/điểm danh | Liên hệ guard, cập nhật thay thế. |
| Tuần tra chưa hoàn thành | Patrol session còn checkpoint missed/late | Điều phối guard hoàn thành hoặc ghi lý do. |
| Incident quá SLA | Nhà thầu chưa phản hồi/xử lý đúng hạn | Escalate và gửi evidence xử lý. |

### 4.7 Những gì vendor không được truy cập

- Dữ liệu vendor khác.
- Dữ liệu site/contract ngoài assignment scope.
- Billing/system/subscription toàn hệ thống.
- Feature flag/permission matrix.
- Quyền finalize monthly acceptance hoặc resolve dispute cuối cùng, trừ khi tenant cấp dynamic permission ngoài mặc định.

### 4.8 Nguồn xác minh từ codebase

`src/server/shared/security/vendor-actor-scope.ts`, `src/server/core/auth/permissions.ts`, `src/server/modules/vendor/application/generate-shift-schedules.usecase.ts`, `assign-shift.usecase.ts`, `remove-shift-assignment.usecase.ts`, `src/server/modules/vendor/vendor.repository.ts`, `src/apps/security/interfaces/components/ShiftSchedulerView.tsx`, `VendorTab.tsx`, `VendorEvaluationReport.tsx`.

### 4.9 Khoảng trống cần xác nhận

- UI workspace riêng cho persona vendor-commander cần UAT để xác nhận màn hình hiển thị/ẩn đúng so với permission.
- Tên cảnh báo tiếng Việt trong UI có thể khác constant backend; cần chuẩn hóa i18n.

---

# 5. Hướng dẫn Quy trình Giải trình và Tranh chấp
## Violation Dispute & Explanation Protocol

### 5.1 Mục đích

Chuẩn hóa quy trình nhà thầu gửi giải trình cho vi phạm, khách hàng xem xét, và hệ thống ghi nhận kết luận làm căn cứ đối soát/phạt.

### 5.2 Phạm vi

Áp dụng cho `ViolationEvent` và `ViolationDispute`, đặc biệt trong kỳ report tháng. Không áp dụng cho khiếu nại ngoài hệ thống nếu không có mã violation/report tương ứng.

### 5.3 Vai trò

| Vai trò | Trách nhiệm |
|---|---|
| Vendor Commander/Representative | Gửi dispute/explanation, cung cấp lý do và evidence hợp lệ. |
| Supervisor | Kiểm tra hiện trường, cung cấp nhận xét. |
| Tenant Admin | Quyết định `CONFIRMED`, `WAIVED`, `PENALIZED`. |
| System | Ghi audit, cập nhật trạng thái violation/dispute/penalty. |

### 5.4 Trạng thái lifecycle

`PENDING_REVIEW -> DISPUTED -> RESOLVED`  
Kết luận cập nhật `ViolationEvent` thành `CONFIRMED`, `WAIVED`, hoặc `PENALIZED`. `PenaltyItem` liên quan chuyển `WAIVED` hoặc `CONFIRMED` tùy kết luận.

### 5.5 Gửi giải trình

API: `POST /api/v1/tenant/violation-disputes`

Payload:

```json
{
  "violationEventId": "...",
  "reportId": "... optional ...",
  "reason": "Lý do giải trình tối thiểu 5 ký tự, tối đa 4000 ký tự",
  "responseNote": "Ghi chú bổ sung tối đa 2000 ký tự"
}
```

Điều kiện:

- Violation phải tồn tại trong tenant.
- Vendor actor phải đúng `vendorId/siteId/contractId` scope.
- Nếu report được gắn và report đã `FINALIZED`, hệ thống từ chối.

### 5.6 Bằng chứng hợp lệ

Codebase xác minh có attachment/evidence cho incident và attachment chung; dispute schema hiện chưa có field upload file trực tiếp trong payload. Vì vậy quy trình vận hành nên yêu cầu nhà thầu dẫn chiếu bằng chứng đã có trong hệ thống hoặc gửi attachment qua module tương ứng.

Tiêu chí khuyến nghị cho evidence:

- Ảnh/video từ camera live hoặc incident evidence, có thời gian/GPS nếu có.
- Log check-in/patrol liên quan.
- Lý do điều động/đổi ca có người xác nhận.
- Không dùng ảnh chỉnh sửa hoặc không có nguồn gốc.

### 5.7 Thời hạn giải trình

**Chưa xác minh từ codebase:** chưa thấy auto-expiry/auto-close dispute theo thời hạn. Doanh nghiệp nên quy định trong hợp đồng: ví dụ gửi giải trình trong 03 ngày làm việc kể từ khi report DRAFT được phát hành; sau cut-off hệ thống/khách hàng có quyền finalize.

### 5.8 Resolve dispute

API: `POST /api/v1/tenant/violation-disputes/:id/resolve`

Payload:

```json
{
  "resolution": "CONFIRMED | WAIVED | PENALIZED",
  "responseNote": "Lý do quyết định tối thiểu 3 ký tự, tối đa 4000 ký tự"
}
```

Quy tắc quyết định:

| Kết luận | Khi dùng | Tác động |
|---|---|---|
| `CONFIRMED` | Vi phạm đúng, chưa cần phạt riêng hoặc theo rule | Violation confirmed, penalty item confirmed nếu có. |
| `WAIVED` | Có ngoại lệ hợp lệ | Violation waived, penalty item waived. |
| `PENALIZED` | Vi phạm đúng và tính phạt | Violation penalized, penalty item confirmed. |

### 5.9 Best practice cho nhà thầu

- Gửi dispute càng sớm càng tốt, trước khi report finalized.
- Mỗi dispute chỉ tập trung một violation.
- Nêu rõ mốc thời gian, guard, site, shift, checkpoint.
- Gắn bằng chứng trực tiếp từ hệ thống, hạn chế file ngoài.
- Không phủ nhận chung chung; phải đưa căn cứ kiểm chứng được.

### 5.10 Nguồn xác minh từ codebase

`src/server/modules/report/report.schema.ts`, `submit-violation-dispute.usecase.ts`, `resolve-violation-dispute.usecase.ts`, `report-authorization.shared.ts`, `src/server/shared/security/vendor-actor-scope.ts`, `src/server/shared/business/violation-lifecycle.ts`, `prisma/schema.prisma`.

### 5.11 Khoảng trống cần xác nhận

- Chưa có attachment field trực tiếp trong dispute schema.
- Chưa xác minh comment thread riêng cho dispute.
- Chưa xác minh notification tự động khi dispute submitted/resolved.
- Chưa có auto-expiry được xác minh.

---

# 6. Cẩm nang Ứng dụng Di động dành cho Bảo vệ
## Guard Mobile PWA Guide

### 6.1 Mục đích

Hướng dẫn guard sử dụng PWA/mobile web để thực hiện ca trực, scan QR tuần tra, gửi sự cố và chụp bằng chứng hợp lệ.

### 6.2 Đối tượng

- Nhân viên bảo vệ role `guard`.
- Chỉ huy đội bảo vệ hỗ trợ thiết bị.

### 6.3 Cài đặt PWA

1. Mở URL workspace của công ty trên Chrome/Edge/Safari mobile.
2. Đăng nhập bằng tài khoản được cấp.
3. Chọn “Add to Home Screen” / “Thêm vào màn hình chính” nếu trình duyệt hỗ trợ.
4. Cho phép quyền camera, vị trí/GPS khi được hỏi.

**Chưa xác minh từ codebase:** manifest file/PWA install prompt chi tiết cần kiểm tra thêm trong `public/manifest` nếu có; code có `public/sw.js`, `src/pwa.d.ts`, `sync-manager.ts`.

### 6.4 Scan QR tuần tra

Khi đến checkpoint:

1. Mở nhiệm vụ/route tuần tra.
2. Chọn scan QR.
3. Đứng trong bán kính checkpoint; hệ thống kiểm tra GPS proximity.
4. Scan đúng mã QR của checkpoint.
5. Chụp/đính kèm ảnh evidence nếu yêu cầu.
6. Gửi log.

Backend kiểm tra:

- Role phải là `guard`, `tenant-admin`, `super-admin`, `supervisor` hoặc role được phép theo use case.
- Có `location`; nếu thiếu trả `SCAN_LOCATION_REQUIRED`.
- Chống scan lặp gần đây: lỗi `REPLAY_SCAN_BUFFER` trong khoảng 30 phút.
- QR hash kiểm tra bằng constant-time compare; sai trả `QR_INTEGRITY_FAILED`.
- Checkpoint phải active.
- Nếu checkpoint thuộc route contract, cần patrol session.
- Nếu guard quá xa checkpoint: `LOCATION_FRAUD_DETECTED`.

### 6.5 Chụp ảnh bằng chứng live

Component `SecureCameraCapture`:

- Gọi `navigator.mediaDevices.getUserMedia` với camera sau (`facingMode: environment`).
- Gọi `navigator.geolocation.getCurrentPosition` với `enableHighAccuracy: true`.
- Vẽ watermark gồm thời gian, GPS và dòng `SCMD PRO - SECURE EVIDENCE`, `LIVE CAPTURE`.
- Upload blob JPEG qua `/api/v1/tenant/attachments` với tag `LiveCapture`, `lat`, `lng` nếu có GPS.

### 6.6 Lỗi thường gặp và cách xử lý

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không mở camera | Chưa cấp quyền, trình duyệt không hỗ trợ, web không chạy HTTPS | Cấp quyền camera, dùng Chrome/Safari mới, mở qua HTTPS. |
| GPS không khả dụng | Tắt vị trí, máy trong tầng hầm, tiết kiệm pin | Bật location, tắt battery saver, ra khu vực thoáng hơn. |
| `LOCATION_FRAUD_DETECTED` | Đứng quá xa checkpoint hoặc GPS lệch | Đến đúng vị trí, chờ GPS ổn định, báo supervisor nếu checkpoint sai tọa độ. |
| `QR_INTEGRITY_FAILED` | QR sai hoặc bị thay thế | Scan lại QR đúng checkpoint; báo chỉ huy nếu QR hỏng. |
| `REPLAY_SCAN_BUFFER` | Scan lặp quá gần thời điểm trước | Chờ đủ thời gian hoặc báo supervisor nếu thao tác nhầm. |
| Upload ảnh thất bại | Mạng yếu, token hết hạn, file lỗi | Kiểm tra mạng, đăng nhập lại, chụp lại ảnh. |

### 6.7 Quy tắc để evidence không bị từ chối

- Chụp trực tiếp tại hiện trường, không dùng ảnh cũ.
- Bật GPS trước khi chụp.
- Không che watermark.
- Ảnh phải rõ mặt bằng/chốt/sự cố.
- Gửi ngay khi mạng ổn định.
- Nếu phải xử lý offline, ghi chú thời gian và báo supervisor; offline auto-sync chưa được xác minh đầy đủ.

### 6.8 Nguồn xác minh từ codebase

`src/core/use-cases/patrol/scan-qr.usecase.ts`, `src/apps/security/interfaces/components/SecureCameraCapture.tsx`, `src/server/shared/middlewares/upload.middleware.ts`, `src/server/core/media/media.service.ts`, `src/lib/sync-manager.ts`, `public/sw.js`.

### 6.9 Khoảng trống cần xác nhận

- Chưa xác minh backend chặn tuyệt đối upload ảnh từ thư viện cho mọi endpoint; hiện có frontend live capture và backend kiểm tra file image/magic bytes.
- Chưa xác minh GPS forensic nâng cao ngoài proximity/session/compliance counters.
- Cần test thiết bị thật cho iOS Safari, Android Chrome, mạng yếu, chế độ tiết kiệm pin.

---

# Nhóm III — Bộ tài liệu Kỹ thuật và Triển khai

---

# 7. Tài liệu Kiến trúc và Hướng dẫn Cài đặt Hạ tầng
## Infrastructure & Deployment Guide

### 7.1 Kiến trúc thực tế

SCMD Pro là ứng dụng TypeScript/Node.js + React, backend Express, database PostgreSQL/PostGIS qua Prisma, Redis/BullMQ cho cache/queue, PDF microservice dùng Puppeteer, storage S3/R2-compatible, observability Prometheus/Grafana/Loki/Jaeger, reverse proxy Nginx.

### 7.2 Thành phần triển khai production trong `docker-compose.yml`

| Service | Vai trò | Port/Expose |
|---|---|---|
| `db` | PostgreSQL PostGIS 15 | Internal 5432. |
| `pgbouncer` | Connection pooling | Internal 6432. |
| `redis` | Redis TLS primary | Internal 6379 TLS. |
| `redis-replica` | Redis replica | Internal. |
| `redis-sentinel-1..3` | Sentinel quorum | Internal 26379 TLS. |
| `migrate` | Prisma migrate deploy + run migration | One-shot. |
| `api` | Node app realtime/API | expose 3000, 2 replicas. |
| `worker-light` | Light queue worker | expose 3000 health. |
| `worker-heavy` | Heavy queue worker | expose 3000 health. |
| `pdf-service` | Puppeteer PDF service | expose 3001, 2 replicas. |
| `nginx` | Public reverse proxy | 80/443. |
| `prometheus` | Metrics | localhost 9090. |
| `grafana` | Dashboard | localhost 3003. |
| `loki` | Logs | localhost 3100. |
| `jaeger` | Tracing | localhost 16686, OTLP internal. |

### 7.3 Environment variables bắt buộc/quan trọng

| Biến | Mục đích |
|---|---|
| `NODE_ENV`, `PORT`, `APP_URL`, `ALLOWED_ORIGINS` | Core app. |
| `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_*`, `DB_POOL_*` | DB/migrate/pool. |
| `REDIS_URL`, `REDIS_PASSWORD`, `REDIS_SENTINEL_*` | Redis/cache/queue. |
| `JWT_SECRET`, `INTERNAL_API_SECRET`, `DEVICE_SECRET` | Auth, PDF internal, device. |
| `GEMINI_API_KEY` | AI optional; nếu thiếu production log cảnh báo fallback. |
| `ZALO_ACCESS_TOKEN`, `ZALO_OA_ID` | Zalo notification optional. |
| `REPORT_ALLOWED_DOMAINS`, `PDF_SERVICE_URL` | PDF service boundary. |
| `R2_*` hoặc system config `STORAGE_CONFIG` | S3/R2 storage. |
| `GRAFANA_PASSWORD` | Grafana admin. |

Production code yêu cầu các secret mạnh; `.env.example` ghi rõ production sẽ crash khi thiếu một số biến bảo mật.

### 7.4 Dependency order

`db -> pgbouncer -> migrate -> redis/sentinel -> pdf-service -> api -> workers -> nginx -> observability`.

Trong compose: `api` phụ thuộc `pgbouncer`, `redis`, `sentinel`, `migrate`, `pdf-service`, `jaeger`. Worker phụ thuộc DB/Redis/migrate/jaeger.

### 7.5 Nginx

`nginx.conf` reverse proxy `/api/`, `/socket.io/`, assets, service worker và SPA catch-all. Có security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Tuy nhiên file comment nói fix proxy service app, nhưng upstream hiện khai báo `server api:3000`; cần cập nhật comment hoặc xác nhận service name.

### 7.6 Database/PostGIS/RLS

- DB image `postgis/postgis:15-3.4-alpine`.
- RLS script enable/force RLS cho nhiều bảng tenant-scoped.
- Generic policy dùng `tenant_id = current_setting('app.current_tenant_id', true)` hoặc `SYSTEM`.
- GIST index cho `checkpoints.location`.
- Incident indexes cho sort/filter.

Cần chạy `prisma migrate deploy`, `run-migration.mjs`, và áp dụng RLS theo quy trình deployment. `apply_rls.ts` có naive split fallback, cần ưu tiên chạy nguyên file SQL bằng psql/tool chuẩn trong production để tránh lỗi DO block.

### 7.7 Redis/BullMQ

Codebase dùng `bullmq`, `@bull-board`, Redis client, scheduler, light/heavy worker. Compose triển khai Redis TLS primary/replica/sentinel, không phải Redis Cluster sharding. Vì vậy tài liệu nên gọi là Redis HA Sentinel, không gọi Redis Cluster nếu chưa triển khai cluster mode.

### 7.8 PDF microservice và SSRF boundary

PDF service chạy port 3001, yêu cầu header `x-pdf-secret = INTERNAL_API_SECRET`. Hàm `isAllowed` chỉ cho phép internal host `api`, `localhost`, `127.0.0.1` trên port 3000. Request tới internal port khác bị block để chống SSRF/probing. `PDFClient` gọi `${PDF_SERVICE_URL}/generate` hoặc `/screenshot` với secret.

### 7.9 Health checks và smoke tests

Sau deploy:

```bash
curl -f http://localhost/api/health
curl -f http://localhost/api/v1/health
curl -f http://localhost/api/health/detailed
curl -f http://localhost/api/health/worker
```

Kiểm tra thêm:

- Đăng nhập tenant admin.
- `GET /api/v1/me` trả đúng tenant/features.
- Tạo checkpoint test và scan QR trong bán kính.
- Generate monthly report DRAFT.
- Export incident/report PDF.
- Kiểm tra Prometheus/Grafana/Loki/Jaeger local-only.

### 7.10 Troubleshooting

| Triệu chứng | Kiểm tra |
|---|---|
| 502 từ Nginx | Service name upstream, health `api`, TLS cert path. |
| Prisma migrate lỗi qua PgBouncer | Dùng `DIRECT_URL` trực tiếp DB cho migrate. |
| Redis WRONGPASS | Đồng bộ `REDIS_PASSWORD` giữa Redis, replica, sentinel, app/worker. |
| PDF export 403 | `INTERNAL_API_SECRET` mismatch hoặc thiếu `x-pdf-secret`. |
| PDF SSRF blocked | URL không thuộc host/port allowlist. |
| RLS không thấy dữ liệu | Kiểm tra `app.current_tenant_id` được set trong DB context. |
| AI fallback | Thiếu `GEMINI_API_KEY` hoặc circuit breaker mở. |

### 7.11 Production hardening khuyến nghị

- Không public DB/Redis/Sentinel/Grafana/Prometheus/Loki/Jaeger ra Internet.
- Dùng TLS thật cho Nginx và Redis.
- Rotate `JWT_SECRET`, `INTERNAL_API_SECRET`, `DEVICE_SECRET` theo chính sách.
- Backup PostgreSQL và object storage định kỳ.
- Kiểm thử restore snapshot.
- Bật audit alert cho access denied, RLS violation, excessive idempotency conflict.
- Chạy `npm run security:scan`, `architecture:scan`, `version:check`, `lint`, `test` trong CI.

### 7.12 Nguồn xác minh từ codebase

`docker-compose.yml`, `Dockerfile*`, `.env.example`, `nginx.conf`, `prisma/schema.prisma`, `prisma/rls_setup.sql`, `src/server/core/queue/*`, `src/server/core/redis.ts`, `src/server/infra/pdf/client.ts`, `scripts/pdf-server.js`, `src/server/bootstrap/health.routes.ts`, `infra/prometheus/prometheus.yml`, `infra/loki/local-config.yaml`, `package.json`.

### 7.13 Khoảng trống cần xác nhận

- Backup/restore policy chưa thấy script production hoàn chỉnh; cần bổ sung SOP.
- Redis Cluster sharding không được xác minh; hiện là Redis Sentinel HA.
- Object retention/cold storage chưa thấy lifecycle automation cụ thể.

---

# 8. Tài liệu Tích hợp API và Webhook
## API Integration Matrix

### 8.1 Mục đích

Cung cấp ma trận endpoint chính cho đội tích hợp nội bộ/đối tác, phân loại maturity level và ranh giới hiện có.

### 8.2 Auth chung

- Auth chính dùng Bearer JWT qua header `Authorization: Bearer <token>`.
- Cookie-based auth bị chặn để giảm CSRF exposure.
- Print token ngắn hạn hỗ trợ PDF/print flow với kiểm tra tenant/incident/watcher path.
- Một số route dùng `requireAuth`, `requirePermission`, `requireFeature`.
- Idempotency hỗ trợ header `x-idempotency-key`; key được scope theo tenant.

### 8.3 Error handling

- Zod validation trả lỗi qua error middleware.
- DomainError có `status`/`message` được controller dùng trực tiếp ở auth.
- Một số use case throw string error như `REPORT_ALREADY_FINALIZED`, `VIOLATION_NOT_FOUND`; client cần map thông điệp.

### 8.4 Pagination/filtering

Các list schema thường dùng `limit` max 100, `cursor`, filter theo `month`, `vendorId`, `contractId`, `siteId`, `status`, `sortOrder`. Cần đọc schema từng module để biết field chính xác.

### 8.5 Endpoint matrix chính

| Nhóm | Method/Path | Maturity | Ghi chú |
|---|---|---|---|
| Auth | `GET /auth/check-workspace/:subdomain` | Có thật | Kiểm tra workspace. |
| Auth | `GET /auth/captcha`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Có thật | Login JWT, captcha Redis. |
| Trial | `POST /auth/trial-register`, `GET /auth/verify-trial` | Có thật | Đăng ký/verify trial. |
| Me | `GET /me` | Có thật | Trả thông tin user/features. |
| Staff | `GET/POST /tenant/staff`, `PUT/DELETE /tenant/staff/:id` | Có thật | Staff CRUD trong tenant. |
| Vendor | `GET/POST/PUT /admin/vendors` và `/sys-manage/vendors` | Có thật | Vendor CRUD. |
| Site/Post | `/admin/sites`, `/admin/guard-posts` | Có thật | Site/post CRUD. |
| Contract | `/admin/contracts`, `/sys-manage/contracts` | Có thật | Contract CRUD; AI scan route có nhưng bị chặn backend. |
| Shift | `/admin/shift-schedules`, `/admin/shift-schedules/generate`, `/admin/shift-assignments` | Có thật | Generate/assign/remove shift. |
| Patrol | `/security/patrol/scan-qr`, `/security/patrol/complete`, `/security/patrol-sessions/*` | Có thật | QR/GPS/session. |
| Incident | `/security/incidents`, `/tenant/incidents/*` | Có thật | Incident lifecycle, evidence, PDF. |
| Command Center | `/tenant/command-center/feed`, `/map-data`, `/priorities` | Có thật | Realtime/ops dashboard. |
| Reports | `/tenant/monthly-acceptance-reports/*` | Có thật | Generate/list/revision/finalize/export/artifact download. |
| Disputes | `/tenant/violation-disputes`, `/tenant/violation-disputes/:id/resolve` | Có thật | Submit/resolve. |
| Notifications | `/tenant/notifications`, read, mark-all | Có thật | In-app notifications. |
| Attachments | `/tenant/attachments` | Có thật | Upload/list/update/delete attachment. |
| AI | `/ai/analyze-incident-image`, `/ai/analyze-patrol`, `/ai/analyze-behavior`, `/ai/anomaly/:alertId/feedback` | Có một phần | Gemini-backed/circuit breaker; cần xác nhận production key/policy. |
| PDF | `/reports/generate-pdf`, `/reports/status/:id`, incident/report export | Có thật | PDF microservice + queue/artifact. |
| Zalo | Service `ZaloNotificationService` | Có abstraction | Chưa thấy public webhook endpoint; outbound notification only. |
| SAP/Oracle | Không thấy endpoint hoàn chỉnh | Chưa có | Chỉ nên ghi là chưa hỗ trợ chính thức. |
| Webhook inbound/outbound | `EventOutbox` model/outbox processor | Có nền tảng một phần | Chưa thấy webhook signature/public delivery matrix hoàn chỉnh. |

### 8.6 Idempotency

Header: `x-idempotency-key`.  
Redis TTL: 24h cho result; lock TTL 30s thường, 120s cho PDF/AI/export/CV. Critical paths `/tenant/staff`, `/tenant/tasks`, `/tenant/incidents` persist DB 7 ngày. Key được scope tenant để tránh cross-tenant collision.

### 8.7 Webhook, retry, signature

**Chưa xác minh endpoint webhook hoàn chỉnh.** Code có `EventOutbox`, outbox processor spec, Zalo outbound service và notification service. Chưa thấy ma trận webhook public gồm payload, retry policy, signature verification và idempotency consumer. Nếu tích hợp bên thứ ba cần coi maturity là **abstraction/partial**, không phải API contract ổn định.

### 8.8 API mẫu: generate report

```http
POST /api/v1/tenant/monthly-acceptance-reports/generate
Authorization: Bearer <jwt>
Content-Type: application/json
x-idempotency-key: <uuid>

{
  "month": "2026-05",
  "vendorId": "vendor-id",
  "contractId": "contract-id",
  "siteId": "site-id"
}
```

### 8.9 API mẫu: submit dispute

```http
POST /api/v1/tenant/violation-disputes
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "violationEventId": "violation-id",
  "reportId": "report-id",
  "reason": "Guard đã có mặt nhưng thiết bị GPS mất tín hiệu trong tầng hầm.",
  "responseNote": "Kèm ảnh live capture và xác nhận supervisor."
}
```

### 8.10 Nguồn xác minh từ codebase

`src/server/routes.ts`, `src/server/modules/*/*.controller.ts`, `src/server/modules/*/*.schema.ts`, `src/server/shared/middlewares/auth.middleware.ts`, `src/server/core/middleware/idempotency.middleware.ts`, `src/server/core/events/outbox-processor.ts`, `src/server/infra/zalo/service.ts`, `src/server/infra/pdf/client.ts`.

### 8.11 Khoảng trống cần xác nhận

- Chưa có OpenAPI/Swagger spec hoàn chỉnh được xác minh.
- Chưa thấy webhook signature verification/public webhook routes.
- SAP/Oracle chưa hỗ trợ endpoint thực tế.
- Cần chuẩn hóa error codes cho client tích hợp.

---

# 9. Kịch bản Kiểm thử Kiểm tra An ninh trước triển khai
## Pre-deployment Validation & Penetration Testing Scripts

### 9.1 Mục đích

Bộ test nghiệm thu kỹ thuật trước bàn giao production, tập trung vào tenant isolation, auth/authz, GPS/QR, idempotency, SSRF, upload, RLS, webhook/outbox, privilege escalation, audit integrity.

### 9.2 Nguyên tắc

- Test trên staging có dữ liệu giả lập ít nhất 2 tenant, 2 vendor, 2 site.
- Mọi test phải lưu evidence: request/response, log, screenshot, DB query nếu được phép.
- Không phá dữ liệu production.

### 9.3 Test matrix

#### T01 — Tenant isolation API

- Mục tiêu: user tenant A không đọc/sửa dữ liệu tenant B.
- Bước: dùng token tenant A gọi `GET /tenant/staff` với ID/filter thuộc tenant B hoặc đoán ID trong route update/delete.
- Kết quả mong đợi: 403/404 hoặc dữ liệu rỗng; audit access denied nếu có.
- Pass: không lộ field tenant B.

#### T02 — RLS bypass

- Mục tiêu: xác minh DB session `app.current_tenant_id` không rò tenant.
- Bước: chạy integration test tương tự `isolation.spec.ts`; query bằng `db.withTenant(tenantA)` vào bảng tenant B.
- Kết quả: không trả dữ liệu tenant B; `SYSTEM` chỉ dùng cho route quản trị.

#### T03 — Vendor actor scope

- Mục tiêu: vendor commander không thao tác ngoài `assignedVendorId`.
- Bước: token vendor A gọi assign shift hoặc submit dispute cho vendor B.
- Kết quả: lỗi `VENDOR_SCOPE_MISMATCH`/403/400.

#### T04 — Privilege escalation

- Mục tiêu: role guard không gọi API admin/report finalize.
- Bước: token guard gọi `POST /tenant/monthly-acceptance-reports/:id/finalize` và `/admin/contracts`.
- Kết quả: 403.

#### T05 — CSRF cookie auth blocked

- Mục tiêu: hệ thống không fallback cookie token.
- Bước: request không Bearer, có cookie `token=...`.
- Kết quả: 403 với thông điệp cookie auth bị chặn.

#### T06 — Idempotency replay

- Mục tiêu: chống spam request tạo incident/staff.
- Bước: gửi 2 request POST `/tenant/incidents` cùng `x-idempotency-key` gần như đồng thời.
- Kết quả: một request xử lý, request cạnh tranh nhận 409 hoặc cached result; DB chỉ có một record.

#### T07 — QR hash integrity

- Mục tiêu: QR giả không được ghi log.
- Bước: scan checkpoint với `qr_hash` sai.
- Kết quả: `QR_INTEGRITY_FAILED`, không tạo `PatrolLog` scanned.

#### T08 — GPS proximity/fraud

- Mục tiêu: guard ở xa checkpoint bị chặn.
- Bước: gọi `/security/patrol/scan-qr` với location lệch xa bán kính.
- Kết quả: `LOCATION_FRAUD_DETECTED`.

#### T09 — Replay scan buffer

- Mục tiêu: chặn scan lặp trong 30 phút.
- Bước: scan cùng checkpoint/guard/session liên tiếp.
- Kết quả: lần 2 lỗi `REPLAY_SCAN_BUFFER` hoặc duplicate checkpoint scan.

#### T10 — File upload magic bytes

- Mục tiêu: không nhận file giả ảnh.
- Bước: upload file `.jpg` nhưng nội dung text/HTML vào `/tenant/attachments` hoặc endpoint image.
- Kết quả: 400 `Loại tệp không hợp lệ...`.

#### T11 — Upload size limit

- Mục tiêu: chặn file quá 10MB.
- Bước: upload ảnh >10MB.
- Kết quả: multer reject, không lưu file.

#### T12 — PDF SSRF boundary

- Mục tiêu: PDF service không fetch internal port cấm.
- Bước: gọi PDF `/generate` với URL `http://localhost:5432` hoặc `http://127.0.0.1:6379`.
- Kết quả: bị block bởi `isAllowed`.

#### T13 — PDF secret

- Mục tiêu: endpoint PDF internal không public.
- Bước: gọi `/generate` thiếu/sai `x-pdf-secret`.
- Kết quả: 403 `FORBIDDEN`.

#### T14 — Incident SLA breach

- Mục tiêu: quá hạn phản hồi/xử lý tạo trạng thái/escalation/violation đúng.
- Bước: tạo incident với dueAt quá khứ, chạy `ProcessIncidentSlaBreachUseCase`.
- Kết quả: `slaBreached=true`, status phù hợp, notification/violation `PENDING_REVIEW`.

#### T15 — Monthly report finalize immutability

- Mục tiêu: report finalized không bị dispute/generate đè bừa.
- Bước: finalize report, sau đó vendor submit dispute với reportId đó.
- Kết quả: `REPORT_ALREADY_FINALIZED`.

#### T16 — Evidence locking

- Mục tiêu: evidence liên quan report bị khóa sau finalize.
- Bước: finalize report có penalty/evidence; kiểm tra `IncidentEvidence.lockedByReportId`, `lockedAt`, `isReportLocked`.
- Kết quả: evidence locked.

#### T17 — AI prompt/data leakage review

- Mục tiêu: xác minh dữ liệu gửi Gemini không chứa PII không cần thiết.
- Bước: review các hàm AI và log request; chạy test với dữ liệu giả PII.
- Kết quả: không gửi PII dư thừa hoặc ghi risk. Hiện code có audit mask nhưng chưa thấy PII scrubber riêng cho Gemini.

#### T18 — Zalo notification resilience

- Mục tiêu: Zalo outbound failure không làm sập workflow chính.
- Bước: cấu hình token sai, tạo alert/notification.
- Kết quả: circuit breaker/log lỗi; request chính vẫn xử lý theo thiết kế.

### 9.4 Nguồn xác minh từ codebase

`src/server/core/db/isolation.spec.ts`, `tenant-isolation-models.spec.ts`, `src/server/shared/middlewares/auth.middleware.spec.ts`, `src/server/core/middleware/idempotency.middleware.ts`, `src/server/core/use-cases/patrol/scan-qr.usecase.spec.ts`, `src/server/shared/middlewares/upload.middleware.ts`, `scripts/pdf-server.js`, `src/server/modules/report/application/*.spec.ts`, `src/server/modules/incident/application/*.spec.ts`.

### 9.5 Khoảng trống cần xác nhận

- Chưa thấy test webhook spoofing vì webhook public chưa hoàn chỉnh.
- GPS forensic nâng cao chưa xác minh ngoài proximity/replay/session; nếu yêu cầu pháp lý cao cần thiết kế thêm.
- Cần bổ sung DAST/API fuzzing tự động nếu triển khai enterprise.

---

# Nhóm IV — Bộ tài liệu Pháp lý và Tuân thủ

---

# 10. Điều khoản Sử dụng Dữ liệu và Chính sách Bảo mật
## Privacy & Data Governance Policy

### 10.1 Mục đích

Quy định cách SCMD Pro thu thập, xử lý, truy cập, lưu trữ và bảo vệ dữ liệu vận hành bảo vệ thuê ngoài, bao gồm GPS, hình ảnh, sự cố, tài khoản và log.

### 10.2 Phạm vi dữ liệu được xác minh

| Nhóm dữ liệu | Ví dụ field/entity |
|---|---|
| Tài khoản/nhân sự | `Staff`: username, email, phone, fullName, role, assignedVendorId/site/contract, qualifications, idNumber, licenseNumber, idExpiry. |
| Vận hành ca/tuần tra | `AttendanceRecord`, `ShiftSchedule`, `ShiftAssignment`, `PatrolLog`, `PatrolSession`, checkpoint location. |
| GPS/vị trí | `Checkpoint.location` PostGIS, guard scan `location`, `Incident.location`, evidence GPS lat/lng. |
| Hình ảnh/bằng chứng | `IncidentEvidence`, `Attachment`, `Image`, storage path tenant-scoped. |
| Sự cố/SLA | `Incident`, `IncidentTimeline`, `IncidentSlaRule`. |
| Audit/log | `AuditLog`, action/resource/payload/diff/ip/userAgent/traceId. |
| Billing/subscription | `TenantSubscription`, `BillingPayment` trong scope system. |

### 10.3 Mục đích xử lý

- Giám sát ca trực, tuần tra, sự cố và tuân thủ hợp đồng.
- Đối soát chất lượng dịch vụ bảo vệ thuê ngoài.
- Lập báo cáo nghiệm thu, scorecard và tính phạt/miễn phạt.
- Cung cấp audit trail khi có tranh chấp.
- Cải thiện vận hành qua cảnh báo, phân tích và AI nếu được bật/cấu hình.

### 10.4 Quyền truy cập

- Tenant chỉ truy cập dữ liệu tenant của mình qua RLS và middleware tenant context.
- Vendor chỉ truy cập phạm vi vendor/site/contract được gán.
- Super Admin/SYSTEM có quyền kỹ thuật/quản trị giới hạn cho vận hành nền tảng.
- Billing tables và system configs chỉ cho `SYSTEM` theo RLS.

### 10.5 Nguyên tắc tối thiểu hóa dữ liệu

- Không yêu cầu dữ liệu ngoài mục đích bảo vệ, tuần tra, incident, hợp đồng, đối soát.
- Audit log phải mask dữ liệu nhạy cảm khi hiển thị toàn cục.
- Upload file cần kiểm tra loại file, kích thước, magic bytes.
- AI chỉ nên nhận dữ liệu cần thiết cho tác vụ; hiện chưa thấy scrubber PII riêng cho Gemini nên cần thiết lập quy trình kiểm duyệt dữ liệu trước khi bật AI production.

### 10.6 AI và dịch vụ ngoài

Codebase có Gemini service cho phân tích ảnh incident, patrol blind spots, strategy insight, behavior anomaly. Có Zalo service outbound notification. Có S3/R2 storage provider. Việc chia sẻ dữ liệu sang dịch vụ ngoài phải được tenant/khách hàng phê duyệt trong hợp đồng hoặc phụ lục xử lý dữ liệu.

**Ràng buộc cần thêm vào chính sách:** trước khi gửi dữ liệu sang AI, loại bỏ hoặc ẩn PII không cần thiết như số giấy tờ, số điện thoại, email, tên đầy đủ nếu không phục vụ phân tích. Codebase có `audit.mask.ts` nhưng chưa xác minh PII redaction layer cho AI prompt.

### 10.7 Lưu giữ dữ liệu

**Chưa xác minh từ codebase:** thời hạn retention cụ thể cho ảnh, video, audit log, report, cold storage chưa thấy cấu hình thống nhất. Vì vậy tài liệu này không khẳng định thời hạn hệ thống đang tự động xóa. Doanh nghiệp cần ban hành retention schedule riêng.

### 10.8 Bảo mật

- JWT Bearer, không dùng cookie auth.
- Redis idempotency và rate limit middleware.
- RLS tenant isolation.
- Nginx security headers.
- Redis TLS trong compose production.
- PDF service yêu cầu internal secret và allowlist host/port.
- Audit log và traceId.

### 10.9 Quyền chủ thể dữ liệu và pháp lý

Tùy khu vực pháp lý, doanh nghiệp cần thông báo cho nhân viên bảo vệ về việc thu thập GPS/hình ảnh/log trong ca làm việc, mục đích xử lý và thời hạn lưu giữ. Doanh nghiệp nên tham vấn luật sư địa phương để hoàn thiện hiệu lực pháp lý, đặc biệt với dữ liệu định danh, GPS, hình ảnh và chia sẻ cho bên thứ ba.

### 10.10 Nguồn xác minh từ codebase

`prisma/schema.prisma`, `src/server/shared/middlewares/auth.middleware.ts`, `src/server/core/audit/audit.mask.ts`, `src/server/core/audit/audit.service.ts`, `src/server/core/ai/gemini.service.ts`, `src/server/infra/zalo/service.ts`, `src/server/core/media/media.service.ts`, `src/server/shared/middlewares/upload.middleware.ts`, `prisma/rls_setup.sql`.

### 10.11 Khoảng trống cần xác nhận

- Retention duration chưa xác minh.
- DPA/consent workflow chưa thấy trong code.
- PII scrubbing trước AI chưa hoàn chỉnh.
- Cần chính sách pháp lý theo quốc gia/khách hàng.

---

# 11. Điều khoản Ràng buộc Công nghệ vào Hợp đồng Kinh tế
## Technical SLA Annex

### 11.1 Mục đích

Phụ lục mẫu để gắn dữ liệu và workflow SCMD Pro vào hợp đồng kinh tế giữa khách hàng và công ty bảo vệ thuê ngoài.

### 11.2 Phạm vi áp dụng

Áp dụng cho dữ liệu ca trực, tuần tra, incident, violation, dispute, report nghiệm thu và bằng chứng được ghi nhận trong SCMD Pro trong kỳ hợp đồng.

### 11.3 Định nghĩa

| Thuật ngữ | Định nghĩa |
|---|---|
| Nguồn dữ liệu hệ thống | Dữ liệu sinh ra từ SCMD Pro: shift, patrol, incident, evidence, violation, report, audit. |
| Bằng chứng hợp lệ | Evidence có nguồn gốc trong hệ thống, gắn thời gian, người thực hiện, vị trí hoặc metadata nếu có. |
| Báo cáo nghiệm thu tháng | `MonthlyAcceptanceReport` đã `FINALIZED`. |
| Vi phạm | `ViolationEvent` do hệ thống hoặc người dùng có thẩm quyền tạo, có trạng thái lifecycle. |
| Giải trình | `ViolationDispute` do nhà thầu gửi trước khi report finalized. |

### 11.4 SCMD Pro là nguồn sự thật duy nhất

Có thể quy định SCMD Pro là nguồn sự thật vận hành cho các dữ liệu đã được hệ thống ghi nhận và khóa trong report `FINALIZED`, đặc biệt khi:

- Contract/version/rule đã được hai bên nghiệm thu cấu hình.
- Guard/site/vendor scope được thiết lập đúng.
- Report lưu snapshot và evidence locking.
- Hai bên có cơ chế dispute trước khi finalize.

Nếu chưa nghiệm thu cấu hình hoặc dữ liệu ngoài hệ thống, không nên tuyên bố tuyệt đối. Nên viết: “SCMD Pro là nguồn dữ liệu ưu tiên/nguồn đối soát chính đối với các sự kiện được ghi nhận trong hệ thống”.

### 11.5 Dữ liệu làm căn cứ nghiệm thu

- Shift schedules và assignments.
- Attendance/check-in/out nếu có.
- Patrol sessions/logs/QR/GPS.
- Incident/timeline/evidence.
- Violation events và dispute resolution.
- ContractVersion, penalty rules, line items snapshot.
- MonthlyAcceptanceReport FINALIZED và penalty items FINALIZED.

### 11.6 Nguyên tắc tranh chấp

1. Nhà thầu phải gửi dispute trước khi report finalized.
2. Dispute phải chỉ rõ violation và lý do.
3. Khách hàng phản hồi bằng `CONFIRMED`, `WAIVED`, `PENALIZED` và ghi response note.
4. Sau finalize, khiếu nại mới xử lý bằng revision/biên bản bổ sung, không sửa snapshot cũ.

### 11.7 SLA phản hồi mẫu

**Khuyến nghị chính sách, chưa xác minh auto-enforcement đầy đủ:**

| Sự kiện | SLA đề xuất |
|---|---|
| Incident high/critical | Phản hồi trong X phút, xử lý trong Y phút theo `IncidentSlaRule`/contract. |
| Thiếu người | Bổ sung guard trong X phút hoặc giải trình trong ngày. |
| Dispute report tháng | Gửi trong 03 ngày làm việc từ khi report DRAFT phát hành. |
| Khách hàng resolve dispute | Trong 02 ngày làm việc sau khi nhận đủ evidence. |

### 11.8 Điều kiện dữ liệu hợp lệ

- Tài khoản thực hiện đúng role và scope.
- Timestamp nằm trong kỳ hợp đồng/report.
- GPS/QR không bị hệ thống đánh dấu fraud hoặc đã được giải trình/waive.
- Evidence không bị sửa ngoài hệ thống; file type hợp lệ.
- Audit log không bị thiếu trong thao tác trọng yếu.

### 11.9 Giới hạn trách nhiệm

- Nhà thầu chịu trách nhiệm thiết bị guard, kết nối mạng, cấp quyền camera/GPS, thao tác đúng quy trình.
- Khách hàng chịu trách nhiệm cấu hình hợp đồng/rule chính xác và resolve dispute công bằng.
- Đơn vị vận hành nền tảng chịu trách nhiệm uptime, bảo mật, backup theo hợp đồng dịch vụ riêng.

### 11.10 Nguồn xác minh từ codebase

`DOCUMENTATION.md`, `prisma/schema.prisma`, `monthly-compliance.shared.ts`, `finalize-monthly-acceptance-report.usecase.ts`, `submit-violation-dispute.usecase.ts`, `resolve-violation-dispute.usecase.ts`, `vendor-actor-scope.ts`, `scan-qr.usecase.ts`, `upload.middleware.ts`, `audit.service.ts`.

### 11.11 Khoảng trống cần xác nhận

- SLA cụ thể theo phút/ngày phải lấy từ hợp đồng thực tế, không suy diễn từ code.
- Retention, indemnity, limitation of liability cần luật sư hoàn thiện.
- Cần checklist nghiệm thu cấu hình trước khi áp dụng “nguồn sự thật”.

---

# 12. Chính sách Lưu trữ và Hủy dữ liệu Bằng chứng
## Data Cold Storage & Retention Policy

### 12.1 Mục đích

Quy định vòng đời dữ liệu bằng chứng: ảnh, video, incident evidence, patrol log, report, audit log, dữ liệu đối soát và cách bảo toàn chuỗi bằng chứng.

### 12.2 Phạm vi dữ liệu

- `IncidentEvidence`: photo/video/note/document, GPS, checksum, capturedAt, fileUrl, status, report lock.
- `Attachment`: file chung, category, tags, uploadedBy, metadata.
- `Image`: image storage lifecycle theo status `PENDING`, `ACTIVE`, `EXPIRED`, `DELETING`, `DELETED`, `CORRUPTED`.
- `PatrolLog`, `PatrolSession`, `IncidentTimeline`, `AuditLog`, `MonthlyAcceptanceReport`, `PenaltyItem`.

### 12.3 Vòng đời đề xuất

`Capture/Upload -> Validate -> Active/Live Storage -> Report Snapshot/Lock -> Retention Period -> Cold Storage/Archive -> Legal Hold nếu có tranh chấp -> Deletion/Anonymization`.

### 12.4 Live storage

Codebase xác minh storage provider S3/R2-compatible; upload image được optimize bằng Sharp JPEG 80%, max width 1200, path tenant-scoped. Attachment upload có file size 10MB và magic bytes validation cho ảnh ở middleware.

### 12.5 Report locking

Khi monthly report finalize, evidence liên quan được update:

- `lockedByReportId = report.id`
- `lockedAt = now`
- `isReportLocked = true`

Penalty items chuyển `FINALIZED`; report chuyển `FINALIZED`; vendor scorecard chuyển `FINALIZED`. Đây là cơ sở bảo toàn dữ liệu nghiệm thu.

### 12.6 Cold storage

**Chưa xác minh từ codebase:** chưa thấy job export Parquet hoặc cold storage lifecycle automation. Nếu cần enterprise compliance, khuyến nghị triển khai:

- Đóng gói monthly evidence bundle theo tenant/vendor/month.
- Manifest gồm hash/checksum từng file, report id, contractVersionId, generatedDataHash.
- Lưu object storage cold tier hoặc kho WORM nếu có yêu cầu pháp lý.
- Không thay đổi file gốc sau khi report finalized.

### 12.7 Truy xuất lại

Truy xuất bằng `reportId`, `attachmentId`, `incidentId`, `violationEventId`, `tenantId`. Route artifact download đã xác minh cho monthly report: `/tenant/monthly-acceptance-reports/:id/artifacts/:attachmentId/download`.

### 12.8 Xóa dữ liệu

**Chưa xác minh từ codebase:** chưa thấy policy xóa vật lý/logic thống nhất cho evidence/report/audit. Khuyến nghị:

- Không xóa evidence đang `isReportLocked=true` nếu chưa hết retention hoặc legal hold.
- Xóa logic trước, xóa vật lý sau thời gian grace.
- Ghi audit cho mọi thao tác xóa/hủy.
- Với dữ liệu cá nhân, cân bằng yêu cầu xóa với nghĩa vụ lưu bằng chứng tranh chấp.

### 12.9 Chuỗi bằng chứng

Để đảm bảo chain of custody:

- Mỗi evidence có actor/uploader, timestamp, GPS nếu có, checksum nếu có.
- Mọi cập nhật trạng thái evidence qua API, không sửa DB trực tiếp.
- Report finalized khóa snapshot và evidence.
- Audit log ghi actor/action/resource/diff/payload/traceId.
- Export artifact phải gắn hash/version/report id.

### 12.10 Nguồn xác minh từ codebase

`prisma/schema.prisma`, `src/server/modules/report/application/monthly-compliance.shared.ts`, `src/server/core/media/media.service.ts`, `src/server/shared/middlewares/upload.middleware.ts`, `src/server/modules/attachment/*`, `src/server/modules/incident/application/add-incident-evidence.usecase.ts`, `update-incident-evidence-status.usecase.ts`, `report-artifact-storage.service.ts`.

### 12.11 Khoảng trống cần xác nhận

- Không thấy Parquet export/cold storage job hoàn chỉnh.
- Không thấy retention duration chính thức trong config.
- Không thấy legal hold workflow riêng.
- Cần xây dựng SOP backup/restore và data destruction certificate.

---

# Phụ lục A — Danh sách endpoint chính từ `routes.ts`

Các endpoint đã được trích xuất từ `src/server/routes.ts`. Khi đưa vào tài liệu tích hợp chính thức, nên sinh OpenAPI tự động từ route + Zod schema để tránh lệch.

- Auth/trial: `/auth/check-workspace/:subdomain`, `/auth/captcha`, `/auth/login`, `/auth/trial-register`, `/auth/verify-trial`, `/auth/refresh`, `/auth/logout`.
- Tenant/me: `/me`, `/tenant/settings`, `/tenant/feedback`, `/tenant/upgrade-request`.
- Staff/task: `/tenant/staff`, `/tenant/staff/:id`, `/tenant/tasks`.
- Patrol/checkpoint: `/tenant/checkpoints`, `/security/patrol/checkpoints`, `/security/patrol/scan-qr`, `/security/patrol/complete`, `/security/patrol-sessions/*`.
- Incident: `/security/incidents`, `/tenant/incidents/*`, `/ai/analyze-incident-image`.
- Command center/monitor: `/tenant/command-center/feed`, `/map-data`, `/priorities`, `/tenant/monitor/*`.
- Report/dispute: `/tenant/vendor-scorecards`, `/tenant/monthly-acceptance-reports/*`, `/tenant/violation-disputes/*`.
- Vendor/contract/shift: `/admin/vendors`, `/admin/sites`, `/admin/guard-posts`, `/admin/contracts`, `/admin/shift-schedules`, `/admin/shift-assignments` và bản `/sys-manage/*`.
- Superadmin: `/sys-manage/tenants`, `/billing`, `/permissions`, `/slo`, `/queues/dlq`, `/news`.
- Health/docs: `/api/health`, `/api/v1/health`, `/api/health/worker`, `/api/health/detailed`, `/docs/:filename`.

---

# Phụ lục B — Risk/Issue phát hiện khi biên soạn tài liệu

| Mức | Issue | Căn cứ | Khuyến nghị |
|---|---|---|---|
| High | AI Contract Scan có route nhưng backend chặn cứng readiness | `auth.middleware.ts`, `DOCUMENTATION.md` | Không quảng bá là tính năng khả dụng; ghi “chưa khả dụng”. |
| High | Webhook/SAP/Oracle chưa thấy triển khai hoàn chỉnh | route/service search | Không đưa vào API contract enterprise cho tới khi có implementation. |
| High | Retention/cold storage chưa có policy automation rõ | schema/service search | Ban hành retention policy và job lifecycle trước hợp đồng lớn. |
| Medium | Redis triển khai Sentinel HA, không phải Redis Cluster sharding | `docker-compose.yml` | Gọi đúng thuật ngữ để tránh hiểu sai năng lực scale. |
| Medium | Nginx comment nói app nhưng upstream là `api` | `nginx.conf` | Cập nhật comment hoặc verify service name. |
| Medium | Dispute schema chưa có attachment trực tiếp | `report.schema.ts` | Bổ sung attachmentIds/evidenceRefs nếu quy trình yêu cầu. |
| Medium | PII scrubber trước AI chưa xác minh | `gemini.service.ts`, `audit.mask.ts` | Thêm redaction layer trước khi bật AI production. |
| Medium | Offline PWA chưa xác minh bằng test thiết bị | `sync-manager.ts`, `sw.js` | Lập test device matrix. |

---

# Phụ lục C — Tài liệu cần tạo tiếp để đạt chuẩn bàn giao Enterprise

1. OpenAPI 3.1 spec sinh từ route + Zod schema.
2. Data Processing Agreement template theo quốc gia triển khai.
3. Backup/Restore Runbook có RTO/RPO.
4. Incident Response Plan cho sự cố bảo mật.
5. Operational UAT Checklist theo từng persona.
6. Device Compatibility Matrix cho Guard PWA.
7. Evidence Retention Schedule chính thức theo hợp đồng.
8. Webhook Integration Specification nếu triển khai outbox delivery.

