# Trung tâm Trợ giúp SCMD Pro (v2.0 Production)

Chào mừng bạn đến với hệ thống quản lý an ninh thông minh SCMD Pro. Tài liệu này cung cấp hướng dẫn chi tiết cho các vai trò khác nhau trong hệ thống.

---

## 1. Dành cho Nhân viên Tuần tra (PWA)

### Cài đặt Ứng dụng (A2HS)
SCMD Pro hoạt động như một Progressive Web App (PWA), mang lại trải nghiệm mượt mà như ứng dụng bản địa mà không cần thông qua App Store:
1. Truy cập URL ứng dụng trên trình duyệt di động (Chrome/Safari).
2. Nhấn vào biểu tượng **Chia sẻ/Menu** và chọn **"Thêm vào màn hình chính" (Add to Home Screen)**.
3. Mở ứng dụng từ màn hình chính để kích hoạt chế độ toàn màn hình và tối ưu hóa hiệu suất.

### Quy trình Tuần tra Thông minh
- **Quét QR**: Sử dụng nút quét tại trung tâm màn hình (Thumb-first). Hệ thống sẽ tự động xác thực vị trí GPS.
- **Checklist Chi tiết**: Nhấn vào biểu tượng **[?]** bên cạnh mỗi nhiệm vụ để xem hướng dẫn cụ thể, mô tả và định dạng yêu cầu từ quản lý.
- **Chế độ Ngoại tuyến (Offline Mode)**: 
  - Dữ liệu được lưu an toàn vào bộ nhớ thiết bị (IndexedDB) khi mất kết nối.
  - Trạng thái **OFFLINE** sẽ hiển thị rõ ràng. Bạn vẫn có thể tiếp tục công việc bình thường.
  - Nhấn **"GỬI BÁO CÁO"** khi có mạng trở lại để đồng bộ dữ liệu lên máy chủ.

---

## 2. Dành cho Quản trị viên (Tenant Admin)

### Quản lý Mục tiêu & Triển khai QR
- **Thiết lập**: Tạo các điểm tuần tra với tọa độ GPS chính xác để AI có thể kiểm định tính trung thực.
- **In ấn chuyên nghiệp**: Sử dụng chức năng **In mã QR** để xuất bản các nhãn dán có thương hiệu SCMD, sẵn sàng dán tại thực địa.

### Smart Reporting & AI Analytics
- **Báo cáo PDF**: Xuất báo cáo chi tiết cho từng ca trực hoặc mục tiêu. Báo cáo bao gồm đầy đủ dữ liệu checklist và bằng chứng hình ảnh.
- **Anti-Fraud Engine**: Theo dõi chỉ số **Trust Score**. AI sẽ cảnh báo nếu phát hiện dấu hiệu giả lập GPS, sử dụng ảnh cũ hoặc tuần tra quá nhanh so với thực tế.
- **Learning Mode**: Nếu AI cảnh báo sai, bạn có thể "huấn luyện" lại bằng cách xác nhận các trường hợp đặc thù tại mục tiêu.

---

## 3. Triết lý Think Zero
Chúng tôi cam kết mang lại một hệ thống với tiêu chuẩn:
- **Zero Data Loss**: Bảo vệ dữ liệu tuyệt đối với kiến trúc Offline-first.
- **Zero Fraud**: Loại bỏ hoàn toàn gian lận nhờ công nghệ Watcher AI.
- **Zero Delay**: Tối ưu hóa tốc độ tác nghiệp với giao diện Thumb-first.

*Để được hỗ trợ kỹ thuật chuyên sâu, vui lòng liên hệ đội ngũ DevOps của SCMD Pro.*
