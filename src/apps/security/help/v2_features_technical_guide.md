# Cẩm Nang Vận Hành Hệ Thống SCMD Pro v2.0.0

## 1. Hệ Thống Chống Gian Lận (Anti-Fraud Engine)
Hệ thống **The Watcher v2.0** được thiết kế để bảo vệ tính toàn vẹn của dữ liệu tuần tra thông qua các lớp xác thực đa tầng:

*   **Xác thực Tọa độ Đa điểm (Multi-point GPS Validation):** Không chỉ kiểm tra vị trí tại thời điểm quét QR, hệ thống phân tích quỹ đạo di chuyển giữa các điểm để phát hiện việc sử dụng ứng dụng "Fake GPS".
*   **Phân tích Vận tốc (Velocity Analysis):** Cảnh báo ngay lập tức nếu nhân viên di chuyển với tốc độ bất thường (>15km/h trong khu vực đi bộ).
*   **Chống Tiêm dữ liệu (Anti-Injection):** Kiểm tra siêu dữ liệu (Metadata) của hình ảnh báo cáo để đảm bảo ảnh được chụp trực tiếp từ camera, không phải tải lên từ thư viện.

## 2. Chế Độ Học Máy (Learning Mode)
Đây là tính năng đột phá cho phép AI thích nghi với môi trường thực tế của từng mục tiêu:

*   **Thiết lập Điểm chuẩn (Golden Benchmarks):** Quản trị viên có thể kích hoạt Learning Mode trong 7 ngày đầu tiên để AI thu thập dữ liệu về thời gian di chuyển trung bình giữa các tầng, các khu vực khuất sóng.
*   **Tự động Điều chỉnh Ngưỡng (Auto-thresholding):** Sau giai đoạn học, AI sẽ tự động thiết lập các ngưỡng cảnh báo (Thresholds) phù hợp, giảm thiểu báo động giả (False Positives) do các yếu tố khách quan như thang máy chậm hoặc vật cản sóng.

## 3. Bảng Điều Khiển Quản Trị Cấp Cao (Super-Admin Dashboard)
Dành cho các đơn vị quản lý chuỗi hoặc nhiều chi nhánh (Multi-tenancy):

*   **Trung tâm Chỉ huy Toàn cầu (Global NOC):** Theo dõi trạng thái an ninh của tất cả các mục tiêu trên một bản đồ duy nhất.
*   **Quản lý Tài nguyên Tập trung:** Phân bổ nhân sự và thiết bị giữa các chi nhánh một cách linh hoạt.
*   **Phân tích Hiệu suất So sánh:** So sánh chỉ số tin cậy (Trust Score) giữa các đội bảo vệ để đưa ra quyết định khen thưởng hoặc đào tạo lại.

---
*Tài liệu này được biên soạn bởi đội ngũ DevOps SCMD. Mọi thay đổi cấu hình hệ thống cần được phê duyệt bởi Technical Lead.*
