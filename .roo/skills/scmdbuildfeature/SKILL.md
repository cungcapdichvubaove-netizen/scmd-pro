---
name: scmdbuildfeature
description: >-
  Dùng khi build hoặc implement feature mới cho SCMD PRO: thiết kế layer, data
  model, API, RBAC, Zod, audit log, queue job, và migration. Trigger khi người
  dùng nói "build", "implement", "thêm tính năng", "tạo API", "tạo màn hình mới",
  hoặc yêu cầu thiết kế một flow mới trong hệ thống.
---

# SCMD PRO — Build Feature

Luôn trả lời bằng **tiếng Việt**.

## Tư duy trước khi code

Trả lời 7 câu hỏi này trong đầu trước khi viết bất kỳ dòng code nào:

1. **Layer nào?** Domain / UseCase / Controller / Infra / UI
2. **Query DB?** → Tenant data dùng `db.forTenant()` / `db.withTenant()`. System data dùng `db.system()` chỉ cho Super Admin.
3. **Input từ user?** → Zod ở Controller + validation domain invariant ở UseCase/Entity.
4. **Cần RBAC?** → Mọi tenant API đều cần permission check.
5. **Cần audit log?** → create / update / status change / finalize / dispute / approve → phải log.
6. **Cần queue?** → PDF / AI / report nặng → BullMQ. Không chạy trong HTTP request.
7. **Ảnh hưởng plan/billing?** → Xác định feature flag hoặc plan tier.

---

## Contract-Compliance Flow

Feature mới phải fit vào trục này — không build flow HRM/ERP tách biệt:

```
Tenant
  └─► Vendor
        └─► Contract
              └─► Site ──► GuardPost
                    └─► Shift Requirement
                          └─► Assignment
                                ├─► Attendance
                                ├─► Patrol ──► PatrolLog (GPS/QR)
                                └─► Incident ──► Evidence
                                                    └─► ViolationEvent
                                                          └─► VendorScorecard
                                                                └─► MonthlyAcceptanceReport
```

---

## Implementation Rules

### Architecture
- Business logic → UseCase hoặc Domain Service
- Controller → thin: parse input, gọi UseCase, format output
- Repository → chỉ data access, không logic
- React component → không tính compliance rule

### Database
- Tenant-scoped table: luôn có `tenantId`, dùng `db.forTenant()`
- System table: chỉ Super Admin, dùng `db.system()`
- Không dùng `prisma.*` trực tiếp trong tenant flow
- Index bắt buộc: `(tenantId, date)`, `(tenantId, status)` trên bảng lớn

### Khi schema thay đổi
```
1. Tạo migration Prisma
2. Thêm tenantId nếu là bảng tenant-scoped
3. Thêm index cần thiết
4. Cập nhật rls_setup.sql
5. Cập nhật docs nếu behavior thay đổi
```

### Coding Standards
- TypeScript strict — không dùng `any`
- ESM import nội bộ phải có `.js` extension
- PostgreSQL là SSOT cho business data
- Firebase chỉ dùng cho realtime/evidence storage
- Không dùng `catch {}` — không nuốt lỗi im lặng
- Không break API contract mà không version

---

## Output Format

### 1. Feature Scope
Mô tả ngắn: feature làm gì, phục vụ ai, fit vào đâu trong contract-compliance flow.

### 2. Layer Design
```
Domain:      [entities/types mới hoặc thay đổi]
UseCase:     [use-case cần tạo/sửa]
Controller:  [endpoint API]
Repository:  [queries mới]
Infra:       [migration, queue job, external service]
UI:          [component, page, form]
```

### 3. Data Model Impact
- Bảng/field mới
- Migration cần thiết
- RLS update
- Index cần thêm

### 4. API/UseCase Design
```typescript
// Endpoint
POST /api/tenant/[resource]

// Input (Zod schema)
const schema = z.object({ ... });

// UseCase flow
1. Validate input
2. Check RBAC
3. Business logic
4. Persist
5. Audit log
6. Return
```

### 5. Security/RBAC/Zod
- Permission cần thiết
- Validation rule
- Ai không được làm gì

### 6. Implementation Patch
Code diff cụ thể, theo thứ tự từ Domain → UseCase → Controller → UI.

### 7. Test Plan
- Unit test cho business rule quan trọng
- Integration test cho API endpoint
- Scenario thủ công để verify

### 8. Post-change Checklist
- [ ] Migration chạy sạch trên staging
- [ ] RLS update nếu có bảng mới
- [ ] Audit log hoạt động
- [ ] RBAC test với các role khác nhau
- [ ] API contract không bị break
