# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.9.0-4] - 2026-05-29

### Changed

- Refactor `src/apps/security/interfaces/OverviewTab.tsx` de loai bo cac vung render lap lai trong `/admin/dashboard`: bo KPI card trung voi queue, bo rail tong quan ca hien tai trung lap, rut gon queue summary chi con so viec mo/breach/sap qua han, va chuyen rail phu sang metadata bo tro nhu pham vi nguon tin hieu, muc tieu rui ro, do tin cay du lieu.
- Tang dedupe entity key cho tin hieu `shift-shortage`, `shortage`, `patrol-assignment`, `assignment`, `patrol`, `patrol-session`, `violation` truoc khi render queue de giam trung lap giua `/command-center/priorities` va `/command-center/feed`.
- Cap nhat whitepaper/metadata version len `5.9.0-4` / `V.5.9.0.4` cho guardrail overview dashboard information deduplication.

## [5.9.0-1] - 2026-05-29

### Fixed

- Sua fail build frontend o `src/apps/superadmin/interfaces/components/SuperAdminSidebar.tsx` bang cach chinh lai cac import tuong doi toi `lib/utils`, `context/AuthContext` va `SCMDLogo` theo dung do sau thu muc cua component.
- Dong bo metadata version len `5.9.0-1` / `V.5.9.0.1` va cap nhat whitepaper voi guardrail build-integrity cho admin shell.

## [5.9.0-2] - 2026-05-29

### Fixed

- Chan `AuthProvider` goi `/api/v1/me` khi client chua co `scmd_csrf` cookie, giam 401 noise truoc login va clear auth state som neu khong co session hint.
- Sua khoi `Demo nhanh` tren trang login de khop dataset seed mac dinh (`vinhomes` / `admin_vinhomes` / `Demo@2025!`) va ghi ro `ktcsecurity` / `admin` chi ton tai khi da chay seed `ktc-ocb`.
- Dong bo metadata version len `5.9.0-2` / `V.5.9.0.2` va cap nhat whitepaper voi guardrail session-bootstrap/demo-credential integrity.

## [5.9.0-3] - 2026-05-29

### Fixed

- Sua utility seeder thoat sach process bang cach doi `prisma/seeders/index.ts` sang `db.disconnect()` thay vi chi `$disconnect()` tren mot prisma client.
- Sua `src/server/core/db/prisma.ts` de timer dong bo pool metrics `unref()`, tranh giu process song gia cho seeder va one-off scripts sau khi da xong viec.
- Cap nhat whitepaper/metadata version len `5.9.0-3` / `V.5.9.0.3` cho hotfix seeder process-exit integrity.

## [5.9.0-0] - 2026-05-28

### Added

- Ban hanh `Operational Admin Doctrine` trong whitepaper, chot bo nguyen ly thiet ke admin theo truc `Trang thai he thong -> Viec can xu ly -> KPI van hanh -> Bang/queue -> Drill-down -> Hanh dong` cho SCMD Pro.

### Changed

- Loai bo header/filter/card trang thai mang tinh trang tri khoi first viewport cua `/admin/vendors`; workspace nay bat dau truc tiep bang toolbar cuc bo va bang du lieu nha thau/site/hop dong.
- Nang version runtime len `5.9.0-0` / `V.5.9.0.0` cho initiative Operational Admin Doctrine va Overview Operations Refactor.
- Refactor `overview` tenant-admin theo huong dieu hanh thuc dung: them `Trang thai he thong` o first viewport, dua `Hàng đợi xử lý theo ưu tiên` thanh vung chinh, doi KPI sang ngu nghia thao tac/co drill-down, va rut gon thong tin phu de giam nhieu trinh dien.
- Tiep tuc rollout doctrine sang cac tab `vendors`, `violations`, `tasks`, `audit`, `help`: bo nested page header cu trong shell admin moi, them summary/actionable first viewport va giu module du lieu that phia duoi thay vi thay bang summary gia.

## [5.8.0-0] - 2026-05-28
### Fixed
- Polling 60 giây của tenant-admin không còn cưỡng bức reset shell khi người dùng đang mở `attendance`; auto-refresh nền chỉ giữ ở `overview`.
- Attendance giữ nguyên dữ liệu đang hiển thị nếu refresh nền thất bại và không unmount report shell sau lần tải đầu, để tránh mất ngày xem và view đang mở.
- Nối `contextualFilters` thật vào tab `sites`, thêm loading/error state riêng cho dữ liệu vận hành phụ và loại bỏ pattern silent-catch biến lỗi API thành empty state giả.
### Added
- Thêm endpoint `GET /api/tenant/attendance/ops-summary` để tổng hợp điều hành ca trực theo kỳ lọc, trả về `scheduledShifts`, `coveredShifts`, `understaffedShifts`, `missingCheckIn`, `missingCheckOut`, `lateCheckIn`, `invalidGps`, `validAttendanceRate`, `urgentItems` và `dailyTrend`.
- Mở rộng read model attendance để mỗi record có thêm context `shiftLabel`, `shiftStart/shiftEnd`, `site/siteName`, `guardPost/guardPostName`, `contractId/contractCode/contractName`, `vendorId/vendorName`, `gpsStatus`, `checkInStatus`, `suspicionReason`.
- Thêm `Site Operations Summary`, `urgent queue` và `Site Health` table cho `/admin/sites`, đưa tín hiệu vận hành theo site lên trước phần cấu hình route/checkpoint.

### Changed
- Chuyển tab `Attendance` từ report log nặng về command dashboard vận hành: vùng đầu trang nay ưu tiên KPI xử lý, hàng đợi việc cần xử lý ngay và bảng điều hành theo `site -> chốt -> vendor -> contract -> guard -> vào/ra`.
- Nối bộ lọc attendance xuống API thật thay vì chỉ lọc cục bộ: `shift`, `site`, `vendor`, `contractId`, `guard`, `checkInStatus`, `gpsStatus`, `coverageStatus` nay đều đi qua backend read model.
- Chuẩn hóa semantic filter `checkInStatus=missing` về nghĩa vận hành "thiếu checkout của lượt check-in đang mở", đồng thời tách rõ `gpsStatus` và `coverageStatus` để KPI/urgent list dùng cùng một contract dữ liệu.
- Chuẩn hóa version runtime sang `5.8.0-0` / `V.5.8.0.0` cho initiative Attendance Operations Command Dashboard để đồng bộ với guardrail version-check hiện hành của repo.

### Fixed
- Sửa mismatch giữa attendance dashboard và contract compliance context bằng cách resolve dữ liệu từ `ShiftSchedule`, `ShiftAssignment`, `Contract`, `Site`, `Vendor`, `GuardPost` thay vì chỉ render log chấm công thô.
- Loại bỏ first viewport mang tính reporting trang trí trên attendance week/current-shift, giảm cognitive load và đưa "việc cần xử lý ngay" lên trước bảng dữ liệu.

## [5.7.0-0] - 2026-05-27
### Added
- Ban hành quy chuẩn `Operational Dashboard Shell` cho SCMD Pro, bao gồm `AppShell`, `Sidebar`, `PageHeader`, `FilterBar`, `KPI Summary`, `Operational Card/Table`, `Detail Drawer` và quy tắc hierarchy cho Security Director, HR/Admin Manager, Site Supervisor và Vendor Representative.
- Bổ sung whitepaper quy định `FilterBar` phải bám trục nghiệp vụ `Tenant -> Vendor -> Contract -> Site -> SLA/Status/Time`, ưu tiên thao tác gần thời gian thực như auto-refresh, last updated, quick export và trạng thái scan nhanh.
- Bổ sung bộ quy tắc `Operational Card` cho các trục `Shift Coverage`, `Patrol Compliance`, `Incident SLA`, `Vendor Scorecard`, ưu tiên số liệu, progress, status color và countdown thay vì nhiều text.
### Changed
- Tách filter nghiệp vụ khỏi header tenant-admin. Header chỉ còn page identity, trạng thái đồng bộ dữ liệu và action cấp trang; filter chuyển xuống `ContextFilterBar` theo ngữ cảnh từng tab.
- Cố định cụm `PageHeader + ContextFilterBar` bằng sticky container để filter luôn ở lại cùng header khi người dùng cuộn nội dung dài.
- Bổ sung kiến trúc filter config-driven gồm `TabFilterConfig`, `ContextFilterBar`, `FilterChips`, `AdvancedFilterDrawer`, `useTabFilters`, đồng bộ URL query/localStorage theo key `tenantAdmin.filters.<tab>` và debounce search 350ms.
- Chuẩn hóa điều hướng sidebar tenant-admin theo route path canonical: `/admin/dashboard` cho tổng quan và `/admin/<tab>` cho từng danh mục; `tab` query cũ chỉ còn là compatibility fallback, còn filter hook phải giữ nguyên `pathname` hiện tại khi đồng bộ query để không kéo route về dashboard.
- Sửa fallback feature flag theo plan khi `resolvedFeatures` chưa có dữ liệu, tránh các tab như ca trực, site, sự cố, nhà cung cấp, báo cáo bị render rỗng và tạo cảm giác mọi trang dùng chung một nội dung.
- Bỏ feature gating ở tầng render shell/sidebar tenant-admin để mỗi tab luôn mount đúng component nghiệp vụ; feature/package restriction phải nằm trong module hoặc API thay vì làm trống main content.
- Ép `Suspense` remount theo `activeTab` để tránh reuse trạng thái cũ khi chuyển nhanh giữa các trang quản trị.
- Gỡ bỏ hoàn toàn khu vực trạng thái đồng bộ/telemetry khỏi header tenant-admin để header chỉ còn page identity, tenant context và action cấp trang; refresh được giữ như action gọn có trạng thái loading.
- Cấu hình filter riêng cho các tab `overview`, `attendance`, `sites`, `incidents`, `vendors`, `staff`, `tasks`, `audit`, `attachments`, `violations`, `reports`; overview dùng filter mới để lọc hàng đợi xử lý theo thời gian, site, vendor, ưu tiên, loại vấn đề, SLA risk và người phụ trách.
- Nâng cấp Whitepaper lên `V.5.7.0.0` để chốt hướng kế thừa có chọn lọc kỷ luật giao diện từ 9Router, nhưng giữ định vị SCMD Pro là nền tảng giám sát và đối soát chất lượng dịch vụ bảo vệ thuê ngoài.
- Chuẩn hóa metadata version trong `package.json`, `AGENTS.md`, `docker-compose.yml` và `index.html` theo cấp `5.7.0-0` / `V.5.7.0.0`.
- Refactor tenant-admin operations shell theo hướng tối giản: sidebar bớt card trùng lặp, header/filter gom về một tầng duy nhất, overview bỏ hero/action bar lặp lại và chuyển sang KPI + hàng đợi xử lý + bản đồ/feed có mục đích rõ.
- Chuẩn hóa main content các tab quản trị bằng `ops-main-content`, giảm page header trùng lặp trong tab, đồng bộ radius/shadow/table/focus state và rút gọn `Attendance`/`Incidents` thành toolbar + KPI/workflow có mục đích rõ.
- Chuyển dashboard tổng quan sang mô hình trung tâm điều hành: `Hàng đợi xử lý theo ưu tiên` là vùng chính, KPI chỉ tóm tắt vận hành, next-best-action dùng nhãn cụ thể như `Điều phối nhân sự`, `Gửi nhắc tuần tra`, `Mở hồ sơ sự cố`, `Yêu cầu bổ sung`.
- Nối FilterBar tenant-admin thành state có kiểm soát và truyền xuống overview để bộ lọc site, nhà cung cấp, nhịp thời gian và trạng thái thực sự thay đổi hàng đợi xử lý đang hiển thị; sau đó rút gọn header để không hiển thị badge auto-refresh/trạng thái đồng bộ dạng nhiễu thị giác.
- Gom các hành động xuất báo cáo trên header vào một menu `Báo cáo`, tránh nhiều CTA xuất dữ liệu trùng lặp trên cùng màn hình.
- Chuẩn hóa background tenant-admin dashboard bằng navy/slate base, gradient/vignette nhẹ, grid opacity thấp, surface token thống nhất cho header/filter/sidebar để tăng độ đọc và giảm nhiễu thị giác trên desktop/mobile.

### Fixed
- Hoàn thiện P1/P2 cho command center: chuẩn hóa entity key để không nhân đôi cùng một sự kiện giữa priority/feed, rút gọn nhãn site/tuyến để bảng xử lý dễ đọc hơn, tính `Nhà cung cấp cần chú ý` từ số việc mở và mức cao trong hàng đợi hiện tại, đồng thời bỏ nhãn phụ gây nhiễu trong nút `Đối soát SLA`.
- Nâng cấp hàng đợi xử lý dashboard bằng dữ liệu cấu trúc từ `/api/tenant/command-center/priorities`: trả thêm `siteName`, `vendorName`, `shiftLabel`, `routeName`, `guardName`, `assigneeName`, `slaStatus`, `dueAt`, `nextAction`, `targetRoute` và giữ `timestamp` để UI hiển thị đúng site/ca/SLA/người phụ trách thay vì chuỗi mô tả mơ hồ.
- Hợp nhất priority/feed trên overview theo severity và thời điểm phát sinh, ưu tiên `CRITICAL`/`BREACHED`, thêm summary theo bộ lọc, age label, next-best-action cụ thể và cảnh báo trạng thái phân tích AI bị gián đoạn để tránh hiểu nhầm với chất lượng dữ liệu vận hành.
- Tận dụng `map-data` để suy ra mục tiêu rủi ro từ checkpoint `SOS`/`ALERT` hoặc nhiều checkpoint `INACTIVE`, giúp dashboard hiển thị site cần kiểm tra hiện trường thay vì empty state trang trí.

## [5.6.2-2] - 2026-05-24
### Added
- Thiáº¿t káº¿ cÆ¡ cháº¿ JIT (Just-In-Time) Access cho báº±ng chá»©ng trong COLD storage.
- Quy Ä‘á»‹nh TTL 60 giÃ¢y vÃ  báº¯t buá»™c Audit Log cho truy cáº­p báº±ng chá»©ng lá»‹ch sá»­.
### Changed
- NÃ¢ng cáº¥p chÃ­nh sÃ¡ch báº£o máº­t Evidence Storage trong Whitepaper lÃªn phiÃªn báº£n V.5.6.2.2.

## [5.6.2-1] - 2026-05-24
### Added
- Thiáº¿t káº¿ kiáº¿n trÃºc cho Worker Job `TIER_EVIDENCE_STORAGE` xá»­ lÃ½ phÃ¢n táº§ng dá»¯ liá»‡u.
- Bá»• sung quy Ä‘á»‹nh vá» vÃ²ng Ä‘á»i báº±ng chá»©ng (180 ngÃ y) vÃ o Whitepaper.
### Changed
- Má»Ÿ rá»™ng metadata `IncidentEvidence` Ä‘á»ƒ há»— trá»£ trÆ°á»ng `storageProviderClass`.

## [5.6.2-0] - 2026-05-24
### Added
- Triá»ƒn khai chiáº¿n lÆ°á»£c tá»‘i Æ°u hÃ³a báº±ng chá»©ng (Evidence Optimization) cho cÃ¡c Tenant quy mÃ´ lá»›n.
- Bá»• sung logic nÃ©n áº£nh client-side (JPEG 0.8, Max 1920px) trong `SecureCameraCapture`.
- Cáº­p nháº­t Whitepaper quy Ä‘á»‹nh vá» Edge Transformation vÃ  Storage Tiering.
### Changed
- NÃ¢ng cáº¥p hiá»‡u nÄƒng táº£i Command Feed báº±ng cÃ¡ch sá»­ dá»¥ng thumbnail thay cho áº£nh gá»‘c.

## [Planned] 5.6.1-1

### Changed
- Fixed desktop Docker startup for public contact lead Turnstile config by keeping production fail-fast defaults while mapping desktop/dev compose to explicit local opt-out flags and documenting the required production keys.
- Fixed a cookie-auth navigation loop where `ProtectedRoute` still required a client JWT after login, causing `/login` and dashboard routes to redirect each other until Chrome throttled history navigation.
- Fixed desktop/local cookie-auth reliability by adding explicit non-secure local cookie mode, keeping secure `__Host-*` cookies as the production default, disabling API caching for auth-sensitive responses, and forcing PWA service worker updates to avoid stale login bundles.
- Added an explicit non-production seed repair flag for demo account passwords, then repaired the local desktop DB so `superadmin`, tenant admin, guard, and vendor commander demo logins all authenticate with the configured seed passwords.
- Fixed `SLO_MONITORING` worker isolation by replacing cross-tenant `AuditLog.groupBy` with tenant fan-out using `db.withTenant(tenantId)`, preserving RLS while removing recurring `SECURITY_VIOLATION` logs.
- Fixed report feature guards so PRO tenants with legacy `featuresEnabled` payloads no longer get false `FEATURE_DEPENDENCY_MISSING` responses for vendor scorecards and monthly acceptance reports.
- Removed the external `transparenttextures.com` carbon-fibre background dependency from TacticalMap and replaced it with a local CSS pattern.
- Fixed the mobile guard attendance contract by adding self-scoped `/tenant/attendance/me` support and compatibility check-in/check-out routes while keeping attendance writes on the validated security attendance flow.
- Fixed incident evidence attachment uploads by parsing multipart tags correctly and limiting Base64 attachment fallback to explicit desktop/local mode when no storage provider is configured.
- Updated the installable PWA identity with dedicated SCMD Pro icons, product-level app naming, and clearer service-worker update messaging.
- Reasserted `ViolationEvent.status` default as `PENDING_REVIEW`, added an idempotent legacy backfill migration, and covered lifecycle normalization with regression tests.
- Aligned `AGENTS.md` with the PostgreSQL-only SSOT policy by removing the obsolete Firestore realtime/evidence guidance.
- Hardened production startup and API error handling by validating non-local production secrets against placeholders and sanitizing unhandled 5xx messages outside local environments.
- Scoped public contact Turnstile startup validation to public HTTP/API service profiles so worker-only/realtime-only containers do not fail on public contact env they do not serve.
- Tightened production secret validation so `AUTH_COOKIE_SECURE=false` alone cannot bypass placeholder/length checks on public production domains.
- Corrected production compose service typing to `PUBLIC_API_REALTIME` for the public API/socket gateway and injected `DIRECT_URL` into runtime services so production secret validation matches the deploy contract.
- Added public production fail-fast checks for `AUTH_COOKIE_SECURE`, `APP_URL`, and `ALLOWED_ORIGINS`, and aligned attachment fallback/storage env examples with the same local-only boundary.
- Removed deprecated Prisma `tracing` preview configuration to keep validate/generate output clean on Prisma 6.x.
- Pre-demo frontend/security hotfix: re-enabled CSS code splitting and VitePWA, removed full DaisyUI CSS import, fixed `vendor-commander` login routing to its dedicated workspace, fail-closed incident submit when device secret is missing, and expanded `version:check` for `index.html`/manifest metadata.
- Má»Ÿ rá»™ng Ä‘áº·c táº£ Giai Ä‘oáº¡n 3 cho persona `vendor-commander` trong `DOCUMENTATION.md`, lÃ m rÃµ pháº¡m vi quyá»n háº¡n theo `vendor/site/contract`, dashboard váº­n hÃ nh riÃªng vÃ  cÃ¡c guardrail backend/frontend Ä‘á»ƒ khÃ´ng thá»ƒ lÃ¡ch quyá»n báº±ng API.
- Chuáº©n hÃ³a yÃªu cáº§u nghiá»‡p vá»¥ mÃ n hÃ¬nh `cáº¯t ca theo há»£p Ä‘á»“ng`, bao gá»“m nguá»“n `required headcount`, Ä‘iá»u kiá»‡n guard Ä‘áº¡t chuáº©n, tráº¡ng thÃ¡i ca sau phÃ¢n cÃ´ng, cáº£nh bÃ¡o thiáº¿u ngÆ°á»i vÃ  Ä‘iá»u kiá»‡n sinh `SHIFT_UNDERSTAFFED` violation.
- Bá»• sung acceptance criteria, edge cases, rá»§i ro vÃ  lá»™ trÃ¬nh triá»ƒn khai thá»±c táº¿ Ä‘á»ƒ bÃ n giao trá»±c tiáº¿p cho Product, Design vÃ  Engineering.
- KhÃ³a `MonthlyAcceptanceReport` theo `ContractVersion` hiá»‡u lá»±c táº¡i cutoff ká»³ bÃ¡o cÃ¡o, thay vÃ¬ Ä‘á»c Ä‘á»™ng `Contract.activeVersion` khi regenerate thÃ¡ng quÃ¡ khá»©.
- RÃ ng buá»™c Penalty Engine V2 trong luá»“ng monthly compliance dÃ¹ng `contractVersionId` Ä‘Ã£ resolve theo snapshot Ä‘á»ƒ trÃ¡nh thay Ä‘á»•i há»“i tá»‘ khi acceptance/penalty policy cá»§a há»£p Ä‘á»“ng Ä‘Æ°á»£c cáº­p nháº­t sau ká»³.

### Added
- Bá»• sung regression test cho monthly compliance versioning: thÃ¡ng cÅ© giá»¯ version/policy cÅ©, thÃ¡ng má»›i dÃ¹ng version/policy má»›i, vÃ  legacy contract chÆ°a cÃ³ version váº«n fallback an toÃ n.
- ThÃªm endpoint `GET /api/tenant/monthly-acceptance-reports/:id/version-binding` Ä‘á»ƒ client truy váº¥n `contractVersionId` Ä‘Ã£ bind trÃªn monthly acceptance report mÃ  khÃ´ng resolve láº¡i live contract version.

### Added
- Added guard-scoped profile endpoint/UI for mobile guard app, limited to the current guard assignment, vendor, site, guard post, contract/SLA, today's shift, and recent attendance history.
- Added ContractVersion lifecycle APIs under `/api/v1/admin/contracts/:contractId/versions`, including DRAFT creation, activation with previous active version archival, explicit archive, audit logging, and RBAC denial coverage for vendor-commander.
- Added vendor actor scope regression coverage proving vendor-commander cannot assign a guard to another vendor's shift schedule.

### Fixed
- Removed `@ts-nocheck` from tenant-admin dashboard orchestrator files and fixed the related TypeScript contracts without adding dashboard routes or tabs.

## [5.6.1-0] - 2026-05-23

### Added
- Triá»ƒn khai model `ContractLineItem` Ä‘á»ƒ quáº£n lÃ½ Ä‘Æ¡n giÃ¡ chi tiáº¿t theo Chá»‘t vÃ  Ca.
- Cáº¥u trÃºc dá»¯ liá»‡u LineItem bao gá»“m: `siteId`, `guardPostId`, `shiftName`, `requiredStaffCount`, `unitPrice`.
- Bá»• sung logic tÃ­nh toÃ¡n tá»± Ä‘á»™ng `totalAmount` cho tá»«ng dÃ²ng má»¥c tiÃªu trong phiÃªn báº£n há»£p Ä‘á»“ng.

### Changed
- Cáº­p nháº­t `MonthlyAcceptanceReport` Ä‘á»ƒ tÃ­nh toÃ¡n sá»‘ tiá»n nghiá»‡m thu dá»±a trÃªn tá»•ng cá»§a cÃ¡c LineItem thay vÃ¬ giÃ¡ trá»‹ há»£p Ä‘á»“ng tá»•ng quÃ¡t.
- NÃ¢ng cáº¥p Whitepaper (V.5.6.1.0) Ä‘á»ƒ quy Ä‘á»‹nh quy táº¯c cáº¥u trÃºc LineItem trong Contract Versioning.

## [5.6.0-0] - 2026-05-23

### Added
- Triá»ƒn khai kiáº¿n trÃºc `ContractVersion` lÃ m ná»n táº£ng cho "Há»£p Ä‘á»“ng lÃ  luáº­t váº­n hÃ nh".
- ThÃªm model `ContractVersion` vÃ o schema vá»›i cÃ¡c tráº¡ng thÃ¡i `DRAFT`, `ACTIVE`, `ARCHIVED`.
- TÃ¡ch biá»‡t dá»¯ liá»‡u váº­n hÃ nh (Ä‘Æ¡n giÃ¡, sá»‘ quÃ¢n, ca trá»±c, tiÃªu chuáº©n, má»©c pháº¡t) tá»« báº£ng `Contract` sang `ContractVersion`.
- Bá»• sung quan há»‡ 1-N giá»¯a `ContractVersion` vÃ  cÃ¡c thá»±c thá»ƒ chi tiáº¿t: `ContractLineItem`, `ContractShiftRequirement`, `ContractStaffStandard`, `ContractPenaltyRule`.
- RÃ ng buá»™c `MonthlyAcceptanceReport` pháº£i liÃªn káº¿t trá»±c tiáº¿p vá»›i `ContractVersionId` Ä‘á»ƒ báº£o vá»‡ dá»¯ liá»‡u lá»‹ch sá»­.

### Changed
- Cáº­p nháº­t logic `MonthlyComplianceEngine` Ä‘á»ƒ truy váº¥n bá»™ quy táº¯c tá»« Version tÆ°Æ¡ng á»©ng thay vÃ¬ Ä‘á»c trá»±c tiáº¿p tá»« JSON Policy cá»§a Contract.
- NÃ¢ng cáº¥p UI quáº£n lÃ½ há»£p Ä‘á»“ng Ä‘á»ƒ há»— trá»£ xem lá»‹ch sá»­ cÃ¡c phiÃªn báº£n vÃ  soáº¡n tháº£o phiÃªn báº£n má»›i.
- Cáº­p nháº­t `DOCUMENTATION.md` (Whitepaper) vá»›i quy táº¯c quáº£n trá»‹ Contract Versioning má»›i.

## [5.5.0-13] - 2026-05-22

### Changed
- Added AI Contract Scan governance to `DOCUMENTATION.md`, explicitly positioning OCR + LLM clause extraction after the Contract Rule Engine so AI output can be reviewed and applied into structured contract models instead of remaining an isolated JSON artifact.
- Locked the mandatory admin-reviewed flow to `Upload contract -> OCR/text extraction -> AI extract clauses -> confidence score -> admin review/edit -> approved clauses -> apply to ContractVersion / LineItem / PenaltyRule / StaffStandard`.
- Added safety guardrails preventing AI from auto-activating contracts, auto-creating official penalty rules, or bypassing admin approval, while requiring full audit logging for upload, extraction, edit, approve, reject, and apply actions.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.13`.

## [5.5.0-12] - 2026-05-22

### Added
- Added a shared feature-flag catalog and plan-aware resolution model so tenant capabilities are derived from `default by plan + tenant override` instead of ad hoc booleans spread across UI and API code.
- Added backend feature-guard enforcement with `requireFeature(...)` for contract compliance, vendor operations, shift planning, patrol, incident SLA, evidence storage, scorecard, monthly acceptance, predictive analysis, benchmark, and export routes.
- Added `FeatureFlagManager.tsx` in the Super Admin workspace to manage tenant feature flags through a searchable, plan-filterable matrix view.

### Changed
- Changed `GetMeUseCase` to return `resolvedFeatures` so tenant-admin UI can consume one source of truth for feature locks.
- Changed Super Admin tenant feature updates to normalize and persist the full standardized feature matrix instead of legacy keys such as `patrol`, `attendance`, and `ai_analytics`.
- Changed subscription and upgrade-resolution flows to invalidate tenant feature caches whenever the effective plan changes.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.13`.

## [5.5.0-11] - 2026-05-22

### Added
- Added first-class `ContractPenaltyRule` persistence, RLS coverage, and legacy JSON backfill so penalty rules can be queried and audited structurally instead of being interpreted only from raw `penaltyPolicy` blobs.
- Added Penalty Engine V2 in the monthly compliance application flow to compute `PenaltyItem` records by `violationCode` and structured rule units: `PER_OCCURRENCE`, `PER_HOUR`, `PER_GUARD`, and `PERCENT_CONTRACT`.
- Added richer `PenaltyItem` audit fields: `penaltyRuleId`, `baseAmount`, `unit`, `quantity`, `graceApplied`, `capApplied`, `finalAmount`, `calculationDetail`, and `contractVersionSnapshot`.

### Changed
- Changed contract create/update flows to synchronize `penaltyPolicy.rules` from the current admin UI into `ContractPenaltyRule`, preserving backward-compatible contract authoring while moving the settlement engine onto a normalized data model.
- Changed monthly acceptance penalty generation to honor `graceCount`, `maxMonthlyPenalty`, and repeat-escalation rules per contract penalty rule instead of falling back to severity-default penalty amounts.
- Changed monthly report revisions to clone the full penalty-audit payload so snapshot, dispute, and settlement review remain consistent across report revisions.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.11`.

## [5.5.0-10] - 2026-05-21

### Added
- Added first-class `ShiftAssignment` persistence, migration, and RLS coverage so vendor commander scheduling no longer relies on ad hoc metadata attached to other operational tables.
- Added shift scheduler API flows for listing contract-driven shift schedules, generating schedules from `ContractShiftRequirement`, assigning/removing guards, and periodic shortage checks that raise `ViolationEvent` when shifts pass start time without enough assigned guards.
- Added `ShiftSchedulerView.tsx` with calendar-style scheduling, guard drag-drop, shortage badges, standard-validation warnings, and commander-focused scheduling workspace inside `VendorContractManagement`.

### Changed
- Changed vendor contract workspace navigation so `vendor-commander` and `vendor-representative` land on scheduling/read-only contract views instead of editable vendor/site/contract authoring forms outside their governance scope.
- Enforced shift assignment validation for required headcount, overlapping assignments, guard vendor/site/contract scope, and minimum staff-standard compliance derived from structured contract UI rules.
- Scheduled automated shift staffing checks every 5 minutes to create `PENDING_REVIEW` shortage violations for overdue understaffed shifts.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.10`.

## [5.5.0-9] - 2026-05-21

### Changed
- Upgraded the Contract Compliance workspace UI so contract setup is edited through structured tabs instead of raw policy JSON in `VendorContractManagement.tsx`.
- Added contract editor/detail tabs for overview, pricing and staffing, guard-post shifts, staff standards, penalty rules, checklist requirements, contract files, and version history.
- Standardized contract input into operational tables such as `Chot | Ca | So nguoi | Don gia | Ghi chu`, `Loi | Muc phat | Don vi | Grace | Tran thang`, `Tieu chuan | Bat buoc | Pham vi ap dung`, and `Checklist | Loai du lieu | Anh bat buoc | Tan suat`.
- Serialized the structured UI back into the existing contract JSON policy fields so Sprint 3 improves admin UX without forcing a schema migration before `ContractVersion`, `ContractLineItem`, and `ContractPenaltyRule` are introduced as first-class models.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.9`.

## [5.5.0-8] - 2026-05-21

### Changed
- Added vendor-actor role primitives for `vendor-commander` and `vendor-representative`, including JWT/context propagation for `assignedVendorId`, `assignedSiteId`, and `assignedContractId`.
- Added `Staff.assignedVendorId`, `assignedSiteId`, and `assignedContractId` persistence plus a dedicated Prisma migration to support vendor-scoped guard ownership and scope filtering.
- Hardened staff, vendor, patrol, incident, and reporting read models so vendor actors only see records inside their assigned vendor/site/contract scope.
- Enabled `vendor-commander` to manage only guards in scope while explicitly preventing contract mutation, dispute resolution, and report finalization through RBAC and repository-level scope checks.
- Sanitized the create-staff response so new vendor commander guard provisioning no longer leaks password hashes or token version data back to the client.
- Updated tenant staff UI to support vendor-scoped roles and scope assignment fields for admin-created vendor commanders.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.8`.

## [5.5.0-7] - 2026-05-21

### Changed
- Injected a real `handleUpgrade` implementation from `TenantAdminDashboard` into `useDashboardStore` so `BillingTab` no longer dispatches a no-op when tenants confirm a PRO upgrade request.
- Wired the billing upgrade confirmation flow to `POST /api/tenant/upgrade-request` using the existing controller contract (`{ plan, note? }`), then refetched dashboard tenant data immediately so `hasPendingUpgrade` flips the CTA state to `ÄANG CHá»œ PHÃŠ DUá»†T` without requiring a manual page reload.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.7`.

## [5.5.0-6] - 2026-05-21

### Changed
- Fixed the PRO gating split-brain bug by synchronizing `/api/me` tenant subscription data into `useDashboardStore` and removing the stale default `isPro=false` behavior for tabs that relied on the global store.
- Updated `TenantAdminDashboard` to resolve tenant plan state from the synchronized dashboard store, preventing `Overview`, `Reports`, `Vendor`, `Billing`, and other tenant-admin tabs from disagreeing about whether a PRO tenant is entitled to PRO features.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.6`.

## [5.5.0-5] - 2026-05-21

### Changed
- Added query-string tab routing for `TenantAdminDashboard` so tenant admins can open compliance workspaces directly with URLs such as `/admin/dashboard?tab=reports`.
- Synchronized dashboard tab changes back into the URL, making the monthly acceptance, revision, and export workspace directly reachable for UAT instead of being hidden behind the default overview tab.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.5`.

## [5.5.0-4] - 2026-05-21

### Changed
- Completed Monthly Acceptance Report snapshot persistence by adding DB support for immutable report snapshots: `contractSnapshot`, `vendorSnapshot`, `siteSnapshot`, `slaPolicySnapshot`, `penaltyPolicySnapshot`, `scoreFormulaVersion`, `violationSnapshots`, `evidenceSnapshots`, `penaltyCalculationDetails`, and `generatedDataHash`.
- Added revision persistence and governance fields for monthly acceptance reports (`revisionNumber`, `revisionRootId`, `previousRevisionId`, `supersededByReportId`, `supersededAt`, `supersededBy`) and replaced the old one-report-per-scope unique constraint with a revision-aware scope key.
- Preserved finalized report immutability by keeping revision creation as a new record path and superseding the previous finalized report when a revision is finalized.
- Updated monthly acceptance report listing order and desktop UI so revisioned reports surface in `Rev.N` order and finalized reports expose a `Create Revision` action for direct UAT flow testing.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.4`.

## [5.5.0-3] - 2026-05-21

### Changed
- Standardized `ViolationEvent` lifecycle for compliance scoring and monthly acceptance to a single canonical flow: `PENDING_REVIEW -> CONFIRMED -> DISPUTED -> WAIVED / PENALIZED -> CLOSED`.
- Backfilled legacy violation statuses by remapping `OPEN` and `PENDING` to `PENDING_REVIEW`, and changed the `violation_events.status` default accordingly for all new records.
- Updated monthly compliance aggregation so `PENDING_REVIEW` and `DISPUTED` no longer create score or penalty impact, `WAIVED` is excluded, `CONFIRMED`/`PENALIZED`/`CLOSED` contribute to discipline scoring, and only `PENALIZED` records generate `PenaltyItem` suggestions.
- Tightened Command Center violation feeds to use the standardized review/dispute statuses instead of legacy open-ticket semantics.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.3`.

## [5.5.0-2] - 2026-05-21

### Changed
- Split monthly compliance dispute permissions into dedicated capabilities: `vendor:dispute:submit`, `vendor:dispute:view`, `violation:review`, `violation:resolve`, and `report:finalize`.
- Replaced `vendor:write` on dispute routes with dedicated permissions so vendor-side dispute submission can no longer imply dispute resolution authority.
- Added defense-in-depth authorization guards so dispute resolution and report finalization are limited to client-side decision roles (`TENANT_ADMIN`/`SUPER_ADMIN`) even if permissions are misconfigured.
- Added tenant-scoped dispute listing flow and `requireAnyPermission(...)` middleware so both vendor-side viewers and client-side reviewers can inspect dispute records without widening write permissions.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.2`.

## [5.5.0-1] - 2026-05-21

### Changed
- Replaced monthly acceptance report artifact persistence from `contentBase64` in `Attachment.metadata` to storage-backed binary artifacts with PostgreSQL-only metadata (`storageKey`, `fileName`, `fileSize`, `mimeType`, `checksum`, `generatedAt`, `generatedBy`, `reportId`).
- Added a controlled local filesystem fallback for desktop/development exports while making production fail closed when no storage provider is configured for report artifacts.
- Kept backward-compatible download support for pre-existing Base64-backed report artifacts outside production so previously exported desktop artifacts remain accessible after the storage migration.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.1`.

## [5.5.0-0] - 2026-05-21

### Added
- Added Sprint 5 monthly compliance application flows for `VendorScorecard`, `MonthlyAcceptanceReport`, `PenaltyItem`, and `ViolationDispute`, including tenant-scoped list, generate, finalize, dispute, resolve, and artifact download use cases.
- Added `MONTHLY_COMPLIANCE`, `EXPORT_MONTHLY_ACCEPTANCE_PDF`, and `EXPORT_MONTHLY_ACCEPTANCE_EXCEL` heavy jobs plus monthly scheduler wiring for asynchronous reconciliation and export processing.
- Added report artifact generation through `Attachment` metadata so PDF and Excel-compatible exports can be queued and downloaded without introducing a second storage subsystem.

### Changed
- Switched monthly acceptance governance to derive scorecards and penalty suggestions directly from patrol sessions, incidents, and violation events instead of mock counters.
- Finalizing a monthly acceptance report now locks linked incident evidence through the existing report-lock fields and finalizes penalty items in the same tenant-scoped flow.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.5.0.0`.

## [5.4.0-4] - 2026-05-21

### Added
- Added Incident SLA application use cases for acknowledgment, evidence add/update, resolution submit/approve/reject, close, initial SLA assignment, and tenant breach processing so orchestration no longer sits only inside a monolithic service.
- Added report-lock fields on `IncidentEvidence` (`lockedByReportId`, `lockedAt`, `isReportLocked`) to prepare evidence governance for finalized monthly acceptance reports.

### Changed
- Split `approve resolution` and `close incident` into two distinct governance steps: approval now moves incidents to `RESOLVED`, while close requires an already approved incident and records an independent closure action.
- Enforced severity-based approval roles: `SUPERVISOR` may approve/reject/close only `LOW` and `MEDIUM`, while `HIGH` and `CRITICAL` require `TENANT_ADMIN` or `SUPER_ADMIN`.
- Changed Incident SLA breach violations to upsert with `status = PENDING_REVIEW` instead of generic open-ticket semantics.
- Blocked status changes on report-locked incident evidence so finalized-report evidence cannot be silently altered.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.4.0.4`.

## [5.4.0-3] - 2026-05-21

### Added
- Added tenant-scoped checkpoint site and guard-post anchoring fields so patrol checkpoints can be validated against the operational site topology before routes are activated.
- Added a dedicated Patrol application layer for route creation, assignment creation, session start, and session completion orchestration to move business flow out of the monolithic patrol service.

### Changed
- Enforced session-bound QR scanning for contract-backed patrol routes so scorecard/SLA-eligible patrol evidence cannot be created in legacy ad-hoc mode.
- Changed patrol route creation to batch validate checkpoints and guard posts, inherit the effective site from the linked contract when needed, and snapshot the contract patrol completion target into route compliance config.
- Changed patrol session completion and missed-assignment violation generation to default operational review status to `PENDING_REVIEW` instead of generic open-ticket semantics.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.4.0.3`.

## [5.4.0-2] - 2026-05-21

### Changed
- Replaced the Command Center `feed` and `priorities` sources from `Feedback` to operational data aggregated from `Incident`, `ViolationEvent`, `PatrolSession`, `PatrolAssignment`, `ShiftComplianceItem`, and suspicious `AttendanceRecord`.
- Added business-priority ranking for Command Center items so SLA-breached incidents, guard shortages, missed patrol starts, patrol exceptions, pending closure approval, and pending violation review surface first.
- Upgraded Command Center map points from static checkpoints to operational checkpoint status based on the latest patrol activity and anomaly signals.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.4.0.2`.

## [5.4.0-1] - 2026-05-21

### Changed
- Removed the root `.env` file from the source package so release artifacts keep only `.env.example` and fail security scanning when secrets are bundled by mistake.
- Replaced `ComplianceScore.score` with `ComplianceScore.totalScore` in vendor compliance mobile queries while preserving a backward-compatible `score` response alias.
- Switched Sprint 1 system-scope reads and fan-out jobs from `db.system()` to `db.withTenant('SYSTEM', ...)` in patrol jobs, tenant settings, and media storage config so PostgreSQL RLS receives the correct `SYSTEM` session context.
- Aligned the `incident_sla_rules` migration policy with `rls_setup.sql` by allowing the controlled `SYSTEM` context.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.4.0.1`.

## [5.4.0-0] - 2026-05-21

### Added

- Added V.5.4.0 Incident SLA workflow fields for vendor/contract/site context, response/resolution due times, acknowledgement/submission timestamps, and required evidence types.
- Added `IncidentSlaRule` plus RLS/migration support for tenant-scoped incident SLA rules by contract, site, severity, and incident type.
- Added structured evidence chain metadata for incident evidence, including source, uploader, file URLs, captured time, GPS, checksum, and archive/reject status.
- Added Incident lifecycle operations for acknowledge, submit resolution, approve/close, reject/reopen, evidence status updates, SLA breach timeline entries, notification, and idempotent `ViolationEvent` generation.
- Added Incident detail UI support for SLA countdown, timeline, evidence chain, ACK, approve, and reject/reopen actions.

### Changed

- Updated legacy Incident status handling so `RESOLVED` requests are routed to `RESOLVED_PENDING_APPROVAL` while preserving compatibility with existing data.
- Updated `DOCUMENTATION.md`, `AGENTS.md`, package metadata, and Docker compose version to `V.5.4.0.0`.

## [5.3.0-4] - 2026-05-21

### Added

- Added V.5.3.0 PatrolRoute/PatrolSession compliance fields for route contract/vendor/site context, required completion target, repeat interval, checkpoint GPS/photo/note requirements, session completion percent, late checkpoint count, evidence missing count, and `ViolationEvent`.
- Added `PatrolComplianceCalculator` to calculate completion percent, compliance score, missed checkpoints, late checkpoints, GPS violations, evidence gaps, suspicious fast completion, and SLA violation recommendations on the backend.
- Added patrol violation generation with `tenantId + idempotencyKey` deduplication for completed sessions and missed assignments.
- Added BullMQ missed patrol checks to mark overdue planned assignments as `MISSED` and create `PATROL_NOT_STARTED` violation events without duplicate creation.
- Added Outbox realtime events for patrol route/session/scan/completion/missed changes.
- Added a practical route builder and supervisor patrol status summary to the Site workspace UI.

### Changed

- Patrol route activation now validates site, checkpoint list, duplicate sequence, expected duration, completion target, contract status, and guard post/site consistency.
- Patrol assignment now requires an active route, active staff, active contract where present, and matching shift contract.
- Patrol session scans now validate active session ownership, route membership, duplicate route checkpoint scans, route-specific GPS radius, photo evidence, and required notes before writing `PatrolLog`.
- Patrol session completion now uses the shared backend compliance calculator instead of ad hoc score logic in service code.
- Updated `DOCUMENTATION.md` with V.5.3.0 PatrolRoute/PatrolSession operational compliance and SemVer version `V.5.3.0.4`.

## [5.3.0-3] - 2026-05-21

### Added

- Added tenant-scoped `Site` and `GuardPost` PostgreSQL models, RLS coverage, tenant isolation guard registration, and safe migration/indexes for Contract Compliance master data.
- Extended Vendor and Contract data contracts for V.5.2.0 foundation fields: tax code, service scope, risk level, contract code/name, `siteId`, evidence policy, acceptance policy, penalty policy, and contract file URL.
- Added CRUD APIs for sites and guard posts plus compatible `/api/admin/*` aliases for the tenant security workspace.
- Reworked the Contract Compliance workspace UI around the business flow `Vendor -> Site -> GuardPost -> Contract/SLA`, including forms for vendor, site, guard post, and contract/SLA setup.

### Changed

- Contract activation now requires vendor, site, date range, guard count per shift, at least one SLA rule, and acceptance policy.
- Active contracts on the same `vendorId + siteId` are blocked when their effective date ranges overlap.
- Vendor/Site/GuardPost/Contract create and update flows now write audit log entries through backend use cases.
- Updated `DOCUMENTATION.md` with the V.5.2.0 Contract/Site/GuardPost foundation, migration risk, RLS notes, and SemVer version `V.5.3.0.3`.

## [5.3.0-2] - 2026-05-21

### Changed

- Locked the SCMD Pro product strategy around the Contract Compliance Engine: contract requirements, actual guard operations, deviations, evidence, and vendor acceptance/penalty.
- Added the unified business backbone from Vendor/Contract/Site/GuardPost through shift coverage, patrol, incident evidence, violation events, scorecards, and monthly acceptance reports.
- Added implementation guardrails for non-HRM positioning, role boundaries, PRO/MAX Vendor SLA feature gating, and phase-level backtest requirements.

## [5.3.0-1] - 2026-05-20

### Changed

- Added the product positioning guardrail to the top of `DOCUMENTATION.md`, locking SCMD Pro around outsourced guard supervision, shift/patrol/incident control, SLA/contract quality reconciliation, and evidence data for security directors, HR, and management boards.
- Clarified that SCMD Pro must not drift into a generic HRM/ERP product for guard companies unless the capability directly supports operational control, SLA, contract, or evidence workflows.

## [5.3.0-0] - 2026-05-20

### Added

- Added Phase 2 incident SLA fields for deadline, SLA breach state, resolver, approver, closer, escalation timestamp, and reopen reason.
- Added `IncidentTimeline` and `IncidentEvidence` as tenant-scoped PostgreSQL models for auditable incident processing history and evidence chain.
- Added APIs for adding incident evidence, approving resolution, and manager/supervisor close after approval.
- Added BullMQ incident SLA escalation checks that automatically escalate overdue reported/investigating incidents and emit realtime notifications.

### Changed

- Incident creation now calculates severity-based SLA deadlines automatically and records initial timeline/evidence.
- Incident status changes now write timeline entries, require resolution notes, require approval before close, and require a reason when reopening.

## [5.2.0-0] - 2026-05-20

### Added

- Added Phase 1 operations core models for `PatrolRoute`, ordered route checkpoints, `PatrolAssignment`, `ShiftSession`, and `PatrolSession`.
- Added tenant APIs for creating routes, assigning routes, opening real shift sessions, starting/completing patrol sessions, and listing patrol exceptions.
- Extended patrol logs with optional session linkage, route checkpoint linkage, validation status, sequence tracking, and exception codes.
- Extended attendance records with metadata and optional shift session linkage so abnormal check-in reasons remain auditable.

### Changed

- Route listing now prefers persisted PostgreSQL patrol routes and falls back to the legacy generated default route for compatibility.
- QR scans tied to a patrol session now evaluate off-route scans, wrong sequence, and GPS mismatch for compliance scoring.

## [5.1.1-25] - 2026-05-20

### Fixed

- Rebalanced backend dashboard sidebar logo sizing with a dedicated sidebar logo scale.
- Changed collapsed sidebar branding to crop the shield icon instead of shrinking the full wordmark into a square.
- Stabilized tenant and Super Admin sidebar logo header alignment across expanded and collapsed states.

## [5.1.1-24] - 2026-05-20

### Improved

- Rebalanced the public homepage hero back to the enterprise dark Navy Theme with responsive two-column sizing, `clamp()` typography, concise proof metrics, and a proportionate video panel.
- Replaced the thick green-blue header strip with a subtle centered status hairline so navigation separation feels integrated with the dark interface.
- Reduced first-viewport visual weight so the hero fits more reliably across laptop, desktop, tablet, and mobile screen sizes.

## [5.1.1-23] - 2026-05-20

### Improved

- Reworked the public homepage hero into a lighter conversion-focused layout with concise positioning, trial/demo CTAs, proof metrics, and an autoplay Cloudinary video panel.
- Added a thin green-blue header separator to distinguish the landing navigation from the hero area.
- Allowed Cloudinary video delivery through production CSP `media-src` so the hero video can load on the Docker-served app.

## [5.1.1-22] - 2026-05-20

### Fixed

- Converted landing footer column headings into real public article links for Product, Solutions, Support, and System sections.
- Added bundled public news articles and news-detail fallback content so `/news` and `/news/:slug` remain populated even when the backend API or seed data is unavailable.
- Rechecked all footer destinations to prevent placeholder anchors, empty news pages, or accidental returns to the homepage.

## [5.1.1-21] - 2026-05-20

### Improved

- Added public SEO article pages for footer content links covering product features, pricing, roadmap, smart patrol, AI Watchdog, incident management, vendor evaluation, usage guide, system status, privacy policy, and terms of service.
- Rewired landing footer links so each item in the footer screenshot points to a concrete public article or existing functional route instead of placeholder anchors.

## [5.1.1-20] - 2026-05-20

### Improved

- BiÃªn táº­p láº¡i cÃ¡c bÃ i viáº¿t public Ä‘Æ°á»£c liÃªn káº¿t tá»« trang chá»§ thÃ nh ná»™i dung Markdown Ä‘Ãºng chá»§ Ä‘á» SCMD ERP / SCMD Pro, cÃ³ heading, excerpt, tags, thumbnail vÃ  metadata SEO riÃªng.
- Cáº­p nháº­t seed news Ä‘á»ƒ upsert ghi Ä‘Ã¨ ná»™i dung bÃ i Ä‘Ã£ tá»“n táº¡i, trÃ¡nh tÃ¬nh tráº¡ng cháº¡y seed láº¡i nhÆ°ng bÃ i public váº«n giá»¯ báº£n mÃ´ táº£ ngáº¯n cÅ©.

## [5.1.1-19] - 2026-05-20

### Security

- Enforced a 15-minute maximum JWT access-token TTL and aligned environment templates with the short-lived access-token policy.
- Added explicit authentication before the Super Admin metrics role guard on `/api/v1/monitor/metrics`.
- Changed login and trial registration reCAPTCHA handling from fail-open to fail-closed when Google verification is unavailable.
- Restricted print-token authentication so incident print tokens require the matching `incidentId` and watcher tokens only apply to monitor print data.

### Fixed

- Resolved upgrade requests from trusted notification metadata instead of string-matching the feedback title.
- Added operational timezone helpers for attendance day windows and shift-local time calculations.

## [5.1.1-18] - 2026-05-20

### Fixed

- Marked attendance check-ins without `checkpointId` as suspicious and invalid instead of treating unverifiable GPS data as valid.
- Strengthened PG notifier reconnect jitter with capped exponential full jitter and duplicate reconnect suppression.
- Added an outbox event migration path from version `1.0` to the current processing contract instead of hard-failing legacy events.
- Replaced direct variable-length `timingSafeEqual` string comparisons with fixed-length SHA-256 digest comparison for internal tokens and QR hash checks.
- Extended the architecture scanner to inspect dynamic internal imports for Native ESM `.js` extension compliance.

## [5.1.1-17] - 2026-05-20

### Fixed

- Normalized backend `app.ts` and tenant repository line endings to LF to reduce Linux container build and patch churn risk.
- Set `app.current_tenant_id = 'SYSTEM'` inside the outbox claim transaction so RLS permits pending-event polling.
- Added explicit Redis token-version fast-path checks in auth middleware and refresh-token flow, invalidating stale `auth_metadata` on version mismatch.
- Sorted AI monthly strategy daily trend buckets after mapping dates so model input remains chronological.

## [5.1.1-16] - 2026-05-20

### Fixed

- Fixed suspicious attendance check-in audit metadata so `distanceMeters` is computed from the real checkpoint coordinates instead of the invalid `(0,0)` fallback.
- Staggered `SUBSCRIPTION_AUTO_DOWNGRADE` to 01:30 daily and remove the legacy 01:00 repeatable BullMQ schedule on startup to avoid racing `SHIFT_RECONCILIATION`.

## [5.1.1-15] - 2026-05-20

### Improved

- Standardized real-image SCMD logo sizing across public headers, public footer, help center, contact page header, and dashboard sidebar contexts.
- Collapsed the duplicate public landing header implementation into the canonical landing header to prevent future brand-size drift.
- Tuned logo dimensions by context so public pages keep stronger brand presence while operational dashboards preserve navigation density.

## [5.1.1-14] - 2026-05-20

### Improved

- Removed duplicated landing social-proof logo bands by keeping a single trusted-by section after the hero.
- Improved landing contrast for hero support text, trust labels, customer logos, and navigation states on the navy theme.
- Reworked mobile landing navigation with a persistent login action, clearer menu icon, stronger touch targets, and safe submenu rendering for SaaS access.

## [5.1.1-13] - 2026-05-20

### Improved

- Increased landing-page logo presence in header and footer by tuning real-image sizing and using a larger header logo.
- Reworked landing FAQ into a denser two-column desktop layout and reduced excessive vertical whitespace across hero, features, pricing, trust, CTA, and loading skeleton sections.

## [5.1.1-12] - 2026-05-20

### Fixed

- Fixed widespread UTF-8 text corruption across active public routes, including landing page, landing navigation, help center, public news page, route-level suspense shell, and SEO keyword metadata.
- Standardized public-facing Vietnamese copy on `/`, `/help`, `/news`, and shared public shell components to prevent mojibake regressions in production bundles.

## [5.1.1-11] - 2026-05-20

### Fixed

- Fixed `ContactPage` Vietnamese text corruption caused by invalid UTF-8 source encoding, restoring correct public-facing typography and readable support content on `/contact`.

## [5.1.1-10] - 2026-05-20
### Fixed
- Thu gá»n hero cá»§a cÃ¡c trang public phá»¥ Ä‘á»ƒ loáº¡i bá» khoáº£ng trá»‘ng lá»›n phÃ­a trÃªn ná»™i dung chÃ­nh. HelpPage chuyá»ƒn sang layout hero compact hai cá»™t vá»›i search ná»•i báº­t vÃ  filter sticky; ContactPage nÃ©n banner, kÃ©o form/kÃªnh liÃªn há»‡ vÃ o viewport Ä‘áº§u vÃ  bá»• sung khá»‘i SLA ngáº¯n gá»n thay cho intro kÃ©o dÃ i.

## [5.1.1-9] - 2026-05-20
### Fixed
- Chuáº©n hÃ³a hiá»ƒn thá»‹ branding landing Ä‘á»ƒ Æ°u tiÃªn dÃ¹ng wordmark áº£nh tháº­t `logo_scmd_pro.png` thay vÃ¬ ghÃ©p riÃªng áº£nh vÃ  text. Header/footer landing chuyá»ƒn sang dÃ¹ng chung `SCMDLogo`, cÃ³ fallback tá»‘i thiá»ƒu náº¿u asset lá»—i, vÃ  Ä‘á»“ng bá»™ version hiá»ƒn thá»‹ táº¡i footer.

## [5.1.1-8] - 2026-05-20
### Fixed
- Removed the unused Google Fonts preload from `SEOHead` because the font stylesheet is already loaded through `src/index.css`, eliminating the browser warning about a preloaded stylesheet not being used after page load.

## [5.1.1-7] - 2026-05-20
### Security
- Removed Leaflet CDN usage from `index.html` and bundled Leaflet through Vite so map styling/scripts comply with production CSP without re-allowing `unpkg.com`.

### Fixed
- Updated Tactical Map and Admin Benchmark Recorder to import Leaflet locally instead of relying on the blocked global CDN script.
- Fixed landing stats color resolution so the home page no longer falls into the frontend ErrorBoundary.

## [5.1.1-6] - 2026-05-20
### Infrastructure
- Hardened `Dockerfile.desktop` dependency installation against transient npm registry failures by enabling BuildKit npm cache mounts, reducing npm fetch concurrency, retrying full install commands, disabling audit/fund network calls during container install, and pinning npm 11 instead of using `npm@latest`.
- Switched Docker healthchecks from `localhost` to `127.0.0.1` to avoid false unhealthy status when loopback resolution prefers an address the Node process is not listening on.
- Fixed landing page image references so logo and dashboard hero use assets present in `public/` instead of missing `.webp` files that fell through to the SPA HTML fallback.

## [5.1.1-5] - 2026-05-19
### Refactored
- Moved staff CV PDF export orchestration out of `StaffController.exportPdf()` into `ExportStaffCvPdfUseCase`.
- Controller now only resolves request data, sends response headers, and returns the generated PDF buffer.

## [5.1.1-4] - 2026-05-19
### Refactored
- Split `src/server/app.ts` bootstrap responsibilities into focused modules under `src/server/bootstrap/`: security headers, CORS, health routes, tenant context, API mounting, docs routes, and static frontend serving.
- Reduced `app.ts` from a large bootstrap file to a small composition root while preserving route ordering and existing behavior.

## [5.1.1-3] - 2026-05-19
### Security
- Hardened `db.systemBypass()` so each call must include `reason` and `caller`, with structured security logging.
- Updated existing cross-tenant reputation and internal PDF export calls to use explicit reason codes and read-only bypass where applicable.

### Governance
- Added `npm run architecture:scan`, CI Architecture Governance Gate, and pre-commit enforcement for system bypass allowlisting and explicit protected-route RBAC checks.

## [5.1.1-2] - 2026-05-19
### Security
- Tightened production CSP by removing `unpkg.com` from production `scriptSrc`, `connectSrc`, image, and style allowances.
- Changed compose secret interpolation for database, Redis, and Grafana passwords from default values to required variables.

### Governance
- Added `npm run version:check` and CI Version Consistency Gate to enforce version alignment across source-of-truth files and package metadata.

## [5.1.1-1] - 2026-05-19
### Security
- Removed the real `.env` from the distributable package; `.env.example` remains the only committed environment template.
- Removed shared seed password fallbacks from seed paths. Seed execution now requires `SEED_SUPERADMIN_PASSWORD`, `SEED_TENANT_ADMIN_PASSWORD`, and `SEED_GUARD_PASSWORD`.
- Added `npm run security:scan`, a repository pre-commit hook, and a CI Secret Hygiene Gate to block `.env`, private keys, and known hardcoded seed secrets.

### Governance
- Synchronized package metadata with the whitepaper version `V.5.1.1.1` while keeping npm-compatible semver as `5.1.1-1`.

## [5.1.1] - 2026-05-19
### Security
- **Secret Hygiene & Seed Hardening**: Production seed now fails closed when seed passwords are missing. `.env.example` no longer documents blank production seed passwords as acceptable.
- **Tenant Trust Boundary**: `x-tenant-id` is treated as a request hint (`requestedTenantId`) instead of being promoted to `subdomain`; JWT tenant remains the authorization authority.
- **RBAC Explicit Guards**: Added explicit permission guards for tenant notifications, tenant settings, AI feedback/image analysis, and report job status routes.

### Infrastructure
- **Production Dockerfile Restored**: Added root `Dockerfile` multi-stage production build with Node 22 Alpine, `dumb-init`, non-root runtime, Prisma generation, and separated PDF runtime concerns.
- **Migration Artifact Integrity**: Updated `.dockerignore` to keep Prisma migration SQL files in the Docker build context.

### Fixed
- **Health Detailed Authorization**: Replaced hardcoded `SUPER_ADMIN` role comparison with `UserRole.SUPER_ADMIN`.
- **Billing Route Cleanup**: Removed duplicate unreachable return in billing activation route.


## [5.0.1.7] - 2026-05-12
### Fixed
- **UseCase Boundary Validation**: Kháº¯c phá»¥c lá»—i Zod reject `tenantId` cá»§a SuperAdmin báº±ng cÃ¡ch sá»­ dá»¥ng logic `.omit()` táº¡i `CreateStaffUseCase`.
- **Update Logic Resilience**: Sá»­a lá»—i 500 (`BUG-STATUS`) vÃ  thiáº¿u há»¥t dá»¯ liá»‡u (`BUG-2`, `BUG-3`) táº¡i `UpdateStaffUseCase`.
- **Frontend Payload Integrity**: Flatten cáº¥u trÃºc `credentials` vÃ  sá»­a lá»—i mapping role táº¡i `useTenantStaff.ts`.
### Security
- **Cache Invalidation (SEC-FIX M-01)**: CÆ°á»¡ng Ã©p xÃ³a `auth_metadata` cache sau khi cáº­p nháº­t nhÃ¢n sá»± Ä‘á»ƒ ngÄƒn cháº·n Stale Permissions.

## [5.0.1.6] - 2026-05-12
### Optimized
- **Smart Deploy Script**: NÃ¢ng cáº¥p `Deploy-Desktop.bat` lÃªn chuáº©n Enterprise. Äá»“ng bá»™ hÃ³a versioning, bá»• sung `--sourcemap` cho báº£n build server trong container Ä‘á»ƒ há»— trá»£ debugging vÃ  thÃªm tham sá»‘ `--pull` khi build full image Ä‘á»ƒ Ä‘áº£m báº£o base image luÃ´n má»›i nháº¥t.
- **Build Resilience**: Tá»‘i Æ°u hÃ³a thÃ´ng Ä‘iá»‡p lá»—i vÃ  quy trÃ¬nh kiá»ƒm tra sá»©c khá»e há»‡ thá»‘ng sau triá»ƒn khai.

## [5.0.1.5] - 2026-05-12
### Infrastructure & Deployment (Desktop)
- **Container Healthchecks**: Bá»• sung cÆ¡ cháº¿ healthcheck trá»±c tiáº¿p báº±ng `wget` cho service `app` vÃ  dÃ¹ng `redis-cli ping` cho `redis` trong Docker Compose, giÃºp tiáº¿n trÃ¬nh xá»­ lÃ½ restart vÃ  phá»¥c há»“i chÃ­nh xÃ¡c hÆ¡n khi cÃ³ sá»± cá»‘.
- **Bootstrapping Optimization**: TÃ¡ch biá»‡t luá»“ng cháº¡y database migration vÃ  start á»©ng dá»¥ng vÃ o má»™t script entrypoint Ä‘á»™c láº­p thay vÃ¬ xá»­ lÃ½ trá»±c tiáº¿p trÃªn shell CMD, cáº£i thiá»‡n ghi log vÃ  trÃ¡nh fail healthcheck trong quÃ¡ trÃ¬nh Prisma triá»ƒn khai.
- **Self-Healing Automation**: Thay tháº¿ vÃ²ng láº·p exec container trong `reset-desktop.sh` báº±ng viá»‡c thÄƒm dÃ² sá»©c khá»e API tá»« phÃ­a host nháº±m tÆ°Æ¡ng thÃ­ch tá»‘t hÆ¡n vá»›i mÃ´i trÆ°á»ng khÃ´ng cÃ³ sáºµn cURL. Cáº­p nháº­t `run-migration.mjs` Ä‘á»ƒ tá»± Ä‘á»™ng ná»™i suy file migration mÃ  khÃ´ng cáº§n fix cá»©ng danh sÃ¡ch.

## [5.0.1.4] - 2026-05-12
### Fixed
- **SuperAdmin Mock Fix**: Sá»­a lá»—i 500 khi Ä‘Äƒng nháº­p Superadmin báº±ng cÃ¡ch bá»• sung xá»­ lÃ½ Raw SQL trong `prisma.mock.ts` vÃ  Ä‘á»“ng bá»™ máº­t kháº©u tÃ i khoáº£n há»‡ thá»‘ng (admin/superadmin) vá» máº·c Ä‘á»‹nh lÃ  `admin`.
- **UI Texture CSP**: Kháº¯c phá»¥c lá»—i CSP cháº·n texture phÃ´ng ná»n tá»« `grainy-gradients.vercel.app`.
- **Mock Data Re-seeding**: Äáº£m báº£o dá»¯ liá»‡u giáº£ láº­p cho Staff Ä‘Æ°á»£c khá»Ÿi táº¡o chÃ­nh xÃ¡c vá»›i Ä‘áº§y Ä‘á»§ cÃ¡c role há»‡ thá»‘ng.

## [5.0.1.3] - 2026-05-12
### Security & Resilience
- **reCAPTCHA Fail-Open**: Äá»“ng bá»™ hÃ³a cÆ¡ cháº¿ Fail-Open cho reCAPTCHA táº¡i `LoginUseCase`, Ä‘áº£m báº£o tÃ­nh sáºµn sÃ ng cá»§a dá»‹ch vá»¥ (High Availability) ngay cáº£ khi Google API gáº·p sá»± cá»‘.
- **Tenant Bypass Hardening**: Gia cá»‘ `auth.middleware.ts` cho phÃ©p `UserRole.SUPER_ADMIN` bypass kiá»ƒm tra tenant má»™t cÃ¡ch tÆ°á»ng minh, loáº¡i bá» lá»—i tiá»m áº©n do phá»¥ thuá»™c vÃ o hardcoded string literals.
- **Timing Protection Enhancement**: Cáº­p nháº­t `DUMMY_HASH` táº¡i `StaffRepository` thÃ nh hash bcrypt chuáº©n Ä‘á»ƒ tá»‘i Æ°u hÃ³a viá»‡c chá»‘ng táº¥n cÃ´ng Timing Attack khi xÃ¡c thá»±c cÃ¡c tÃ i khoáº£n khÃ´ng tá»“n táº¡i.

## [5.0.1.2] - 2026-05-12
### Fixed
- **Authentication Flow Restoration**: Chuyá»ƒn Ä‘á»•i `NODE_ENV` sang `development` trong mÃ´i trÆ°á»ng Preview, kÃ­ch hoáº¡t thÃ nh cÃ´ng cÆ¡ cháº¿ Failover sang Mock Database khi háº¡ táº§ng PostgreSQL khÃ´ng kháº£ dá»¥ng.
- **Workspace Hint Alignment**: Cáº­p nháº­t chá»‰ dáº«n táº¡i `WorkspaceFinder.tsx` khá»›p vá»›i dá»¯ liá»‡u Seed thá»±c táº¿ (`system`, `vinhomes`), loáº¡i bá» lá»—i 404 khi ngÆ°á»i dÃ¹ng nháº­p "demo".
- **CSP Integrity**: Bá»• sung `unpkg.com` vÃ o `connectSrc` Ä‘á»ƒ cho phÃ©p táº£i Sourcemaps cá»§a Leaflet.js, lÃ m sáº¡ch cÃ¡c cáº£nh bÃ¡o vi pháº¡m Security Policy táº¡i trÃ¬nh duyá»‡t.

## [5.0.1.1] - 2026-05-12
### Security & Hardening
- **Zero-Trust UseCase Enforcement**: Ãp dá»¥ng cÆ°á»¡ng Ã©p Zod Validation táº¡i ranh giá»›i UseCase cho `LoginUseCase` vÃ  `AttendanceCheckInUseCase`.
- **GPS Anti-Fraud (Hardened)**: TÃ­ch há»£p cÆ¡ cháº¿ xÃ¡c thá»±c sai sá»‘ Ä‘á»‹a lÃ½ (Haversine distance) trong luá»“ng Ä‘iá»ƒm danh. Tá»± Ä‘á»™ng Ä‘Ã¡nh dáº¥u `isValid: false` vÃ  gÃ¡n nhÃ£n `SUSPICIOUS` náº¿u sai sá»‘ > 50m so vá»›i Checkpoint chá»§.
- **Domain Error Standardization**: Chuyá»ƒn Ä‘á»•i toÃ n bá»™ logic bÃ¡o lá»—i sang há»‡ thá»‘ng Class-based Domain Errors (`UnauthorizedError`, `BadRequestError`, v.v.) giÃºp chuáº©n hÃ³a HTTP Mapping táº¡i Controller.
- **Tenant Isolation Persistence**: Äáº£m báº£o toÃ n bá»™ cÃ¡c query trong luá»“ng xÃ¡c thá»±c vÃ  Ä‘iá»ƒm danh tuÃ¢n thá»§ tuyá»‡t Ä‘á»‘i `db.forTenant`, loáº¡i bá» cÃ¡c nguy cÆ¡ rÃ² rá»‰ dá»¯ liá»‡u chÃ©o.

## [5.0.0] - 2026-05-12
### Added
- **Semantic Versioning (SemVer 2.0.0)**: ChÃ­nh thá»©c Ã¡p dá»¥ng quy chuáº©n Ä‘áº·t tÃªn phiÃªn báº£n MAJOR.MINOR.PATCH cho toÃ n bá»™ há»‡ thá»‘ng.
- **Project Baseline**: XÃ¡c láº­p phiÃªn báº£n 5.0.0 lÃ  cá»™t má»‘c chuáº©n cho kiáº¿n trÃºc Remix V.5.

### Fixed
- **Vite WebSocket Unhandled Rejections**: VÃ´ hiá»‡u hÃ³a Vite HMR trong middleware (`hmr: false` vÃ  `DISABLE_HMR=true`) Ä‘á»“ng thá»i bá»• sung event listener toÃ n cá»¥c táº¡i frontend nháº±m lá»c vÃ  swallow cÃ¡c lá»—i liÃªn quan Ä‘áº¿n káº¿t ná»‘i WebSocket do mÃ´i trÆ°á»ng proxy/sandbox gÃ¢y ra.
- **Prisma Client Extensions**: Äiá»u chá»‰nh kiá»ƒu dá»¯ liá»‡u cá»§a `createExtendedPrisma` vÃ  cast `$queryRaw` / `$executeRaw` trong ORM. **(Architectural Note)**: Viá»‡c cast `baseIsolation` thÃ nh `typeof internalPrisma` lÃ  intentional trade-off Ä‘á»ƒ báº£o vá»‡ Type-Safety cá»§a Public API thay vÃ¬ báº£o vá»‡ hook internals.
- **Content Security Policy (CSP)**: Fix sá»± cá»‘ cháº·n resource cá»§a Leaflet báº±ng cÃ¡ch ná»›i lá»ng CSP (unpkg.com). LÆ°u Ã½ (Security Exception): trong phiÃªn báº£n nÃ y `unpkg.com` chá»‰ Ä‘Æ°á»£c thÃªm vÃ o scriptSrc/styleSrc vÃ  **bá»‹ loáº¡i bá» khá»i connectSrc** Ä‘á»ƒ Ä‘áº£m báº£o Zero-Trust trong Production.
- **TypeScript Strict Violations**: Xá»­ lÃ½ triá»‡t Ä‘á»ƒ cÃ¡c lá»—i TypeError cáº£nh bÃ¡o undefined vÃ  property access sai cáº¥u trÃºc táº¡i luá»“ng use case (Global Audit Logs), Controllers (Billing) vÃ  Services (Superadmin).

## [4.50.0] - 2026-05-11
### Security & Architecture
- **SSRF Hardening**: Ãp dá»¥ng Strict Port Allowlist cho PDF Service, cháº·n truy cáº­p ngÆ°á»£c tá»›i cÃ¡c dá»‹ch vá»¥ háº¡ táº§ng khÃ¡c (NgÄƒn cháº·n SSRF).
- **Auth TTL Hardening**: NÃ¢ng cáº¥p vÃ  tháº¯t cháº·t cÆ¡ cháº¿ quáº£n lÃ½ vÃ²ng Ä‘á»i bá»™ Ä‘á»‡m xÃ¡c thá»±c (Auth TTL), vÃ¡ dá»©t Ä‘iá»ƒm window revoke token lá»—i.
- **Data SSOT (No Firebase)**: Äá»“ng bá»™ láº¡i kiáº¿n trÃºc lÃµi, cáº¥m hoÃ n toÃ n Firebase/Firestore, xÃ¡c láº­p PostgreSQL lÃ  Single Source of Truth (SSOT) cho toÃ n bá»™ há»‡ thá»‘ng (ká»ƒ cáº£ Realtime).

### Ops & Infrastructure
- **High Availability (Redis HA & PgBouncer)**: TÃ­ch há»£p cáº¥u trÃºc kiáº¿n trÃºc há»— trá»£ Redis Sentinel Mode vÃ  PgBouncer/Supavisor connection pooling, nÃ¢ng cao kháº£ nÄƒng chá»‹u táº£i.
- **Worker Autorun Engine**: HoÃ n thiá»‡n cáº¥u hÃ¬nh tá»± khá»Ÿi cháº¡y Worker (Autorun) ngÄƒn rá»§i ro treo tiáº¿n trÃ¬nh ná»n trong container.

### Chore & Synchronized
- **Documentation Sync**: Äá»“ng bá»™ Ä‘á»‹nh danh kiáº¿n trÃºc V.4.50.0. XÃ³a bá» cÃ¡c bÃ¡o cÃ¡o phÃ¢n tÃ­ch tÄ©nh dá»n dáº¹p há»‡ thá»‘ng.

- **Dockerfile (API Server)**: Táº¡o má»›i `Dockerfile` production chuáº©n táº¡i root dá»± Ã¡n. Multi-stage build (`builder` â†’ `runner`), base image `node:22-alpine`, runtime `USER node` (non-root, Zero Trust). `--ignore-scripts` ngÄƒn Puppeteer download trong build API. `dumb-init` xá»­ lÃ½ SIGTERM Ä‘Ãºng cÃ¡ch, trÃ¡nh zombie process. TÃ¡ch biá»‡t hoÃ n toÃ n vá»›i `Dockerfile.pdf` (Puppeteer/Chromium).
- **docker-compose.yml (CI/CD Fix)**: Sá»­a 4 service production (`migrate`, `api`, `worker-light`, `worker-heavy`) tá»« `dockerfile: Dockerfile.desktop` sang `dockerfile: Dockerfile`. `pdf-service` giá»¯ nguyÃªn `Dockerfile.pdf`. Há»‡ thá»‘ng CI/CD vÃ  Docker Swarm nay build Ä‘Ãºng production image (`node:22-alpine`, non-root) thay vÃ¬ desktop image.

## [4.33.31] - 2026-05-08
### Fixed & Refactored
- **Hybrid Idempotency Engine (Task #7)**: NÃ¢ng cáº¥p `IdempotencyService` há»— trá»£ khÃ³a phÃ¢n tÃ¡n (Distributed Lock) vá»›i TTL linh hoáº¡t (120s cho PDF/AI).
- **Hard Persistence**: TÃ¡i kÃ­ch hoáº¡t DB-backed idempotency records cho cÃ¡c mutation quan trá»ng (Staff, Task, Incident) Ä‘á»ƒ chá»‘ng láº¡i viá»‡c Redis eviction.
- **API Integrity**: Bá»• sung idempotency check cho cÃ¡c route `DELETE` nhÃ¢n sá»± vÃ  tÃ¡c vá»¥.

## [4.33.30] - 2026-05-08

### Added
- **CI/CD Pipeline Integrity**: Implemented full GitHub Actions workflow (`ci.yml`) including Linting, Testing (Vitest), Migration Safety checks (`migrate diff`), and Build Verification.
- **Migration Drift Protection**: Added automated validation to ensure Prisma Schema consistency across all environments.

### Fixed
- **Fetch TypeError Resolution Verification**: Confirmed complete removal of aggressive `window.fetch` property manipulation that caused `TypeError` in sandbox environments.

### Security
- **CI-Locked Migrations**: Enforced database schema integrity via automated pipeline checks.

## [4.33.28] - 2026-05-08
### Added
- **Automated Quality Gate (GitHub Actions)**: Thiáº¿t láº­p pipeline CI (`ci.yml`) thá»±c thi cÃ¡c bÆ°á»›c kiá»ƒm tra nghiÃªm ngáº·t: Lint, Type Check, Vitest, vÃ  Build Check.
- **Migration Safety Guard**: TÃ­ch há»£p `prisma migrate diff` vÃ o CI Ä‘á»ƒ ngÄƒn cháº·n cÃ¡c thay Ä‘á»•i schema gÃ¢y máº¥t dá»¯ liá»‡u hoáº·c khÃ´ng Ä‘á»“ng bá»™ vá»›i migration history.

## [4.33.27] - 2026-05-08
### Changed
- **Real-time Analytics & Revenue Integrity (Architectural Rule - Data SSOT)**: Pháº£n há»“i yÃªu cáº§u tá»« CTO. Thá»±c hiá»‡n refactor triá»‡t Ä‘á»ƒ logic Analytics trong `SuperAdminService`. 
  - **Revenue**: Loáº¡i bá» hoÃ n toÃ n cÃ¡c giÃ¡ trá»‹ mock/fallback. Tá»· lá»‡ tÄƒng trÆ°á»Ÿng (`growth`) hiá»‡n Ä‘Æ°á»£c tÃ­nh toÃ¡n Ä‘á»™ng báº±ng cÃ¡ch so sÃ¡nh doanh thu hiá»‡n táº¡i vá»›i dá»¯ liá»‡u thanh toÃ¡n thÃ¡ng trÆ°á»›c (`billingPayment`).
  - **Growth Chart**: Chuyá»ƒn Ä‘á»•i tá»« dá»¯ liá»‡u lÅ©y káº¿ (Cumulative) sang **Sá»‘ lÆ°á»£ng Tenant Ä‘Äƒng kÃ½ má»›i hÃ ng thÃ¡ng** (Monthly New) trong vÃ²ng 6 thÃ¡ng gáº§n nháº¥t, Ä‘áº£m báº£o tÃ­nh pháº£n Ã¡nh nhá»‹p Ä‘á»™ kinh doanh trung thá»±c.
  - **Versioning**: NÃ¢ng cáº¥p version há»‡ thá»‘ng lÃªn V.4.33.27 Ä‘á»“ng bá»™ trÃªn toÃ n bá»™ metadata vÃ  UI.

## [4.33.26] - 2026-05-08
### Removed
- **Dependency Cleanup**: Thá»±c thi gá»¡ bá» cÃ¡c thÆ° viá»‡n khÃ´ng sá»­ dá»¥ng (`@opentelemetry/auto-instrumentations-node`, `react-helmet-async`, `idb-keyval`, `cloudinary`) theo Cleanup Candidate Report sau khi Ä‘Ã£ Ä‘Æ°á»£c CTO xÃ¡c nháº­n an toÃ n, nháº±m giáº£m dung lÆ°á»£ng Ä‘Ã³ng gÃ³i vÃ  nguy cÆ¡ báº£o máº­t. ThÆ° má»¥c `_archive_cleanup_candidate/` cÅ©ng Ä‘Ã£ Ä‘Æ°á»£c xÃ³a vÄ©nh viá»…n khá»i há»‡ thá»‘ng.

## [4.33.24] - 2026-05-08
### Fixed
- **Security (CacheManager L1 Invalidation)**: ÄÃ£ tiáº¿p nháº­n cáº£nh bÃ¡o báº£o máº­t vá» sá»± cá»‘ Invalid cache revocation. `cache.del()` Ä‘Ã£ Ä‘Æ°á»£c thay tháº¿ báº±ng `CacheManager.del()` táº¡i `update-staff.usecase.ts` vÃ  `delete-staff.usecase.ts` Ä‘á»ƒ Ä‘áº£m báº£o invalidate á»Ÿ cáº£ L1 Memory Cache láº§n L2 Redis Cache, Ä‘Ã³ng dá»©t Ä‘iá»ƒm window 30s revoke token.

## [4.33.23] - 2026-05-08
### Added
- **Security & Integrity (Zod Validation at Controller Layer)**: Cáº­p nháº­t Zod schema parsing cho toÃ n bá»™ cÃ¡c API Controller nháº±m ngÄƒn cháº·n cÃ¡c lá»— há»•ng prototype pollution, oversized payloads bypass, vÃ  type coercion á»Ÿ layer HTTP trÆ°á»›c khi dá»¯ liá»‡u Ä‘Æ°á»£c truyá»n vÃ o Use Cases. CÃ¡c method `req.body`, `req.query`, vÃ  `req.params` táº¡i 11 controllers (`staff`, `incident`, `vendor`, `audit`, `tenant`, v.v.) hiá»‡n Ä‘Ã£ Ä‘Æ°á»£c báº£o vá»‡ Ä‘áº§y Ä‘á»§ báº±ng `z.object().parse()`.

## [4.33.22] - 2026-05-08
### Changed
- **Advanced Reporting UI & Mobile Optimization (UI/UX - Architecture)**: Cháº¥p thuáº­n vÃ  triá»ƒn khai theo Ä‘á» xuáº¥t UX/UI má»›i cho module BÃ¡o cÃ¡o. Chuyá»ƒn Ä‘á»•i báº£ng tÄ©nh sang cáº¥u trÃºc DataTable há»— trá»£ Server-side Filtering (Tráº¡ng thÃ¡i, NhÃ¢n viÃªn), Sorting (NgÃ y táº¡o) vÃ  Pagination (Cursor-based) theo Ä‘Ãºng tiÃªu chuáº©n kiáº¿n trÃºc. Tá»‘i Æ°u hÃ³a UI/UX trÃªn thiáº¿t bá»‹ di Ä‘á»™ng (Responsive Card Layout thay cho Table truyá»n thá»‘ng) tuÃ¢n thá»§ nguyÃªn táº¯c Thumb-first.

## [4.33.21] - 2026-05-07
### Fixed
- **Tenant Isolation RLS Bypass (Architectural Rule - Security)**: Pháº£n há»“i [G-01] vÃ  [G-02]. Kháº¯c phá»¥c triá»‡t Ä‘á»ƒ lá»—i PostgreSQL Row-Level Security (RLS) khi sá»­ dá»¥ng `db.forTenant('system')` hoáº·c `db.system()` cho cÃ¡c query há»‡ thá»‘ng trÃªn cÃ¡c báº£ng tenant-scoped (`Notification`, `Staff`). ÄÃ£ Ã¡p dá»¥ng `db.withTenant('SYSTEM')` káº¿t há»£p vá»›i `{ callerRole: 'super-admin' }` táº¡i `request-upgrade.usecase.ts` vÃ  `superadmin.service.ts` Ä‘á»ƒ Ä‘áº£m báº£o biáº¿n session `app.current_tenant_id` Ä‘Æ°á»£c thiáº¿t láº­p chÃ­nh xÃ¡c cho luá»“ng truy váº¥n cáº¥p há»‡ thá»‘ng, ngÄƒn cháº·n rÃ¡c dá»¯ liá»‡u, báº£o Ä‘áº£m tÃ­nh toÃ n váº¹n vÃ  thÃ´ng suá»‘t RLS.

## [4.33.20] - 2026-05-07
### Added
- **Dynamic RBAC Engine (Architectural Baseline)**: ÄÆ°a cáº¥u hÃ¬nh ma tráº­n phÃ¢n quyá»n (RBAC Matrix) vÃ o báº£ng `SystemConfig` (vá»›i khÃ³a `role_permissions`) Ä‘á»ƒ há»— trá»£ cáº­p nháº­t phÃ¢n quyá»n theo thá»i gian thá»±c mÃ  khÃ´ng cáº§n hardcode.
- Middleware `requirePermission` hiá»‡n Ä‘á»c quyá»n trá»±c tiáº¿p tá»« Redis Cache (Single-Flight/Anti-thundering-herd) qua `loadDynamicPermissions()`, fallback vá» `SystemConfig`.
- Bá»• sung ká»‹ch báº£n Seed vÃ o `auth/seed.ts` Ä‘á»ƒ tá»± Ä‘á»™ng lÆ°u máº£ng quyá»n ban Ä‘áº§u (Default Permissions) vÃ o cÆ¡ sá»Ÿ dá»¯ liá»‡u khi khá»Ÿi cháº¡y mÃ´i trÆ°á»ng má»›i.

## [4.33.19] - 2026-05-07
### Fixed
- **Robust API Error Handling**: Cáº£i tiáº¿n Middleware á»Ÿ API Gateway Ä‘á»ƒ tiÃªu chuáº©n hoÃ¡ HTTP 400 Bad Request cho má»i lá»—i `ZodError` tráº£ vá» cáº¥u trÃºc lá»—i chi tiáº¿t.
- Cáº£i tiáº¿n hÃ m `apiFetch` (Client-side) tá»± Ä‘á»™ng phÃ¢n tÃ¡ch vÃ  trÃ¬nh bÃ y toast errors (VÃ­ dá»¥: `[field] message`) tá»« Zod Errors.

## [4.33.15] - 2026-05-07
### Audited
- **Audit Controller Cursor Pagination Verified (High Priority)**: Pháº£n há»“i yÃªu cáº§u #2. ÄÃ£ rÃ  soÃ¡t `src/server/modules/audit/audit.controller.ts`. XÃ¡c nháº­n chá»©c nÄƒng Cursor-based pagination Ä‘Ã£ Ä‘Æ°á»£c triá»ƒn khai hoÃ n thiá»‡n vÃ  trÆ¡n tru. Há»‡ thá»‘ng tá»± Ä‘á»™ng giá»›i háº¡n `take = Math.min(Number(take) || 20, 200)`, tráº£ Ä‘Ãºng object cÃ³ `nextCursor`, ngÄƒn cháº·n hoÃ n toÃ n rá»§i ro Out of Memory (OOM) trong List API. NÃ¢ng version lÃªn V.4.33.15.

## [4.33.14] - 2026-05-07
### Audited
- **AttendanceType Enum Integrity Check (Critical - Architect Rule)**: Pháº£n há»“i [G-08]. ÄÃ£ rÃ  soÃ¡t vÃ  xÃ¡c nháº­n `AttendanceType` trong `src/server/domain/entities.ts` hoÃ n toÃ n tuÃ¢n thá»§ chuáº©n DB (`CHECK_IN = 'CHECK_IN'` vÃ  `CHECK_OUT = 'CHECK_OUT'`). ÄÃ£ thÃªm safety comment Ä‘á»ƒ ngÄƒn ngá»«a developer thay Ä‘á»•i nháº§m vá» lowercase trong tÆ°Æ¡ng lai. NgÄƒn cháº·n triá»‡t Ä‘á»ƒ rá»§i ro nháº­n káº¿t quáº£ query rá»—ng do sai lá»‡nh case-sensitive. NÃ¢ng version lÃªn V.4.33.14.

## [4.33.13] - 2026-05-07
### Changed
- **Cache Lock Timeout Comment Fix (Info)**: Pháº£n há»“i [G-07]. Sá»­a comment cho giÃ¡ trá»‹ `MAX_WAIT_MS` trong `src/server/core/cache/manager.ts` Ä‘á»ƒ lÃ m rÃµ ráº±ng Ä‘Ã¢y lÃ  timeout global Ã¡p dá»¥ng cho má»i khÃ³a cache, khÃ´ng chá»‰ riÃªng luá»“ng auth. NÃ¢ng version lÃªn V.4.33.13.

## [4.33.12] - 2026-05-07
### Fixed
- **TypeScript Strict Mode Hardening for Catch Block (Architectural Rule - Debugging Discipline)**: Pháº£n há»“i Ä‘á» nghá»‹ rÃ  soÃ¡t lá»—i `catch` cá»§a lá»‡nh bootstrap trong `src/server/index.ts:235`. Thay vÃ¬ sá»­ dá»¥ng implicit parameter catch block, sá»­a láº¡i thÃ nh `catch (fallbackErr: any)` Ä‘á»ƒ tuÃ¢n thá»§ strict mode TypeScript vÃ  báº£o vá»‡ khai bÃ¡o biáº¿n an toÃ n khÃ´ng bá»‹ shadow tá»« biáº¿n `err` cá»§a Promise resolver bÃªn trÃªn. NÃ¢ng version lÃªn V.4.33.12.

## [4.33.11] - 2026-05-07
### Changed
- **Enterprise Plan First-Class Support (Architectural Rule - Data SSOT)**: Pháº£n há»“i Ä‘á» xuáº¥t [G-06] tá»« CTO. Bá»• sung giÃ¡ trá»‹ `ENTERPRISE` vÃ o `SubscriptionPlan` trong `schema.prisma`. Loáº¡i bá» toÃ n bá»™ logic mapping workaround ráº£i rÃ¡c (`PRO -> ENTERPRISE`). Cáº­p nháº­t logic lá»c nhÃ³m metrics trong SuperAdmin Service giÃºp tÃ­nh toÃ¡n Revenue chÃ­nh xÃ¡c hÆ¡n. Cáº¥u trÃºc type-safely cho `AuthContext`, `TenantAdminDashboard`, `useFeatureFlag`, vÃ  `TenantList`. Táº¡o thÆ° má»¥c migration chuáº©n bá»‹ cho PostgreSQL script thá»±c thi thá»±c táº¿.

## [4.33.10] - 2026-05-07
### Fixed
- **AuthContext Subscription Plan Fallback Logic (Architectural Rule - Defensive Programming)**: Fix lá»—i [G-05] táº¡i `src/context/AuthContext.tsx`. Thay tháº¿ string fallback logic lá»ng láº»o (`||`) báº±ng logic kiá»ƒm tra `!= null && !== ''` an toÃ n hÆ¡n. Viá»‡c dÃ¹ng toÃ¡n tá»­ `||` Ä‘á»‘i vá»›i biáº¿n chuá»—i chá»©a `FREE` hay giÃ¡ trá»‹ tÆ°Æ¡ng tá»± lÃ  chÆ°a tá»‘i Æ°u vÃ  dá»… gáº·p rá»§i ro Ä‘á»‘i chiáº¿u type falsy trong TypeScript, vi pháº¡m nguyÃªn táº¯c "Defensive Programming". ÄÃ£ cáº­p nháº­t kiá»ƒm tra rá»—ng tÆ°á»ng minh. Cáº­p nháº­t version tá»« 4.33.9 lÃªn 4.33.10.

## [4.33.9] - 2026-05-07
### Audited
- **Systematic Audit for Silent Exceptions (Architectural Rule - Debugging Discipline)**: Pháº£n há»“i Ä‘á» xuáº¥t [G-04] tá»« Sáº¿p/C-Level. ÄÃ£ rÃ  soÃ¡t toÃ n bá»™ há»‡ thá»‘ng liÃªn quan tá»›i `catch {}`. XÃ¡c nháº­n lá»—i `catch` nuá»‘t biáº¿n `err` á»Ÿ file `src/server/index.ts:235` **Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½** tá»« phiÃªn báº£n `V.4.33.8`. Káº¿t quáº£ Audit cÅ©ng loáº¡i trá»« 2 vá»‹ trÃ­ dÃ¹ng `catch {}` há»£p lá»‡ táº¡i `report.controller.ts` vÃ  `audit.mask.ts` (cá»‘ tÃ¬nh lá» lá»—i parse mÃ  khÃ´ng gá»i biáº¿n rÃ¡c). Cáº­p nháº­t version tá»« 4.33.8 lÃªn 4.33.9 Ä‘á»ƒ Ä‘á»“ng bá»™ Whitepaper vÃ  thá»ƒ hiá»‡n viá»‡c Audit hoÃ n táº¥t.

## [4.33.8] - 2026-05-07
### Fixed
- **Silent Exception in Bootstrap (Architectural Rule - Debugging Discipline)**: Fix lá»—i nghiÃªm trá»ng [G-04] táº¡i `src/server/index.ts:235` vi pháº¡m quy Ä‘á»‹nh cáº¥m silent catch liÃªn quan Ä‘áº¿n Bootstrap. Bá»• sung tham sá»‘ Ä‘á»‘i sá»‘ cho block `catch (e)` vÃ  log Ä‘áº§y Ä‘á»§ Ä‘á»ƒ ngÄƒn cháº·n lá»—i TypeScript strict mode khÃ´ng truyá»n parameter hoáº·c bá»‹ shadow biáº¿n cá»§a khá»‘i báº¯t lá»—i bÃªn trÃªn. Cáº­p nháº­t version tá»« 4.33.7 lÃªn 4.33.8.

## [4.33.7] - 2026-05-07
### Fixed
- **CacheManager Delay Hot-path (Architectural Rule - Resilience & Observability)**: Fix lá»—i nghiÃªm trá»ng [G-03] táº¡i `src/server/core/cache/manager.ts:236` vi pháº¡m quy Ä‘á»‹nh delay tÄ©nh. Thay tháº¿ `await new Promise(resolve => setTimeout(resolve, 50))` trong auth hot path báº±ng Exponential Backoff. Delay ban Ä‘áº§u lÃ  10ms, tÄƒng má»—i x2 sau má»—i lÆ°á»£t vÃ  Ä‘áº¡t tá»‘i Ä‘a lÃ  100ms. Cáº­p nháº­t version tá»« 4.33.6 lÃªn 4.33.7.

## [4.33.6] - 2026-05-07
### Fixed
- **API Pagination Compliance (Architectural Rule - API Contract & Pagination)**: Fix lá»—i nghiÃªm trá»ng [G-02] táº¡i `src/server/modules/audit/audit.controller.ts:36` vi pháº¡m quy Ä‘á»‹nh chá»‘ng Out of Memory. API list audit Ä‘ang hardcode `take: 100` mÃ  khÃ´ng tráº£ vá» nextCursor. ÄÃ£ chuyá»ƒn sang mÃ´ hÃ¬nh Cursor-based pagination (`cursor`, `take` dynamic láº¥y tá»‘i Ä‘a 200) theo chuáº©n kiáº¿n trÃºc, tráº£ vá» object `{ data: audits, nextCursor }`. Äáº£m báº£o front-end SurpriseAudit khÃ´ng bá»‹ áº£nh hÆ°á»Ÿng (Ä‘Æ°á»£c báº£o vá»‡ bá»Ÿi schema `(result as any)?.data || result`). Ordered báº±ng time (`createdAt: 'desc'`) & `id` tie-breaker. Cáº­p nháº­t version tá»« 4.33.5 lÃªn 4.33.6.

## [4.33.5] - 2026-05-07
### Added
- **Secure Camera Capture (Live Evidence)**: Äá» xuáº¥t triá»ƒn khai tÃ­nh nÄƒng chá»¥p hÃ¬nh trá»±c tiáº¿p thÃ´ng qua PWA (MediaDevices API) Ä‘á»ƒ ngÄƒn cháº·n viá»‡c táº£i lÃªn áº£nh giáº£ máº¡o. Cáº­p nháº­t Whitepaper (`DOCUMENTATION.md`) lÆ°u cÃ¡c rÃ ng buá»™c pháº§n cá»©ng vÃ  toÃ n váº¹n báº±ng chá»©ng. Cáº­p nháº­t version tá»« 4.33.4 lÃªn 4.33.5.

## [4.33.4] - 2026-05-07
### Fixed
- **AttendanceType Mismatch (Architectural Rule - Data Integrity)**: ÄÃ£ xá»­ lÃ½ triá»‡t Ä‘á»ƒ silent bug nghiÃªm trá»ng [G-01] giá»¯a Domain Entity vÃ  Database cho `AttendanceType`. Tráº¡ng thÃ¡i thá»±c táº¿ trong database lÆ°u lÃ  uppercase string `CHECK_IN` / `CHECK_OUT` nhÆ°ng giÃ¡ trá»‹ trong cáº¥u hÃ¬nh model trÆ°á»›c Ä‘Ã³ lÃ  `check-in` / `check-out`. ÄÃ£ Ä‘á»“ng bá»™ enum `AttendanceType` vá» giÃ¡ trá»‹ uppercase Ä‘Ãºng chuáº©n vÃ  thay tháº¿ cÃ¡c hard-code string `'CHECK_IN'` trong core use-cases (`check-out`, `check-in`, `shift-reconciliation`) báº±ng `AttendanceType.CHECK_IN`. Cáº­p nháº­t phiÃªn báº£n lÃªn 4.33.4.

## [4.33.3] - 2026-05-07
### Added
- **RBAC Dynamic Permission Engine Testing (Architectural Test)**: Viáº¿t test coverage toÃ n diá»‡n (`permissions.spec.ts`) cho luá»“ng Permission Engine Ä‘á»™ng (critical path), Ä‘áº£m báº£o: (a) DB load cache hit (single validation check tá»« database, tráº£ vá» cache), (b) SUPER_ADMIN bypass luÃ´n Ä‘Ãºng, vÃ  (c) Invalid permission key/roles bá»‹ catch vÃ  reject triá»‡t Ä‘á»ƒ. Äáº£m báº£o quality code trÆ°á»›c khi release. Cáº­p nháº­t phiÃªn báº£n tá»« 4.33.2 lÃªn 4.33.3.

## [4.33.2] - 2026-05-07
### Changed
- **LoadDynamicPermissions Single-flight Pattern Fix (Architectural Rule)**: Cáº¥u trÃºc láº¡i logic hÃ m `loadDynamicPermissions` Ä‘á»ƒ bao bá»c toÃ n bá»™ code báº¥t Ä‘á»“ng bá»™ báº±ng `loadPromise`. Fix triá»‡t Ä‘á»ƒ lá»—i Thundering Herd tá»›i Redis (`cache.get`) dÆ°á»›i táº£i cao, Ä‘áº£m báº£o quÃ¡ trÃ¬nh Ä‘á»“ng bá»™ Multi-pod Consistency vÃ  fetch cache diá»…n ra duy nháº¥t má»™t láº§n trÃªn má»—i instance Node.js. Cáº­p nháº­t phiÃªn báº£n tá»« 4.33.1 lÃªn 4.33.2.

## [4.33.1] - 2026-05-07
### Changed
- **Enum Integrity Hardening (Architectural Rule)**: Thá»‘ng nháº¥t nguyÃªn táº¯c báº£o máº­t vÃ  toÃ n váº¹n dá»¯ liá»‡u cho toÃ n bá»™ dá»± Ã¡n SCMD Pro báº±ng viá»‡c cáº¥m sá»­ dá»¥ng String Literals thay cho Enum (vÃ­ dá»¥: `IncidentStatus`). Quy táº¯c Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t vÃ o Whitepaper (`DOCUMENTATION.md`) nháº±m ngÄƒn cháº·n triá»‡t Ä‘á»ƒ lá»—i "Silent Bug". Cáº­p nháº­t phiÃªn báº£n tá»« 4.33.0 lÃªn 4.33.1 theo nguyÃªn táº¯c versioning.

## [4.33.0] - 2026-05-07
### Added
- **SCMD RBAC Matrix**: Giao diá»‡n má»›i cho SuperAdmin Ä‘á»ƒ quáº£n lÃ½ ma tráº­n quyá»n háº¡n (Permissions) cá»§a tá»«ng vai trÃ² (Role) má»™t cÃ¡ch trá»±c quan.
- **Dynamic Permission Engine**: Chuyá»ƒn Ä‘á»•i cÆ¡ cháº¿ phÃ¢n quyá»n tá»« tÄ©nh (hardcoded) sang Ä‘á»™ng, lÆ°u trá»¯ táº¡i Database (`SystemConfig`) vÃ  há»— trá»£ cáº­p nháº­t Real-time.
- **Permission Cache Layer**: Há»‡ thá»‘ng caching bá»™ nhá»› Ä‘á»‡m (30s TTL) cho phÃ¢n quyá»n Ä‘á»ƒ tá»‘i Æ°u hiá»‡u nÄƒng vÃ  trÃ¡nh ngháº½n Database.

### Fixed
- **Static Delay Anti-pattern Elimination**: Loáº¡i bá» toÃ n bá»™ code `setTimeout` vÃ  `Promise` táº¡o trá»… tÄ©nh (1500ms, 1000ms) trong `SuperAdminDashboard.tsx`. Thay tháº¿ báº±ng logic xá»­ lÃ½ tráº¡ng thÃ¡i thá»±c táº¿ dá»±a trÃªn káº¿t quáº£ pháº£n há»“i tá»« API/Use-case, tá»‘i Æ°u hÃ³a tráº£i nghiá»‡m ngÆ°á»i dÃ¹ng theo chuáº©n Lead Security Engineer.

## [4.32.9] - 2026-05-07
### Changed
- **UI Architecture Harmonization**: Cáº­p nháº­t toÃ n bá»™ cÃ¡c Component trong module **Quáº£n lÃ½ NhÃ  tháº§u** (VendorModal, VendorContractManagement, VendorEvaluationReport) sang sá»­ dá»¥ng há»‡ thá»‘ng Design Tokens (Navy Theme v1.1.5) vÃ  cÃ¡c Atomic Components chuáº©n (`SCMDButton`, `SCMDCard`, `SCMDInput`). 

## [4.32.8] - 2026-05-07
### Fixed
- **Tenant Isolation Enforcement**: Thá»±c hiá»‡n rÃ  soÃ¡t vÃ  thay tháº¿ cÃ¡c lá»‡nh `db.system()` báº±ng `db.forTenant()` vÃ  `db.withTenant()` táº¡i cÃ¡c module quan trá»ng nhÆ° `AuditService`, `NotificationService`, `VerifyTrialUseCase` vÃ  `OutboxProcessor`. Äáº£m báº£o Row-Level Security (RLS) Ä‘Æ°á»£c kÃ­ch hoáº¡t cho toÃ n bá»™ dá»¯ liá»‡u thuá»™c pháº¡m vi tenant, ngÄƒn cháº·n tuyá»‡t Ä‘á»‘i rÃ² rá»‰ dá»¯ liá»‡u chÃ©o.
- **Outbox Processing Isolation**: Chuyá»ƒn Ä‘á»•i vÃ²ng láº·p xá»­ lÃ½ sá»± kiá»‡n trong `OutboxProcessor` sang sá»­ dá»¥ng `db.withTenant(event.tenantId, ...)` Ä‘á»ƒ thiáº¿t láº­p chÃ­nh xÃ¡c PostgreSQL session variable cho tá»«ng sá»± kiá»‡n riÃªng biá»‡t.
- **Database Utility Enhancement**: Bá»• sung há»— trá»£ `timeout` tÃ¹y chá»‰nh cho `db.withTenant` options Ä‘á»ƒ xá»­ lÃ½ cÃ¡c tÃ¡c vá»¥ xá»­ lÃ½ hÃ ng loáº¡t dÃ i háº¡n á»•n Ä‘á»‹nh hÆ¡n.

## [4.32.7] - 2026-05-07 (Security Hardening & RLS Integrity)
### Fixed
- **Monthly Strategy RLS Bypass**: Kháº¯c phá»¥c lá»— há»•ng bypass Row-Level Security táº¡i `LightWorker` (job `MONTHLY_AI_STRATEGY`). Chuyá»ƒn Ä‘á»•i cÃ¡c cÃ¢u lá»‡nh raw SQL tá»« `db.system()` sang `db.withTenant()` Ä‘á»ƒ Ä‘áº£m báº£o biáº¿n mÃ´i trÆ°á»ng `app.current_tenant_id` Ä‘Æ°á»£c thiáº¿t láº­p chÃ­nh xÃ¡c cho PostgreSQL session, ngÄƒn cháº·n rá»§i ro rÃ² rá»‰ dá»¯ liá»‡u chÃ©o tenant.

## [4.32.6] - 2026-05-07 (Enum Integrity & Worker Resilience)
### Fixed
- **SOS Incident Status Fix**: Kháº¯c phá»¥c lá»—i sá»­ dá»¥ng string `'reported'` sai chuáº©n Enum trong `OutboxProcessor`. ÄÃ£ chuyá»ƒn sang sá»­ dá»¥ng `IncidentStatus.REPORTED` tá»« Prisma Client Ä‘á»ƒ Ä‘áº£m báº£o State Machine váº­n hÃ nh chÃ­nh xÃ¡c.
- **AI Worker Severity Fix**: Sá»­a lá»—i logic táº¡i `HeavyWorker` khi dÃ¹ng string `'High'` cho má»©c Ä‘á»™ nghiÃªm trá»ng cá»§a sá»± cá»‘. ÄÃ£ Ä‘á»“ng bá»™ sang `IncidentSeverity.HIGH` Ä‘á»ƒ kÃ­ch hoáº¡t Ä‘Ãºng cÆ¡ cháº¿ Escalation vÃ  hiá»ƒn thá»‹ Dashboard.

## [4.32.5] - 2026-05-07 (System Stability Fix)
### Fixed
- **Fetch TypeError Restoration**: Loáº¡i bá» hoÃ n toÃ n logic "Fetch Protection Guard" táº¡i `src/main.tsx`. Giáº£i quyáº¿t triá»‡t Ä‘á»ƒ lá»—i `Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter` do xung Ä‘á»™t vá»›i cÆ¡ cháº¿ quáº£n lÃ½ fetch cá»§a mÃ´i trÆ°á»ng AI Studio. Há»‡ thá»‘ng hiá»‡n táº¡i Ä‘Ã£ hoáº¡t Ä‘á»™ng á»•n Ä‘á»‹nh vÃ  mÆ°á»£t mÃ  trá»Ÿ láº¡i.

## [4.32.4] - 2026-05-07 (Tenant Management Enhancement)
### Added
- **Global Search Optimization**: NÃ¢ng cáº¥p bá»™ lá»c tÃ¬m kiáº¿m táº¡i SuperAdmin Tenant List. Hiá»‡n táº¡i há»— trá»£ truy váº¥n Ä‘a Ä‘iá»u kiá»‡n: TÃªn doanh nghiá»‡p, Subdomain, Danh tÃ­nh chá»§ sá»Ÿ há»¯u, Email, Phone vÃ  Ä‘áº·c biá»‡t lÃ  **Tráº¡ng thÃ¡i váº­n hÃ nh (Live/Suspended)** trá»±c tiáº¿p tá»« Ã´ tÃ¬m kiáº¿m.
- **System Restoration**: KhÃ´i phá»¥c toÃ n bá»™ cÃ¡c file cáº¥u hÃ¬nh cá»‘t lÃµi (`package.json`, `index.html`, `metadata.json`, v.v.) sau sá»± cá»‘ máº¥t dá»¯ liá»‡u, Ä‘áº£m báº£o tÃ­nh liÃªn tá»¥c cá»§a há»‡ thá»‘ng (Invariant Preservation).
### Changed
- **System Version**: NÃ¢ng cáº¥p Ä‘á»‹nh danh toÃ n há»‡ thá»‘ng lÃªn phiÃªn báº£n **V.4.32.4**.

## [4.32.3] - 2026-05-07 (Domain Hardening & Pruning)
### Added
- **Domain Layer Hardening**: Chuyá»ƒn Ä‘á»•i toÃ n bá»™ cÃ¡c "String Union Types" táº¡i `src/server/domain/entities.ts` vÃ  `src/server/core/architecture/types.ts` sang **TypeScript Enums**. Äáº£m báº£o tÃ­nh nháº¥t quÃ¡n dá»¯ liá»‡u á»Ÿ cáº¥p Ä‘á»™ mÃ£ nguá»“n vÃ  Ä‘á»“ng khai bÃ¡o chuáº©n PostgreSQL Enums trong tÆ°Æ¡ng lai.
### Removed
- **Cloudinary Deprecation**: Gá»¡ bá» hoÃ n toÃ n dependency `cloudinary` khá»i `package.json`. Há»‡ thá»‘ng hiá»‡n táº¡i Ä‘Ã£ tá»‘i Æ°u hÃ³a sá»­ dá»¥ng S3/R2 cho Evidence Storage.
- **Artifact Cleanup**: XÃ³a file `vh_staff.txt` (2MB) khá»i repository Ä‘á»ƒ giáº£m dung lÆ°á»£ng lÆ°u trá»¯ vÃ  tá»‘i Æ°u hÃ³a tá»‘c Ä‘á»™ Clone/Build. Chuyá»ƒn sang cÆ¡ cháº¿ dá»¯ liá»‡u Ä‘á»™ng hoáº·c náº¡p tá»« mÃ´i trÆ°á»ng.

## [4.32.2] - 2026-05-07 (Security & Environment Resilience)
### Fixed
- **Fetch Protection Guard (TypeError)**: Kháº¯c phá»¥c lá»—i `Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter` xáº£y ra trong mÃ´i trÆ°á»ng sandbox cá»§a AI Studio. 
  - Triá»ƒn khai cÆ¡ cháº¿ **Defensive Property Verification**: Kiá»ƒm tra ká»¹ lÆ°á»¡ng cÃ¡c thuá»™c tÃ­nh `configurable` vÃ  `writable` cá»§a `window.fetch` trÆ°á»›c khi Ã¡p dá»¥ng cÆ¡ cháº¿ khÃ³a cá»©ng (Hardening).
  - Bá»• sung **Safe Proxy Fallback**: Náº¿u mÃ´i trÆ°á»ng khÃ´ng cho phÃ©p can thiá»‡p trá»±c tiáº¿p vÃ o Ä‘á»‘i tÆ°á»£ng toÃ n cá»¥c thÃ´ng qua `Object.defineProperty`, há»‡ thá»‘ng sáº½ ghi nháº­t kÃ½ cáº£nh bÃ¡o vÃ  tiáº¿p tá»¥c váº­n hÃ nh thay vÃ¬ gÃ¢y treo á»©ng dá»¥ng (Runtime Crash).
- **Version Standardization**: Äá»“ng bá»™ hÃ³a toÃ n bá»™ Ä‘á»‹nh danh phiÃªn báº£n há»‡ thá»‘ng lÃªn **V.4.32.2** táº¡i `metadata.json`, `index.html` vÃ  mÃ£ nguá»“n theo lá»™ trÃ¬nh chuáº©n hÃ³a cá»§a CTO.

## [4.32.1] - 2026-05-07 (Initial Version Baseline)
- **Baseline established**: Thiáº¿t láº­p má»‘c phiÃªn báº£n gá»‘c cho chu ká»³ cáº£i tiáº¿n má»›i.

