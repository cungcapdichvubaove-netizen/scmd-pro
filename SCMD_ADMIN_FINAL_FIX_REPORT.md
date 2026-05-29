# SCMD PRO Admin Dashboard — Final UX Fix Report

## Căn cứ sửa tiếp
Dựa trên báo cáo kiểm định UX/UI Dashboard Admin do người dùng cung cấp sau bản P0-P2 Backtested Fixed.

## Các lỗi đã xử lý trong bản final

### 1. UsageAnalytics / MarketGrowth placeholder
- Loại bỏ dữ liệu demo/hard-code trong MarketGrowthTab.
- Loại bỏ noDataLabel và các card "Chờ API / Không dùng demo" trong UsageAnalyticsTab.
- Chuyển sang fetch API thật:
  - `/api/superadmin/market-growth`
  - `/api/tenant/usage-analytics`
- Khi API chưa có dữ liệu, UI hiển thị empty state minh bạch, không giả lập số liệu.

### 2. AuditTab thiếu bảng lịch sử kiểm tra
- Bổ sung AuditHistoryTable ngay trên SurpriseAudit.
- Bảng có checkbox, saved views, bulk review, refresh, trạng thái, site/vendor/auditor/kết quả/bằng chứng/task.
- API dự kiến: `/api/tenant/audits?limit=25&sortBy=startedAt&sortOrder=desc`.

### 3. TasksTab metric tĩnh
- Thay các metric tĩnh "Theo nhiệm vụ", "Site / ca / vendor" bằng số liệu runtime lấy từ `/api/tenant/tasks?limit=200`.
- Metric mới: task đang mở, quá hạn, chưa phân công.

### 4. SettingsTab thiếu cấu hình vận hành lõi
- Bổ sung nhóm cấu hình Operations:
  - SLA xử lý mặc định.
  - Ngưỡng thiếu quân sau check-in.
  - Sai số GPS cho phép.
  - Mẫu ca mặc định.
  - Múi giờ tenant.
  - Quyền duyệt ngoại lệ.
- Giữ nguyên cấu hình Email/Zalo cũ.
- Lưu chung vào `/api/tenant/settings` trong object `settings.operations`.

### 5. DashboardPageHeader bị ẩn khi không có actions
- Sửa component DashboardPageHeader để luôn render eyebrow/title/description.
- Nếu có actions thì render vùng actions bên phải, không còn `if (!actions) return null`.

### 6. ViolationsMainTable cắt dữ liệu bằng `.slice(0, 50)`
- Loại bỏ `.slice(0, 50)`.
- Bổ sung pagination 25 dòng/trang cho Violations/Incidents/Tasks trong OperationsTables.
- Checkbox chọn hàng loạt hiện chỉ áp dụng theo trang hiện tại để tránh thao tác nhầm trên dữ liệu không nhìn thấy.

### 7. Drawer chỉ xem, chưa có action
- Mở rộng OpsDetailDrawer hỗ trợ `actions` footer.
- Bổ sung action footer cho drawer Violation/Incident/Task.

## File chính đã chỉnh
- `src/apps/common/interfaces/components/DashboardUI.tsx`
- `src/apps/security/interfaces/components/OpsTableSystem.tsx`
- `src/apps/security/interfaces/components/OperationsTables.tsx`
- `src/apps/security/interfaces/AuditTab.tsx`
- `src/apps/security/interfaces/TasksTab.tsx`
- `src/apps/security/interfaces/SettingsTab.tsx`
- `src/apps/security/interfaces/MarketGrowthTab.tsx`
- `src/apps/security/interfaces/UsageAnalyticsTab.tsx`

## Kiểm tra độc lập đã chạy
- Grep xác nhận không còn:
  - `slice(0, 50)`
  - `noDataLabel`
  - dữ liệu demo `const data = [` / `const sectorData`
  - metric tĩnh `Theo nhiệm vụ`, `Site / ca / vendor`
  - `if (!actions) return null`
- Chạy `tsc --noEmit` trên nhóm file đã sửa để kiểm tra syntax. Kết quả không có lỗi cú pháp TS/TSX trong file sửa; lỗi còn lại là thiếu dependency `node_modules` trong môi trường sandbox (`react`, `lucide-react`, `motion/react`, `zustand`, ...).

## Lệnh nghiệm thu trên máy dự án
```bash
npm ci
npx prisma generate
npm run build
```
