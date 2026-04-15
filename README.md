# SCMD Pro - Strategic Command System

Hệ thống quản lý an ninh và tuần tra thông minh dành cho các doanh nghiệp bảo vệ chuyên nghiệp.

## Bản đồ & Tọa độ (Leaflet.js & OSM)

Chúng tôi đã chuyển đổi từ Google Maps sang **Leaflet.js** kết hợp với **OpenStreetMap (OSM)** để tối ưu hóa chi phí vận hành trong giai đoạn phát triển và đảm bảo tính riêng tư của dữ liệu.

### Ưu điểm:
- **Tiết kiệm chi phí**: Không tốn phí API Google Maps.
- **Tùy biến cao**: Áp dụng Navy Theme (Dark Mode) trực tiếp qua CSS filters.
- **Hiệu suất**: Tải bản đồ nhanh, mượt mà trên các thiết bị di động (Thumb-first UI).
- **Độc lập**: Sử dụng công thức Haversine nội bộ để tính toán khoảng cách, không phụ thuộc vào bên thứ ba.

### Chống gian lận (Anti-fraud):
Hệ thống tự động hậu kiểm tọa độ thực tế của nhân viên so với điểm Benchmark. Nếu sai lệch vượt quá **50m**, hệ thống sẽ tự động gắn cờ cảnh báo (Suspicious Flag).

## Cấu trúc dự án
- `apps/core/application/services/geo_utils.py`: Chứa logic tính toán tọa độ chuẩn.
- `src/apps/security/interfaces/components/TacticalMap.tsx`: Giao diện bản đồ Leaflet.
- `src/shared/utils/geo.ts`: Tiện ích địa lý cho Frontend/Node.js.

## Triển khai
Sử dụng Docker Compose để chạy toàn bộ hệ thống (Postgres, Redis, Django/Node).
