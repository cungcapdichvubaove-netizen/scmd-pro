---
name: scmdfixbug
description: >-
  Dùng khi fix bug, resolve lỗi, patch flow bị hỏng, hoặc sửa behavior sai trong
  SCMD PRO. Trigger khi người dùng nói "bug", "lỗi", "không hoạt động", "crash",
  "fix", "sai kết quả", "500 error", hoặc paste stack trace / error message.
---

# SCMD PRO — Fix Bug

Luôn trả lời bằng **tiếng Việt**.

## Nguyên tắc cốt lõi

**Root cause first.** Đừng patch triệu chứng — tìm và fix nguyên nhân thật.
**Minimal diff.** 1 bug = 1 focused fix. Không refactor thêm trong khi đang fix bug.
**Preserve invariants.** Fix không được phá tenant isolation, RBAC, hay API contract.

---

## Debug Protocol (bắt buộc theo thứ tự)

### Bước 1 — Trace execution flow

```
HTTP Request
  → Route (method, path, middleware)
  → Auth middleware (JWT verify, tenant extract)
  → RBAC middleware (permission check)
  → Controller (parse, validate Zod)
  → UseCase (business logic)
  → Repository (query builder)
  → DB / External Service
  → Response
```

Xác định bug nằm ở tầng nào trong flow này.

### Bước 2 — Tái hiện bug

Cần xác định đủ 6 yếu tố:

| Yếu tố | Câu hỏi |
|---|---|
| **Endpoint/Component** | Route nào? Màn hình nào? |
| **Input/Payload** | Dữ liệu đầu vào cụ thể? |
| **Role** | Guard / Supervisor / Admin / Vendor / Super Admin? |
| **Tenant context** | tenantId cụ thể? Hay mọi tenant? |
| **Expected** | Hành vi đúng phải là gì? |
| **Actual** | Hành vi thực tế (error message, sai data, crash)? |

### Bước 3 — Xác định root cause

Checklist nguyên nhân thường gặp trong SCMD PRO:

**Tenant/Data:**
- [ ] Missing `tenantId` trong query
- [ ] RLS chưa cập nhật cho bảng mới
- [ ] `prisma.*` thay vì `db.forTenant()`
- [ ] tenantId lấy từ client payload thay vì server context

**Auth/Permission:**
- [ ] Missing RBAC check
- [ ] Sai role mapping
- [ ] JWT expired không được handle

**Async/Transaction:**
- [ ] Missing `await`
- [ ] Race condition (emit trước commit)
- [ ] Transaction boundary sai (2 operation cần atomic nhưng tách rời)
- [ ] BullMQ job không có error handler

**Validation:**
- [ ] Missing Zod validation → crash với input lạ
- [ ] Domain invariant không được enforce

**Import/Runtime:**
- [ ] ESM import thiếu `.js` → runtime crash
- [ ] Circular import → undefined at runtime

**Business Logic:**
- [ ] API contract bị break (field đổi tên, status khác)
- [ ] Logic tính toán sai (penalty, scorecard, SLA)

### Bước 4 — Minimal fix

```
Quy tắc:
✅ Fix đúng vào nguyên nhân
✅ Thay đổi ít file nhất có thể
✅ Không đổi API shape/status code trừ khi cần thiết và versioned
❌ Không refactor file không liên quan
❌ Không catch {} nuốt lỗi
❌ Không return null để che giấu root cause
❌ Không thêm fallback mask bug thật
❌ Không guess business logic — hỏi nếu không chắc
```

### Bước 5 — Verify invariants sau fix

- [ ] Tenant isolation vẫn đảm bảo
- [ ] RBAC vẫn hoạt động đúng
- [ ] Zod validation vẫn có
- [ ] API contract không bị break
- [ ] Không leak sensitive data
- [ ] Không tạo race condition mới
- [ ] Socket.io emit vẫn sau commit

---

## Output Format

### Root Cause
Mô tả chính xác vấn đề là gì, tại sao nó xảy ra, tầng nào trong flow.

### Minimal Fix
Giải thích cách fix và tại sao đây là cách an toàn nhất.

### Patch / Code Changes
```diff
// File: src/server/.../file.ts
- dòng cũ sai
+ dòng mới đúng
```

Chỉ include file thực sự cần thay đổi.

### Tại sao fix này an toàn
- Invariant nào được bảo toàn
- Không phá gì

### Regression Risks
Những gì có thể bị ảnh hưởng — cần test lại.

### Test Commands
```bash
# Lệnh cụ thể để verify fix hoạt động
```

### Manual Verification Scenario
Các bước cụ thể để test thủ công end-to-end.
