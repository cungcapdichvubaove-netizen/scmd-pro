# Contract-as-Rule-Engine: QA Checklist

Tài liệu này cung cấp các tiêu chí kiểm tra cho QA/QC đối với module Contract-as-Rule-Engine, bao gồm vòng đời hợp đồng, các chính sách, đồng bộ schema và báo cáo tháng.

## 1. Vòng Đời Hợp Đồng (Contract Lifecycle)
- [ ] **Khởi tạo Hợp đồng mới**:
  - Hợp đồng mới được tạo ra ở trạng thái `DRAFT` kèm theo 1 `ContractVersion` (Rev.1).
  - Dữ liệu `acceptancePolicy`, `evidencePolicy`, `penaltyPolicy`, và `slaConfig` phải được lưu đúng định dạng JSON.
- [ ] **Kích hoạt Hợp đồng (Activate Contract)**:
  - Khi cập nhật `status = ACTIVE`, hệ thống phải validate có đủ field bắt buộc (vendorId, siteId, startDate, endDate, guardCountPerShift).
  - Phải có SLA Rule, Shift Requirements, và Staff Standards tối thiểu.
  - Sau khi kích hoạt, `activeVersionId` trỏ về đúng version `ACTIVE`.
- [ ] **Cập nhật Hợp đồng đang ACTIVE (Supersede)**:
  - Khi cập nhật cấu hình của hợp đồng đang ACTIVE, version cũ phải chuyển sang trạng thái `SUPERSEDED`.
  - Một `ContractVersion` mới được tạo ra ở trạng thái `ACTIVE` (ví dụ Rev.2) chứa các thay đổi mới.
  - Các snapshot dữ liệu cũ trong `MonthlyAcceptanceReport` không bị ảnh hưởng.

## 2. Đồng Bộ Schema & Mapping Dữ Liệu
- [ ] **Contract Line Items**:
  - Khi lưu `acceptancePolicy.contractLineItems`, hệ thống sẽ ghi bảng `contract_line_items`.
  - Trường `requiredStaffCount` lấy đúng logic (ưu tiên `requiredStaffCount`, hoặc alias `quantity`, hoặc mặc định `1`).
  - Trường `totalAmount` tự tính: `totalAmount` = `unitPrice * requiredStaffCount` nếu không truyền trực tiếp.
  - Khi xoá item khỏi UI, bản ghi cũ bị đánh dấu `isActive = false` thay vì hard delete.
- [ ] **Penalty Rules**:
  - Khi cập nhật Penalty Policy, audit log sinh ra sự kiện `CONTRACT_PENALTY_RULES_SYNCED`.
  - Các rule cũ không còn tồn tại sẽ bị chuyển `isActive = false`.
- [ ] **Shift Requirements & Staff Standards**:
  - Việc xoá/sửa trong JSON phải mapping chính xác thành `isActive = false` / `true` trong cơ sở dữ liệu (tương tự như Line Items).

## 3. Enforcement Checklist & Ca Tuần Tra
- [ ] **Functional Gap Acknowledgment**:
  - Hiện tại, tính năng check-list bắt buộc khi tuần tra (bắt buộc phải chụp ảnh kho, nếu thiếu sinh ra `MISSING_EVIDENCE` hoặc `INCOMPLETE_PATROL_CHECKLIST`) đang là một khoảng trống chức năng (Functional Gap) và **CHƯA ĐƯỢC IMPLEMENT**.
  - QA cần kiểm tra rằng `CompletePatrolUseCase` hiện tại chỉ ghi log "FRAUD" khi sai GPS, chứ chưa tự động bắn Violation Event cho Checklist. (Yêu cầu báo cáo rủi ro về cho PM).

## 4. Feature Flag & Dependencies
- [ ] **Trạng Thái Mặc Định**:
  - AI Contract Scan (`ai_contract_scan`) mặc định **TẮT** ở tất cả các gói (FREE, PRO, ENTERPRISE).
  - Trạng thái `blockedByGovernance` không còn xuất hiện.
- [ ] **Cơ Chế Auto-Enable Dependencies**:
  - Khi cấu hình bật một feature phụ thuộc (ví dụ `vendor_scorecard`), hệ thống sẽ tự bật feature gốc (`vendor_management`, `contract_compliance`).
  - Dữ liệu trả về (từ API `resolveTenantFeatureFlagsDetailed`) sẽ làm rõ sự khác biệt giữa `resolvedForDisplay` (config gốc) và `resolvedForRuntime` (đã kích hoạt dependencies), kèm theo `dependencyWarnings`.

## 5. Cấp Độ Bảo Mật & RLS
- [ ] **Tenant Isolation**: Đảm bảo toàn bộ truy vấn `contract_line_items`, `contract_versions` phải gọi qua Prisma `db.withTenant(ctx.tenantId)`. Không cho phép user tenant A xem cấu hình penalty rule của tenant B.
