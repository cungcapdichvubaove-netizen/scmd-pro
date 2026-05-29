# SCMD Pro — Hướng dẫn Setup & Chạy

## Cấu trúc file trong gói fix này

```
scmd-fix/
├── Dockerfile                          ← FIX #1: thêm COPY dist-backend/
├── docker-compose.yml                  ← FIX #2: secrets từ .env, migrate deploy, nginx
├── nginx.conf                          ← FIX #3: proxy_pass đến 'app' (không phải 'api')
├── redis.conf                          ← Redis runtime template, không chứa password
├── .env                                ← FIX #5: template secrets (CẦN điền thật)
├── .gitignore                          ← bảo vệ .env khỏi bị commit
├── scripts/
│   └── docker-entrypoint.sh           ← migration fallback thông minh
├── prisma/
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260426000000_init/
│           └── migration.sql          ← FIX #6: migrate deploy thay db push
└── src/server/core/middleware/
    └── rate-limit.middleware.ts        ← FIX #7: rate-limit-redis v4 signature
```

---

## Bước 1 — Giải nén và đè lên project

```bash
# Giải nén file zip vào thư mục project hiện tại
# Đè lên tất cả file trùng tên — an toàn, không mất source code
unzip scmd-fix.zip -d /path/to/your/project/ -o
```

Hoặc copy thủ công từng file nếu muốn kiểm soát.

---

## Bước 2 — Cấu hình secrets (BẮT BUỘC)

Mở file `.env` và điền các giá trị thật:

```bash
# Tạo JWT secrets mạnh (chạy 2 lần để có 2 secret khác nhau):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Điền vào .env:
#   JWT_SECRET=<kết quả lần 1>
#   JWT_REFRESH_SECRET=<kết quả lần 2>
#   POSTGRES_PASSWORD=<mật khẩu DB mạnh>
#   REDIS_PASSWORD=<mật khẩu Redis mạnh>
```

**Lưu ý quan trọng:** production không có mật khẩu mặc định; bắt buộc điền `REDIS_PASSWORD` và các secret trước khi chạy.

---

## Bước 3 — Chạy lần đầu

```bash
# Tại thư mục root của project:

# Xóa containers và volumes cũ (nếu đã chạy trước)
docker compose down -v

# Build lại image và khởi động
docker compose up --build

# Hoặc chạy background:
docker compose up --build -d
```

**Quá trình khởi động sẽ:**
1. Build Docker image (~3-5 phút lần đầu)
2. Khởi động PostgreSQL + Redis
3. Chờ DB healthy → chạy `prisma migrate deploy`
4. Chạy Node.js server
5. Nginx reverse proxy sẵn sàng

---

## Bước 4 — Truy cập

| URL | Mô tả |
|-----|-------|
| `http://localhost` | Frontend (qua Nginx port 80) |
| `http://localhost:80` | Tương đương |
| `http://localhost:3000` | Direct Node.js (bypass nginx) |
| `http://localhost/api/health` | Health check endpoint |

---

## Kiểm tra logs nếu có lỗi

```bash
# Logs của từng service:
docker compose logs app      # Node.js server
docker compose logs db       # PostgreSQL
docker compose logs redis    # Redis
docker compose logs nginx    # Nginx

# Theo dõi real-time:
docker compose logs -f app

# Kiểm tra trạng thái containers:
docker compose ps
```

---

## Lỗi thường gặp và cách fix

### Trang trắng vẫn còn
```bash
# Kiểm tra dist-backend/ có trong container chưa:
docker exec scmd_app ls -la /app/dist-backend/

# Nếu không có → image chưa được rebuild:
docker compose down
docker compose up --build
```

### Lỗi migration
```bash
# Reset hoàn toàn (MẤT DỮ LIỆU — chỉ dùng khi dev):
docker compose down -v
docker compose up --build

# Chỉ chạy lại migration (không rebuild):
docker exec scmd_app npx prisma migrate deploy
```

### CORS error trên browser
```bash
# Mở .env, thêm domain của bạn vào ALLOWED_ORIGINS:
ALLOWED_ORIGINS=http://localhost,http://localhost:80,https://yourdomain.com
docker compose restart app
```

### Redis AUTH failed
```bash
# Đảm bảo REDIS_PASSWORD được set trong .env trước khi chạy production compose.
# Sau khi sửa:
docker compose down
docker compose up --build
```

---

## Chuẩn bị cho Production thực tế (Cloud)

1. **SSL/HTTPS**: Thêm Let's Encrypt cert vào nginx.conf và uncomment SSL lines trong docker-compose.yml
2. **Domain**: Cập nhật `ALLOWED_ORIGINS` và `server_name` trong nginx.conf
3. **Secrets**: Dùng Docker Secrets hoặc cloud secret manager thay .env file
4. **OTEL**: Đặt `OTEL_SDK_DISABLED=false` và cấu hình `OTEL_EXPORTER_OTLP_ENDPOINT`
5. **PWA Icons**: Thay URLs `picsum.photos` trong `vite.config.ts` bằng icon thật
6. **Gemini AI**: Điền `GEMINI_API_KEY` thật để kích hoạt The Watcher


## Cấu hình Cloudinary (Media Storage)

Để hệ thống lưu trữ ảnh chụp (Evidence) trong quá trình tuần tra, cần cấu hình Cloudinary trong file :



Giá trị này sẽ được  nạp làm cấu hình mặc định (tại ), hoặc bạn có thể cấu hình từ giao diện Superadmin. Nút tải ảnh () tại Giao diện Tuần tra sẽ gọi đến  để lưu vào Cloudinary bằng các key này.


## Cấu hình Cloudinary (Media Storage)

Để hệ thống lưu trữ ảnh chụp (Evidence) trong quá trình tuần tra, cần cấu hình Cloudinary trong file `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Giá trị này sẽ được `seed.ts` nạp làm cấu hình mặc định (tại `STORAGE_CONFIG`), hoặc bạn có thể cấu hình từ giao diện Superadmin. Giao diện tải ảnh chụp tuần tra (`takePhoto`) sẽ gọi đến `/api/tenant/patrol/upload-photo` và sử dụng Cloudinary.
