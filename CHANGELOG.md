# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-04-11

### 🚀 Tính năng & Động cơ Cốt lõi (Core Engine)
- **Chế độ Học Máy (Learning Mode - AI Field Training)**: 
  - Triển khai cơ chế phản hồi "Human-in-the-loop" (HITL) cho phép AI học hỏi từ các tình huống thực tế.
  - Cho phép Giám sát viên thiết lập "Điểm chuẩn Vàng" (Golden Benchmarks) về thời gian di chuyển và thời lượng kiểm tra tại thực địa.
  - Mô hình AI tự thích nghi với các hạn chế môi trường đặc thù (ví dụ: độ trễ thang máy cao tầng, sơ đồ tầng hầm phức tạp).
- **Động cơ Chống Gian lận (Anti-Fraud Engine - The Watcher v2.0)**: 
  - **Kiểm tra Toàn vẹn GPS Nâng cao**: Xác thực đa lớp bao gồm phân tích vận tốc, tính nhất quán của tín hiệu và phát hiện các trình giả lập vị trí (Mock Location).
  - **Xác thực Sinh trắc học & Siêu dữ liệu**: Tích hợp phân tích dữ liệu EXIF cho hình ảnh để ngăn chặn các cuộc tấn công "Gallery Injection".
  - **Phát hiện Bất thường Hành vi**: Nhận diện thời gian thực các mẫu tuần tra phi thực tế bằng phân tích chuỗi thời gian (Time-series analysis).
- **Bảng điều khiển Quản trị Cấp cao (Super-Admin Dashboard - Multi-Tenant NOC)**: 
  - **Trung tâm Chỉ huy Toàn cầu (Global NOC)**: Chế độ xem hợp nhất cho tất cả các Tenant, theo dõi sức khỏe hệ thống và các cảnh báo an ninh trọng yếu.
  - **Cấp phát Tài nguyên Tự động (Automated Provisioning)**: Quy trình triển khai "Zero-touch" cho Tenant mới, bao gồm cô lập Schema cơ sở dữ liệu và tự động tạo chứng chỉ SSL.
  - **Quản lý Vòng đời Thuê bao**: Tự động hóa quy trình thanh toán, phân tầng dựa trên mức độ sử dụng và kiểm soát tính năng qua Feature-flags.
- **Bộ Công cụ Báo cáo Doanh nghiệp (Enterprise Reporting Suite)**:
  - **Động cơ PDF Độ phân giải cao**: Tạo báo cáo sẵn sàng cho kiểm toán ở phía Server với chữ ký số bảo mật tính toàn vẹn dữ liệu.
  - **Tích hợp Chỉ số Tin cậy (Trust Score)**: Mọi báo cáo hiện bao gồm điểm số tin cậy do AI tạo ra (0-100) dựa trên các chỉ số toàn vẹn dữ liệu.

### 🛠 Kỹ thuật & Hạ tầng (DevOps Perspective)
- **Kiến trúc**: Chuyển đổi sang kiến trúc PWA Full-stack (Express + Vite) để tối ưu hiệu năng và khả năng hoạt động ngoại tuyến (Offline-first).
- **Cô lập Dữ liệu**: Thắt chặt cô lập Multi-tenant ở cấp độ cơ sở dữ liệu bằng cách sử dụng `AsyncLocalStorage` để xử lý ngữ cảnh yêu cầu an toàn.
- **PWA Sync v2**: Tối ưu hóa đồng bộ hóa nền bằng Workbox và IndexedDB, giảm 40% tiêu thụ dữ liệu và cải thiện tuổi thọ pin thiết bị.
- **Bảo mật**: Rà soát toàn diện các Quy tắc Bảo mật Firestore (RBAC) và triển khai xác thực Schema nghiêm ngặt cho tất cả các thao tác ghi dữ liệu.

### 🐛 Sửa lỗi (Bug Fixes)
- Khắc phục lỗi Race Condition nghiêm trọng trong module quét mã QR gây ra lỗi "Invalid Token" ngẫu nhiên.
- Xử lý triệt để vấn đề rò rỉ `tenant_id` trong các gói tin đồng bộ nền khi chuyển đổi phiên làm việc giữa các Tenant.
- Điều chỉnh lỗi hiển thị bản đồ chiến thuật trên các màn hình siêu rộng (Ultra-wide 21:9).
- Khắc phục rò rỉ bộ nhớ trong luồng dữ liệu NOC thời gian thực khi có lượng cảnh báo lớn đột biến.

---

## [1.5.0] - 2026-03-20
- Initial PWA support and basic patrol tracking.
- Basic multi-tenancy implementation.
