# SCMD Pro — KTC Security x OCB Demo Seed

## 1. Mục tiêu bộ dữ liệu

Bộ seed này tạo dữ liệu staging/pre-deploy cho mô hình **KTC Security cung cấp dịch vụ bảo vệ thuê ngoài cho chuỗi mục tiêu OCB**. Dữ liệu dùng để kiểm thử dashboard, bộ lọc, API, báo cáo ca trực, tuần tra, sự cố, SLA, vi phạm, vendor scorecard và monthly acceptance report.

## 2. Giả định nghiệp vụ

- Tenant demo: `Công ty Cổ phần Dịch vụ Bảo vệ Chuyên nghiệp KTC Việt Nam`.
- Vendor demo: `KTC Security`.
- Đối tượng được bảo vệ: chuỗi mục tiêu `Ngân hàng Phương Đông OCB`.
- Hợp đồng demo: `KTC-OCB-DEMO-2026-001`, trạng thái `ACTIVE`.
- Dữ liệu chỉ phục vụ staging/demo/pre-deploy, không phải lịch trực thật, không phải sơ đồ bảo vệ thật, không chứa thông tin nội bộ OCB/KTC.

## 3. Phạm vi dữ liệu

Seed tạo:

- 1 tenant KTC Security.
- 1 vendor KTC Security.
- 1 hợp đồng dịch vụ chính + 1 contract version active.
- 12 mục tiêu OCB ở nhiều khu vực.
- 6 guard post/checkpoint cho mỗi mục tiêu.
- 3 nhân sự/mục tiêu: ca ngày, ca đêm, hành chính.
- 5 giám sát khu vực.
- 30 ngày lịch trực liên tục từ `2026-04-27` đến `2026-05-26`.
- Ca ngày `07:00–19:00`, ca đêm `19:00–07:00` hôm sau, ca hành chính `08:00–17:00` nghỉ Chủ nhật.
- Chấm công vào/ra với dữ liệu đúng giờ, đi trễ, về sớm, thiếu check-in, thiếu check-out và vắng mặt.
- Lượt tuần tra ngày/đêm/hành chính với trạng thái completed, partial, missed, late, GPS flagged.
- Sự cố nhẹ/vừa/cao, timeline, evidence path demo, SLA breach demo.
- ViolationEvent, ViolationDispute, VendorScorecard, MonthlyAcceptanceReport, PenaltyItem.

## 4. Mapping theo schema hiện có

| Nghiệp vụ yêu cầu | Model hiện có |
|---|---|
| Khách hàng/tenant | `Tenant`, `TenantSubscription` |
| Nhà thầu bảo vệ | `Vendor` |
| Hợp đồng/SLA | `Contract`, `ContractVersion`, `ContractShiftRequirement`, `ContractChecklistRequirement`, `ContractPenaltyRule`, `ContractLineItem` |
| Mục tiêu bảo vệ | `Site` |
| Vị trí/chốt bảo vệ | `GuardPost` |
| Điểm tuần tra | `Checkpoint` + PostGIS `location` |
| Tuyến tuần tra | `PatrolRoute`, `PatrolRouteCheckpoint` |
| Lịch trực | `ShiftSchedule`, `ShiftAssignment` |
| Phiên làm việc | `ShiftSession` |
| Chấm công | `AttendanceRecord` |
| Lượt tuần tra | `PatrolAssignment`, `PatrolSession`, `PatrolLog` |
| Sự cố | `Incident`, `IncidentTimeline`, `IncidentEvidence`, `IncidentSlaRule` |
| Vi phạm/SLA | `ViolationEvent`, `ViolationDispute` |
| Đối soát tháng | `VendorScorecard`, `MonthlyAcceptanceReport`, `PenaltyItem` |
| Bàn giao ca | `ShiftSession.metadata.handover` vì schema chưa có bảng `handover_notes` |

## 5. Quy tắc sinh dữ liệu

- Nhân sự demo dùng email `@ktc-demo.local` và `idNumber` bắt đầu bằng `000079...`.
- Số điện thoại demo dùng prefix `0999...` để giảm rủi ro nhầm với dữ liệu thật.
- Ảnh minh chứng chỉ là path `/demo/evidence/...`, không dùng ảnh thật.
- Các địa điểm có trường `geoFence.dataSource`:
  - `public_reference`: tên/địa chỉ tham chiếu từ nguồn công khai.
  - `demo_generated`: địa chỉ/tọa độ mô phỏng an toàn, cần xác minh trước khi dùng production.
- Ca hành chính không sinh lịch Chủ nhật.
- Ca đêm có `plannedEnd` ngày hôm sau trong metadata và bản ghi check-out ngày D+1.
- Ngoại lệ chấm công/tuần tra luôn có ghi chú tiếng Việt trong `notes` hoặc metadata.

## 6. Cách chạy

```bash
npm install
npx prisma validate
npx prisma generate
npm run db:migrate
npm run db:seed:ktc-ocb:reset
```

Hoặc chạy trực tiếp:

```bash
npx tsx prisma/seeders/index.ts --tier=ktc-ocb --reset-ktc
```

## 7. Checklist nghiệm thu nhanh

Sau khi seed, kiểm tra:

```sql
SELECT COUNT(*) FROM tenants WHERE id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM sites WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM staff WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM shift_schedules WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM attendance_records WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM patrol_sessions WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM incidents WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM violation_events WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM vendor_scorecards WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
SELECT COUNT(*) FROM monthly_acceptance_reports WHERE tenant_id = 'tenant_ktc_security_ocb_demo';
```

Kỳ vọng tối thiểu:

- `sites`: 12.
- `staff`: 42+ gồm admin, supervisors, guards/admin mục tiêu.
- `shift_schedules`: khoảng 1.032 bản ghi.
- `attendance_records`: khoảng 2.000+ bản ghi tùy ngoại lệ.
- `patrol_sessions`: khoảng 4.000+ lượt vì mỗi ca có nhiều lượt tuần tra.
- `incidents`: có dữ liệu sự cố đa trạng thái.
- `violation_events`: có dữ liệu confirmed/pending để test đối soát.

## 8. Lưu ý khi import staging/pre-deploy

- Seed có option `--reset-ktc` chỉ reset tenant demo `tenant_ktc_security_ocb_demo`, không truncate toàn DB.
- Không chạy seed này trên production thật nếu chưa kiểm tra kỹ `DATABASE_URL`.
- Nếu schema thay đổi, cần chạy lại `npx prisma validate`, `npx prisma generate`, migration và `rls_setup.sql`.
- Nếu muốn tăng quy mô, tăng `DAYS_TO_SEED` hoặc thêm phần tử vào mảng `sites` trong `ktc-ocb.ts`.
