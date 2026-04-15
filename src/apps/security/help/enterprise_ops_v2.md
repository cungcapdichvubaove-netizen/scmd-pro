# SCMD Pro v2.0: Cẩm nang Vận hành Doanh nghiệp (Enterprise Operational Manual)

Tài liệu này được biên soạn bởi đội ngũ DevOps & Security Engineering của SCMD Pro, nhằm cung cấp cái nhìn chuyên sâu về các tính năng cốt lõi trong phiên bản 2.0 Production.

---

## 1. Hệ thống Chống Gian lận (Anti-Fraud Engine - The Watcher v2.0)

Hệ thống "The Watcher" là trái tim của giải pháp SCMD Pro, sử dụng AI để đảm bảo tính trung thực tuyệt đối của dữ liệu thực địa.

### Cơ chế Bảo mật Đa lớp:
*   **GPS Integrity Check**: Không chỉ kiểm tra tọa độ, hệ thống còn phân tích vận tốc di chuyển (Velocity) giữa các điểm. Nếu tốc độ vượt quá ngưỡng vật lý (ví dụ: >15m/s trong tòa nhà), hệ thống sẽ tự động đánh dấu "Nghi ngờ gian lận".
*   **Mock Location Detection**: Tự động phát hiện và chặn các ứng dụng giả lập GPS trên thiết bị Android/iOS.
*   **EXIF Metadata Analysis**: Khi nhân viên chụp ảnh báo cáo, AI sẽ kiểm tra siêu dữ liệu (Metadata) của ảnh để đảm bảo ảnh được chụp trực tiếp từ camera, không phải tải lên từ thư viện hoặc ảnh cũ.
*   **Behavioral Profiling**: AI nhận diện các mẫu hành vi "tuần tra máy móc" hoặc "nhảy cóc" dựa trên dữ liệu lịch sử của mục tiêu.

---

## 2. Chế độ Học tập Thực địa (Learning Mode)

Tính năng này cho phép Quản trị viên thiết lập các chỉ số chuẩn (Benchmarks) dựa trên thực tế vận hành tại từng mục tiêu cụ thể.

### Quy trình Thiết lập Benchmark:
1.  **Kích hoạt Learning Mode**: Admin trực tiếp đi thực địa và thực hiện quy trình tuần tra mẫu.
2.  **Ghi nhận Golden Benchmarks**:
    *   **Travel Time**: Thời gian di chuyển thực tế giữa các điểm (tính đến các yếu tố như chờ thang máy, đi qua các cửa an ninh).
    *   **Work Duration**: Thời gian tối thiểu cần thiết để hoàn thành checklist tại mỗi điểm.
3.  **Áp dụng AI**: Hệ thống sẽ sử dụng các con số này làm "ngưỡng chuẩn". Mọi lượt tuần tra của nhân viên có sai lệch quá lớn so với Benchmark sẽ bị hệ thống cảnh báo ngay lập tức.

---

## 3. Trung tâm Chỉ huy Đa doanh nghiệp (Super-Admin Dashboard)

Dành riêng cho các tập đoàn bảo vệ lớn quản lý nhiều chi nhánh hoặc khách hàng (Tenants).

### Các Module Quản trị Hệ thống:
*   **Tenant Isolation**: Mỗi khách hàng được cô lập dữ liệu hoàn toàn ở tầng Database Schema, đảm bảo an toàn thông tin tuyệt đối.
*   **Dynamic Provisioning**: Tự động khởi tạo môi trường mới cho khách hàng chỉ trong 60 giây (bao gồm DB, SSL, và cấu hình PWA).
*   **License Control**: Quản lý linh hoạt số lượng nhân sự (Guards) và các tính năng được kích hoạt (Feature Flags) theo gói hợp đồng.
*   **System Telemetry**: Theo dõi hiệu năng hệ thống, lưu lượng đồng bộ dữ liệu và trạng thái sức khỏe của các Worker xử lý tác vụ ngầm.

---

## 4. Quy trình Báo cáo & Đối soát (Audit-Ready Reporting)

Hệ thống báo cáo v2.0 được thiết kế để sẵn sàng cho các buổi kiểm toán an ninh khắt khe nhất.

*   **Trust Score (Chỉ số Tin cậy)**: Mỗi báo cáo PDF xuất ra đều kèm theo một điểm số từ 0-100. Điểm số này được AI tính toán dựa trên độ chính xác của GPS, thời gian thực hiện và tính nhất quán của dữ liệu.
*   **Cryptographic Signatures**: Dữ liệu báo cáo được ký số để đảm bảo không bị can thiệp sau khi đã gửi về máy chủ.
*   **Checklist Intelligence**: Hỗ trợ nhiều định dạng dữ liệu (Ảnh, Text, Toggle) với hướng dẫn chi tiết cho từng hạng mục, giúp giảm thiểu sai sót do con người.

---

> **Lưu ý từ Đội ngũ Kỹ thuật:**
> Hệ thống SCMD Pro v2.0 được tối ưu hóa cho môi trường Production với kiến trúc **Offline-first**. Mọi dữ liệu sẽ được bảo vệ an toàn ngay cả khi mất kết nối mạng hoàn toàn.

*Bản quyền thuộc về SCMD Pro Engineering Team - 2026.*
