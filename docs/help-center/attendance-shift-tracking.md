# Hướng dẫn Quản lý Ca trực và Chấm công (Shift & Attendance Tracking)

Sổ tay này hướng dẫn cách sử dụng, vận hành tính năng Quản lý ca trực (`ShiftSchedule`) và Đối soát tự động (Shift Reconciliation) trong hệ thống SCMD Pro.

## 1. Tổng quan hệ thống chấm công

Hệ thống SCMD Pro tự động hóa hoàn toàn quy trình điểm danh (Check-in / Check-out) và đánh giá mức độ tuân thủ quân số (SLA Compliance) hàng ngày của nhà thầu bảo vệ.

Các tính năng nổi bật:
- Chống check-in giả mạo (Double Check-in).
- Tự động tính toán số phút đi muộn (`lateMinutes`), về sớm (`earlyLeaveMinutes`) và tổng thời gian làm việc (`workedMinutes`).
- Tự động đánh giá vi phạm hợp đồng (thiếu quân số) tự động vào 1:00 AM mỗi ngày.
- Xóa bỏ việc thống kê sổ sách thủ công.

---

## 2. Điểm danh (Smart Attendance)

Giao diện (UI) chấm công nằm trên App Mobile của từng vệ sĩ (`AttendanceModule`).

### 2.1. Vào ca (Check-In)
Khi vệ sĩ bấm **"Vào Ca"**:
1. Hệ thống gửi yêu cầu `CHECK_IN` kèm vị trí GPS và hình ảnh xác thực hiện trường (nếu có).
2. Hệ thống kiểm tra xem vệ sĩ có đăng ký `shiftScheduleId` nào không.
    - Nếu có, tính toán thời gian `lateMinutes` so với giờ `startTime` của ca đó.
3. Nếu vệ sĩ ĐÃ có một phiên check-in khác đang mở trong ngày, hệ thống sẽ BÁO LỖI để ngăn chặn gian lận vòng lặp.

### 2.2. Ra ca (Check-Out)
Khi vệ sĩ bấm **"Ra Ca"**:
1. Hệ thống tìm kiếm phiên `CHECK_IN` ban đầu của ngày hôm đó đang chờ đóng.
2. Tính toán tổng khoảng thời gian chênh lệch (`workedMinutes`).
3. Nếu vệ sĩ ra ca sớm hơn giờ kết thúc ca `endTime`, tính toán `earlyLeaveMinutes`.
4. Phiên chấm công kết thúc. Báo cáo sẽ hiển thị đồng thời cả `CHECK_IN` và `CHECK_OUT` giúp Admin đối chiếu.

### 2.3. Liveness (Báo thức)
Hệ thống cho phép vệ sĩ "Báo thức" để gửi tín hiệu Liveness (chứng minh đang tỉnh táo tại mục tiêu).

---

## 3. Quản lý hệ thống ca trực và tự động chốt ca

### 3.1. Thiết lập Shift Schedule (Admin)
Quản trị viên (Tenant Admin) tạo danh sách các ca trong ngày cho từng điểm trực:
Trường thông tin yêu cầu:
- **Thời gian (Date, Start/End Time)**: Ca Kíp (MORNING, AFTERNOON, NIGHT).
- **Số lượng quân yêu cầu (`requiredCount`)**: Vd: 5 vệ sĩ tại Mục Tiêu A.
- **Nhà thầu (`contractId`)**: Hợp đồng gắn với nhà thầu nào.

### 3.2. Hệ thống tự động đối soát (Reconciliation Worker)
Bạn không cần lập báo cáo quân số bằng Excel nữa. Hệ thống tự động xử lý mọi thứ!
- **Theo lịch trình (CronJob)**: Vào đúng 1:00 AM hàng ngày, SCMD Pro kích hoạt Worker hạng nhẹ (Light Worker) để chạy module đối soát.
- **Tiêu chuẩn tính Hợp lệ**: Một vệ sĩ được tính là "1 quân số thực tế" (`actualCount`) của ca ĐÓ chỉ khi **họ có check-in vào ca và số phút làm việc (workedMinutes) >= 30 phút**.
- **Chấm điểm và Phạt SLA**:
  - Tính toán số người thiếu (`missingCount`) và thừa (`excessCount`).
  - Nếu thiếu quân (`missingCount > 0`), hệ thống chuyển trạng thái sang `PENALIZED` (Vi phạm SLA).
  - Truy xuất mức phạt (`penaltyPerMissingGuard`) từ Cấu hình quản lý hợp đồng (`contract.slaConfig`) và áp dụng `penaltyAmount` thành tiền trừ vào nhà thầu.

Thống kê này giúp nhà quản lý theo dõi và thanh toán/quyển trích quỹ đối với công ty bảo vệ một cách tự động và minh bạch tuyệt đối.
