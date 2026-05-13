# SCMD Pro - Enterprise Demo Seeder Architecture

Kiến trúc Seeder được thiết kế cho SCMD Pro nhằm mục tiêu hỗ trợ E2E Testing, Local Development và Stress Testing với dữ liệu Business-ready, có ý nghĩa và hoàn toàn clean.

## Features (Tính Năng)
1. **Đa luồng dữ liệu (Tiers):**
   - **Minimal:** Chỉ sinh dữ liệu hệ thống (Super Admin, Global Configs). Dùng cho production bootstrapping.
   - **Standard:** Sinh hệ thống dữ liệu "Demo" hoàn chỉnh (Tenant Vinhomes, An Hội) với Roles, Checkpoints, Incidents thực tế, Staffs, v.v.
   - **Stress:** Sinh hàng ngàn Record (Checkpoints, Patrol Logs) để kiểm thử Transaction Load, Graph Scaling.

2. **Idempotency & Clean:**
   - Hệ thống không tạo trùng lặp nếu chạy lại script. 
   - Tích hợp cờ `--reset` tự động Drop/Truncate CSDL an toàn (bảo vệ cấu trúc migrations).

3. **Zero-Hardcode & PostGIS Supported:**
   - Tự động sinh Toạ độ GPS theo công thức Haversine Center Point.
   - Inject Database RAW Query để xử lý Native PostGIS Point cho Checkpoints.

---

## 🛠 Cách Sử Dụng (Quick Start)

Các script đã được tích hợp sẵn vào `package.json`. Chạy thông qua `npm run`. Trước khi seed, luôn đảm bảo Docker Desktop and PostgreSQL đang chạy thông qua `docker-compose.dev.yml`.

### 1. Minimal Seed (Hệ thống tối thiểu)
Chỉ boot config và Super Admin.
```bash
npm run db:seed
```

### 2. Standard Demo Seed (Quy mô vừa, Demo Client)
Sinh dữ liệu đầy đủ cho 2 Tenants + Hoạch định thời gian chuẩn.
```bash
npm run db:seed:demo
```

### 3. Snapshot Reset Seed (Reset toàn bộ DB và Seed lại)
CẢNH BÁO: Lệnh này sẽ truncate toàn bộ dữ liệu trong bảng public (Trừ lịch sử migration). Chỉ định dùng cho Dev/Docker.
```bash
npm run db:seed:reset
```

### 4. Stress Load Seed (Kiểm định Load-Balancing / Optimizations)
```bash
npm run db:seed:stress
```

---

## Cấu Trúc Thư Mục
* `index.ts`: The Seeder Bootstrapper CLI.
* `config.ts`: Chứa hằng số (Passwords, ID tĩnh).
* `utils/`: Cleaner, Random Generators (IdNumber, VN_Names, Coords), Colored Logger.
* `tiers/`: Thư mục chứa Logic Seed chuyên biệt cho từng Tier.

## Quyết Định Kiến Trúc (Architecture Decisions)
- Không dùng **Faker.js** để giảm dependency size, tận dụng hàm Random Generator gọn nhẹ thuần Việt (Vietnamese Names).
- **Tránh Prisma N+1 Timeout:** Trong môi trường Stress, áp dụng `createMany` thay đổi Batches 1000 records.
- Sử dụng cơ chế TRUNCATE CASCADE an toàn bỏ qua `_prisma_migrations`, giúp tiết kiệm hàng chục phút so với việc Drop toàn bộ container DB hoặc Prisma `deleteMany()`.
