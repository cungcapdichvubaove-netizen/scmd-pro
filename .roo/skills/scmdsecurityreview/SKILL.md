---
name: scmdsecurityreview
description: >-
  Review bảo mật SCMD PRO: tenant isolation, RLS, RBAC, Zod validation, output
  sanitization, Firebase rules, và audit trail. Dùng khi người dùng hỏi về "bảo
  mật", "security", "lỗ hổng", "tenant leak", "cross-tenant", "authentication",
  "authorization", "RLS", "RBAC", hoặc trước bất kỳ release nào ảnh hưởng data
  nhạy cảm.
---

# SCMD PRO — Security Review

Luôn trả lời bằng **tiếng Việt**.

## Tư duy bảo mật

**Zero Trust:** Mọi input từ user đều hostile cho đến khi được validate.
**Tenant Isolation là tuyệt đối:** Data của tenant A không bao giờ xuất hiện ở tenant B — dù là bug hay edge case.
**Defense in depth:** RBAC ở middleware + business rule ở UseCase + RLS ở DB — không chỉ một tầng.

---

## Kiểm tra theo mức độ ưu tiên

### 🔴 P0 — Tenant Isolation (Data Breach)

Đây là lỗ hổng nguy hiểm nhất. Kiểm tra kỹ:

```typescript
// ❌ Lỗi nghiêm trọng — query không có tenant scope
const incidents = await prisma.incident.findMany({ where: { status: 'open' } });

// ✅ Đúng — tenant context bắt buộc
const incidents = await db.forTenant(tenantId).incident.findMany({ where: { status: 'open' } });
```

Checklist:
- [ ] Không có `prisma.*` trực tiếp trong tenant flow
- [ ] `tenantId` lấy từ server context (JWT/session), không từ client payload/query param
- [ ] `db.system()` chỉ được dùng trong Super Admin flow
- [ ] RLS được setup đúng trong `rls_setup.sql` cho tất cả tenant-scoped table

**Bảng cần có RLS:** staff, checkpoints, patrol_logs, incidents, tasks, audit_logs, violations, contracts, sites, assignments, attendance, scorecards, acceptance_reports — và bất kỳ bảng mới nào tenant-scoped.

### 🔴 P0 — Authentication & Authorization

- [ ] JWT verify đúng (không accept unsigned/expired token)
- [ ] RBAC check có trên mọi tenant endpoint
- [ ] Permission check dùng server-side role, không client claim

**RBAC boundary quan trọng:**
| Actor | Không được làm |
|---|---|
| TENANT_ADMIN | Truy cập SUPER_ADMIN data |
| Vendor Representative | Approve/waive vi phạm của Vendor mình |
| Guard | Đóng incident nghiêm trọng (trừ khi config rõ ràng) |
| Site Supervisor | Xem data của Site khác trong cùng tenant |

### 🟠 P1 — Input Validation

```typescript
// ✅ Zod ở Controller — reject input nguy hiểm sớm nhất
const schema = z.object({
  vendorId: z.string().uuid(),
  startDate: z.string().datetime(),
  amount: z.number().positive().max(1_000_000),
});

// ✅ Domain invariant ở UseCase/Entity — enforce business rule
if (contract.endDate <= contract.startDate) throw new DomainError('Invalid contract period');
```

- [ ] Zod validation tại Controller (không chỉ TypeScript type)
- [ ] Domain invariant tại UseCase/Entity
- [ ] Reject unknown field khi cần (`z.object({}).strict()`)
- [ ] Số tiền, ngày tháng, UUID đều được validate đúng format

### 🟠 P1 — Output Sanitization

API response không được chứa:
- [ ] Password hash
- [ ] JWT / refresh token
- [ ] Stack trace (`message` OK, `stack` không)
- [ ] Internal file path
- [ ] Raw Prisma error (expose schema)
- [ ] Secret / env variable
- [ ] Internal user ID của tenant khác

```typescript
// ❌ Nguy hiểm
catch (e) { res.json({ error: e.message, stack: e.stack }); }

// ✅ An toàn
catch (e) { 
  logger.error(e);
  res.status(500).json({ error: 'Internal server error', traceId });
}
```

### 🟠 P1 — Firebase Security

Firebase không phải SSOT cho business data. Firestore rules phải có:
- [ ] Auth check (user phải đăng nhập)
- [ ] tenantId match (chỉ đọc data của tenant mình)
- [ ] Role check (guard không đọc admin data)
- [ ] Schema validation (đúng field, đúng type)
- [ ] Rate limit (không bị abuse)
- [ ] Data size limit (không upload file >X MB)
- [ ] Field whitelist (không write field không mong đợi)
- [ ] Audit trail cho sensitive write

### 🟡 P2 — Audit Trail

Các action sau phải có audit log với: `actorId`, `tenantId`, `traceId`, `entity`, `action`, `timestamp`, `before`/`after` (nếu cần):

- create/update/delete entity quan trọng
- status change (approve, reject, finalize, dispute)
- RBAC change (cấp/thu hồi quyền)
- Export data
- Login thất bại nhiều lần

### 🟡 P2 — Infrastructure Security

- [ ] CORS chỉ allow domain cần thiết
- [ ] Rate limit trên auth endpoint và heavy endpoint
- [ ] JWT secret đủ mạnh, khác nhau giữa staging và production
- [ ] Database URL có SSL mode phù hợp
- [ ] Redis có auth

---

## Output Format

Với mỗi vấn đề phát hiện:

```
[Severity: P0/P1/P2]
Vulnerability: Tên ngắn gọn
Location: file:dòng hoặc component/endpoint
Exploit scenario: Ai có thể làm gì, gây ra hậu quả gì
Root cause: Tại sao lỗ hổng này tồn tại
Minimal safe fix: Code thay đổi cụ thể
Verification: Cách kiểm tra fix đã hoạt động
```

Kết thúc bằng **Security Score** tổng thể và danh sách ưu tiên fix.
