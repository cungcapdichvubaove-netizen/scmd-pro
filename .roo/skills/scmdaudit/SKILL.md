---
name: scmdaudit
description: >-
  Audit toàn diện codebase SCMD PRO: phát hiện bug tiềm ẩn, vi phạm kiến trúc,
  lỗ hổng bảo mật, vấn đề hiệu năng, và product-fit. Dùng khi người dùng yêu cầu
  "audit", "review toàn bộ", "kiểm tra trước release", "tìm điểm yếu", hoặc muốn
  đánh giá sức khỏe tổng thể của một module/feature/PR.
---

# SCMD PRO — Comprehensive Audit

Luôn trả lời bằng **tiếng Việt**.

## Mục tiêu

Audit là một lần quét có cấu trúc để lộ ra rủi ro ẩn trước khi chúng thành bug
thật. Mỗi phát hiện phải có: vị trí cụ thể, tác động thực tế, và sửa đề xuất.
Không liệt kê vấn đề trừu tượng — chỉ những gì có thể hành động được.

---

## Phạm vi Audit

Xác định phạm vi trước khi bắt đầu:
- **Module audit:** một feature/domain cụ thể
- **PR audit:** diff thay đổi trước merge
- **Pre-release audit:** toàn bộ critical path trước deploy
- **Security audit:** tập trung vào attack surface

---

## Checklist Audit theo Layer

### Layer 1 — Domain & Business Logic

- [ ] Business rule có nằm đúng trong Domain/UseCase không?
- [ ] Không có domain entity nào import Prisma/Redis/HTTP trực tiếp
- [ ] Invariant được enforce tại entity (không chỉ tại controller)
- [ ] Contract/SLA/Violation rule nhất quán giữa các use-case

### Layer 2 — API & Controller

- [ ] Mọi endpoint tenant đều có `db.forTenant()` / `db.withTenant()`
- [ ] Zod validation có ở input (không chỉ TypeScript type)
- [ ] RBAC check có trước khi truy cập data
- [ ] Controller không chứa business logic (thin controller)
- [ ] Error response không leak stack trace / internal message

### Layer 3 — Database & Prisma

- [ ] Không có `prisma.*` trực tiếp trong tenant flow
- [ ] tenantId được enforce từ context (không từ client payload)
- [ ] RLS cập nhật cho bảng mới tenant-scoped
- [ ] Index đủ cho tenantId + date + status trên bảng lớn
- [ ] Transaction đúng boundary (không split transaction quan trọng)

### Layer 4 — Security

- [ ] Không có cross-tenant data leak
- [ ] Vendor Representative không tự approve vi phạm của mình
- [ ] Guard không đóng incident nghiêm trọng nếu không được phép
- [ ] Firebase không là SSOT cho compliance data
- [ ] Không có secret/env trong code

### Layer 5 — Async & Runtime

- [ ] Heavy job (PDF, AI, report) đi qua BullMQ — không chạy trong request
- [ ] Socket.io emit sau khi commit (không emit rồi mới commit)
- [ ] Không có missing `await` dẫn đến race condition
- [ ] Worker có error handler và dead-letter queue

### Layer 6 — Frontend

- [ ] Compliance rule không tính ở React component
- [ ] Không dùng mock/hardcoded data trong production flow
- [ ] Empty/loading/error state rõ ràng
- [ ] Không có sensitive data trong console.log / localStorage

### Layer 7 — Product Fit

- [ ] Flow theo đúng trục: Tenant → Vendor → Contract → Site → SLA
- [ ] Attendance/Patrol/Incident link về Contract và ViolationEvent
- [ ] MonthlyAcceptanceReport có đủ evidence trail
- [ ] VendorScorecard tính từ ViolationEvent (không tính lại từ đầu)

---

## Mức độ nghiêm trọng

| Level | Ý nghĩa | Ví dụ |
|---|---|---|
| 🔴 **P0 — Blocker** | Bug/security trong production ngay | Cross-tenant data leak |
| 🟠 **P1 — Critical** | Sẽ gây bug dưới load/edge case | Missing await trong transaction |
| 🟡 **P2 — Important** | Kỹ thuật nợ ảnh hưởng maintainability | God Service > 500 dòng |
| 🔵 **P3 — Nice-to-have** | Cải thiện không bắt buộc | Thiếu index nhỏ |

---

## Output Format

### Tóm tắt Audit
```
Phạm vi: [module/PR/feature]
Phát hiện: X P0 · Y P1 · Z P2 · W P3
Verdict: 🔴 Không deploy / 🟠 Deploy cẩn thận / ✅ Sẵn sàng
```

### Chi tiết từng phát hiện
```
[P0] Tên vấn đề ngắn gọn
Vị trí: src/server/.../file.ts:L42
Vấn đề: Mô tả cụ thể điều gì đang sai
Tác động: Điều gì xảy ra nếu không fix (user-facing hoặc data corruption)
Sửa đề xuất: Code diff hoặc hướng dẫn cụ thể
```

### Kết luận & Ưu tiên sửa
Danh sách theo thứ tự: fix P0 trước, P1 sau, P2/P3 có thể để backlog.
