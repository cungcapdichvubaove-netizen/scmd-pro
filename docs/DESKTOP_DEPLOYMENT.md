# TÀI LIỆU TRIỂN KHAI THỬ NGHIỆM DOCKER DESKTOP (V.4.33.33)

Tài liệu này hướng dẫn cách deploy hệ thống SCMD Pro lên Docker Desktop để chạy thử nghiệm, QA hoặc demo nội bộ mà không cần cài đặt dependencies cục bộ (Node, Postgres, Redis).

## 1. Cấu trúc Triển khai (Docker Compose)
Chúng ta thiết kế Multi-container App bao gồm 3 services chính chạy chung 1 mạng lưới:
- `scmd-desktop-db`: PostgreSQL 15, lưu trữ dữ liệu chính.
- `scmd-desktop-redis`: Redis 7, xử lý cache, BullMQ (background jobs).
- `scmd-desktop-app`: Ứng dụng tích hợp All-in-One (Cả Frontend React và Backend Express + Microservice PDF Puppeteer tích hợp).

## 2. Kiến trúc Image (Dockerfile.desktop)
Sử dụng Multi-stage build để tối ưu:
- **Stage 1 (Builder):** Cài đầy đủ `devDependencies`, build Frontend (Vite) ra thư mục `dist` và Backend ra `dist-server`.
- **Stage 2 (Runner):** Alpine Linux siêu nhẹ. Cài các thư viện hệ thống cần thiết cho Puppeteer (`nss`, `freetype`, `chromium`), bỏ qua Chromium download của NPM để tiết kiệm 300MB+. Chạy bằng non-root user `node` để tăng bảo mật.

## 3. Hướng dẫn chạy trên Docker Desktop

### Bước 1: Chuẩn bị
Đảm bảo đã cài đặt và bật [Docker Desktop](https://www.docker.com/products/docker-desktop).

### Bước 2: Build và Khởi động
Mở Terminal tại thư mục gốc của dự án và chạy lệnh:
```bash
docker compose -f docker-compose.desktop.yml up -d --build
```

### Bước 3: Theo dõi trạng thái
- Mở giao diện **Docker Desktop** -> Quản lý mục **Containers**, bạn sẽ thấy stack `scmd-desktop`.
- Chờ đến khi container `scmd-desktop-app` chuyển sang trạng thái "Running" (Khoảng 30 giây đến 1 phút ở lần đầu do cần khởi tạo DB).
- Khởi tạo Database (Lần đầu tiên):
  Vào terminal của container app (hoặc qua giao diện Desktop) chạy:
  ```bash
  docker exec -it scmd-desktop-app npx prisma migrate deploy
  ```

### Bước 4: Truy cập Ứng dụng
- Mở trình duyệt web truy cập: [http://localhost:3000](http://localhost:3000)
- Mọi thay đổi dữ liệu sẽ được map thẳng vào các Docker Volume (`scmd_local_pgdata`), giúp dữ liệu không bị mất đi khi tắt container.

## 4. Tắt/Dọn dẹp hệ thống
Khi test xong, bạn có thể tắt bằng lệnh:
```bash
docker compose -f docker-compose.desktop.yml down
```
*(Nếu muốn xóa sạch data test để làm lại từ đầu: thêm cờ `-v` vào cuối lệnh tắt).*
