# The Watcher AI: Hệ thống Giám sát & Chống gian lận

The Watcher AI là "bộ não" của SCMD, sử dụng trí tuệ nhân tạo để giám định tính trung thực của dữ liệu tuần tra và phát hiện các hành vi gian lận trong thời gian thực.

## 1. Chỉ số Tin cậy (Trust Score)
Mỗi lượt tuần tra được hệ thống chấm điểm dựa trên 3 yếu tố cốt lõi:
* **Tọa độ GPS**: Kiểm tra xem nhân viên có thực sự đứng tại điểm tuần tra hay không (sai số cho phép < 50m).
* **Tốc độ di chuyển (Velocity)**: Phát hiện các trường hợp di chuyển bất thường (ví dụ: đi xuyên tường hoặc di chuyển với tốc độ xe máy trong khu vực đi bộ).
* **Tính toàn vẹn thiết bị**: Phát hiện việc sử dụng các ứng dụng giả lập GPS (Fake GPS) hoặc can thiệp vào phần mềm.

## 2. Các loại Cảnh báo Bất thường (Anomalies)
Hệ thống sẽ tự động gửi cảnh báo về Dashboard của Admin khi phát hiện:
* **Critical (Nghiêm trọng)**: Phát hiện Fake GPS hoặc nhảy cóc điểm tuần tra (thời gian di chuyển giữa 2 điểm ngắn hơn 50% so với chuẩn).
* **Warning (Cảnh báo)**: Thời gian thực hiện Checklist quá nhanh so với Benchmark đã thiết lập.

## 3. Nhật ký An ninh Bất biến
Mọi dữ liệu tuần tra sau khi được xác thực sẽ được băm (hash) và lưu trữ vào nhật ký bất biến, đảm bảo không ai (kể cả Admin) có thể sửa đổi kết quả báo cáo sau khi đã gửi.

## 4. Cách xử lý Cảnh báo
Khi nhận được cảnh báo từ The Watcher:
1. Nhấn **"Xem vị trí"** để kiểm tra lộ trình di chuyển của nhân viên trên bản đồ.
2. Đối chiếu với hình ảnh hiện trường được gửi kèm trong báo cáo.
3. Nhấn **"Bỏ qua"** nếu xác định đó là sai số kỹ thuật khách quan, hoặc lập biên bản nếu xác định có hành vi gian lận.

---
*Tài liệu hướng dẫn nội bộ SCMD Pro - Cập nhật lần cuối: 11/04/2026*
