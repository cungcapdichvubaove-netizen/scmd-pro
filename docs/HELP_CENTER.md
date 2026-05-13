# SCMD Pro - Help Center (Manual & Troubleshooting)

Chào mừng bạn đến với trung tâm hỗ trợ của SCMD Pro. Tài liệu này hướng dẫn các quản trị viên và vận hành viên cách kiểm soát và khắc phục sự cố hệ thống.

---

## 1. Giám sát & Truy cập (Monitoring & Access)

### Cài đặt ứng dụng vào điện thoại (PWA)
SCMD Pro hiện đã hỗ trợ công nghệ PWA (Progressive Web App):
1. **iOS**: Mở trình duyệt Safari -> Chọn nút `Share` -> Chọn `Thêm vào màn hình chính (Add to Home Screen)`.
2. **Android**: Mở trình duyệt Chrome -> Nhấn vào thông báo `Cài đặt ứng dụng` hoặc chọn `Cài đặt` trong menu trình duyệt.
*Sau khi cài đặt, bạn có thể mở SCMD Pro như một ứng dụng độc lập với tốc độ tải nhanh hơn và hỗ trợ một phần ngoại tuyến.*

### Làm thế nào để biết hệ thống đang "khỏe"?
-   **API Status**: Truy cập `/api/health` hoặc dashboard của Google Cloud Run để kiểm tra uptime.
-   **Tracing (Phân tích kịch bản)**: Nếu bạn thấy một request bị chậm, hãy tìm `trace_id` trong nhật ký log hoặc bảng Audit Log. Sử dụng ID này trên Grafana/Jaeger để xem điểm nghẽn nằm ở đâu (DB, Redis hay AI).

### Giám sát Hàng đợi (Queue Monitoring)
Super Admin giờ đây có thể truy cập `/api/admin/queues` để theo dõi hiệu năng của các worker:
-   **Heavy Queue**: Giám sát các tác vụ phân tích AI và xuất PDF.
-   **Light Queue**: Giám sát việc gửi thông báo và webhook.
-   *Mẹo*: Nếu hàng đợi có nhiều job bị "Failed", hãy kiểm tra nhật ký lỗi để xác định nguyên nhân (thường do AI bị timeout hoặc lỗi mạng).

### Hỗ trợ Đa ngôn ngữ (Internationalization)
Hệ thống hỗ trợ đa ngôn ngữ. Bạn có thể thay đổi hiển thị (VI/EN) trong ứng dụng. Mọi chuỗi mới đều được quản lý tập trung để sẵn sàng cho thị trường quốc tế.

---

## 2. Hệ thống AI "The Watcher"

### Tại sao báo cáo AI lại ghi "CHỜ DUYỆT THỦ CÔNG"?
Đây là tính năng bảo vệ hệ thống (**Resilience**). Khi dịch vụ AI của Google gặp sự cố hoặc quá tải:
1.  Hệ thống sẽ "ngắt cầu dao" (Circuit Breaker) để không làm treo Server.
2.  Kết quả phân tích sẽ trả về thông báo: `⚠️ Hệ thống AI đang tạm nghỉ để bảo trì`.
3.  **Hành động của bạn**: Bạn cần xem xét báo cáo này bằng mắt thường. Khi dịch vụ AI ổn định lại (thường sau 1-2 phút), hệ thống sẽ tự động kết nối lại.

---

## 3. Quản lý Tenant & Bảo mật

### Dữ liệu giữa các công ty có bị lộ không?
-   **Câu trả lời**: Không. SCMD Pro sử dụng công nghệ **FORCE ROW LEVEL SECURITY** ở tầng sâu nhất của Database. Ngay cả khi mã nguồn có lỗi, Database vẫn sẽ chặn mọi nỗ lực truy cập dữ liệu không thuộc về `tenant_id` của bạn.

### Tại sao tôi không thể đăng ký dùng thử lần nữa?
-   **Quy định**: Để tránh lạm dụng, mỗi Email và Số điện thoại chỉ được đăng ký dùng thử 1 lần mỗi 90 ngày. Hệ thống sử dụng cơ chế khóa nguyên tử (Atomic Lock) để đảm bảo quy định này.

### Phải làm gì khi một tài khoản quản trị bị đánh cắp?
1.  Vào Dashboard quản trị -> Tăng `tokenVersion` của nhân viên đó.
2.  Thay đổi quyền hạn hoặc vô hiệu hóa tài khoản.
3.  Hệ thống sẽ ngay lập tức hủy toàn bộ các phiên đăng nhập hiện có (vì sai Token Version).

---

### Làm thế nào để thay đổi gói cước (Plan) cho Tenant?
-   **Quy trình**: Truy cập Dashboard Super Admin -> Danh sách Tenant -> Tìm Tenant cần chuyển đổi -> Nhấn nút `SET PRO` hoặc `SET FREE`.
-   **Lưu ý**: Khi một Tenant được chuyển sang **PRO**, các giới hạn về tính năng (như AI Insights, Report Export nâng cao) sẽ tự động mở khóa trong phiên làm việc tiếp theo của người dùng thuộc Tenant đó.

---

## 4. Quản lý Vận hành & Sự cố

### Quy trình xử lý sự cố 4 bước
Mọi sự cố ghi nhận qua App của Bảo vệ/Kỹ thuật giờ đây tuân thủ vòng đời:
1.  **Báo cáo**: Nhân viên gửi tin qua App (Trường `reportedAt` được ghi nhận).
2.  **Tiếp nhận**: Admin/Supervisor chọn người xử lý (Trạng thái -> `investigating`).
3.  **Xử lý**: Người được giao cập nhật hiện trạng, chụp ảnh bằng chứng và viết biên bản. (Trạng thái -> `resolved`).
4.  **Nghiệm thu**: Admin kiểm tra kết quả và đóng sự cố (Trạng thái -> `closed`).
*Dựa trên vòng đời này, Dashboard sẽ tính chỉ số **MTTR** - giúp bạn biết được đội ngũ mất trung bình bao lâu để giải quyết 1 vấn đề.*

### Sử dụng bộ lọc Sự cố (Incident Filters)
Trong trang Quản lý sự cố, bạn có thể nhanh chóng tìm các vấn đề khẩn cấp bằng cách:
-   **Lọc mức độ**: Chọn `Khẩn` để xử lý ngay các vụ việc nghiêm trọng.
-   **Lọc thời gian**: Xem các sự cố chỉ trong `Hôm nay` hoặc `7 ngày` vừa qua để tránh bị quá tải thông tin.
-   **Sắp xếp**: Chuyển đổi giữa `Mới nhất` hoặc `Cũ nhất` để ưu tiên các tồn đọng lâu ngày.

### Thực hiện Kiểm tra đột xuất (Surprise Audit)
Khi có mặt tại mục tiêu, bạn có thể thực hiện Audit để "Test" năng lực nhà thầu:
1.  Vào Tab `Kiểm tra đột xuất`.
2.  Thực hiện Checklist (Đạt/Không đạt).
3.  Ghi chú sai phạm nếu có.
4.  Điểm Audit sẽ được tính vào điểm Compliance của nhà thầu đó trong tháng hiện tại.

---

## 5. Đánh giá Nhà thầu (Vendor Ranking)

### Tại sao một nhà thầu bị xếp hạng "Nguy cơ"?
SCMD Pro không chỉ nhìn vào tháng hiện tại. Hệ thống sử dụng **Weighted Score (Trọng số tích lũy)** 12 tháng:
-   Tháng gần nhất chiếm trọng số lớn nhất.
-   Nếu điểm trung bình < 70, nhà thầu bị gắn nhãn `AT_RISK`.
-   Giám đốc nên xem xét báo cáo này trước khi quyết định tái ký hợp đồng.

---

## 6. Liên hệ hỗ trợ
-   **Email**: support@scmdpro.com
-   **Hotline**: +84 123 456 789
-   **Technical Support**: dev-ops@scmdpro.com


## 4. Khắc phục sự cố Docker & Triển khai

### Lỗi `EROFS: Read-only file system`
Tránh mount `/app` read-only mà không tạo anonymous volume cho `node_modules`.
