# SCMD Pro — Cleanup Instructions
## Version: 2.5.1 | Date: 2026-05-18

---

## Phần A: XÓA STAGING ARTIFACTS (chạy trong PowerShell tại D:\scmdpro\)

### Các thư mục staging cần xóa
```powershell
# Xóa toàn bộ thư mục patch/fix artifacts không còn cần thiết
Remove-Item -Recurse -Force "D:\scmdpro\fix"
Remove-Item -Recurse -Force "D:\scmdpro\patch"
Remove-Item -Recurse -Force "D:\scmdpro\project"
Remove-Item -Recurse -Force "D:\scmdpro\scmd_fix_v3"
Remove-Item -Recurse -Force "D:\scmdpro\scmd_patch"
Remove-Item -Recurse -Force "D:\scmdpro\scmd_patch_final"
```

### Các file root-level loose cần xóa
```powershell
# Các bản copy lẻ không thuộc cấu trúc src/
Remove-Item -Force "D:\scmdpro\domain.error.ts"
Remove-Item -Force "D:\scmdpro\login.use-case.ts"
Remove-Item -Force "D:\scmdpro\StaffCardList.tsx"
Remove-Item -Force "D:\scmdpro\StaffTable.tsx"
Remove-Item -Force "D:\scmdpro\PATCH_README.txt"
```

### Verify sau khi xóa
```powershell
# Phải trả về rỗng
Get-ChildItem "D:\scmdpro" -Directory | Where-Object { $_.Name -in @('fix','patch','project','scmd_fix_v3','scmd_patch','scmd_patch_final') }
```

---

## Phần B: DEPLOY 3 FILE ĐÃ CLEANUP DEAD CODE

Thay 3 file sau (dead code `bypassIsolation_SYSTEM_ONLY` đã được xóa khỏi args):

```powershell
# Copy từ thư mục cleanup vào src/
Copy-Item "src\server\core\auth\jwt.auth.provider.ts"                     "D:\scmdpro\src\server\core\auth\jwt.auth.provider.ts" -Force
Copy-Item "src\server\core\use-cases\auth\refresh-token.use-case.ts"      "D:\scmdpro\src\server\core\use-cases\auth\refresh-token.use-case.ts" -Force
Copy-Item "src\server\modules\tenant\application\get-me.usecase.ts"       "D:\scmdpro\src\server\modules\tenant\application\get-me.usecase.ts" -Force
```

### Verify dead code đã xóa
```powershell
# Phải trả về rỗng (không còn inline injection trong args)
Select-String -Path "D:\scmdpro\src\server\core\auth\jwt.auth.provider.ts" -Pattern "bypassIsolation_SYSTEM_ONLY"
Select-String -Path "D:\scmdpro\src\server\core\use-cases\auth\refresh-token.use-case.ts" -Pattern "bypassIsolation_SYSTEM_ONLY"
Select-String -Path "D:\scmdpro\src\server\modules\tenant\application\get-me.usecase.ts" -Pattern "bypassIsolation_SYSTEM_ONLY"
```

---

## Phần C: RESET

```powershell
D:\scmdpro\Reset-Desktop.bat
```

---

## GHI CHÚ KỸ THUẬT

**Tại sao xóa bypassIsolation_SYSTEM_ONLY khỏi args?**

Sau Patch v4.50.0-p4, `db.withTenant('SYSTEM', ...)` tự động kích hoạt `systemBypassContext`
(AsyncLocalStorage) trước khi gọi `operation(tx)`. `isolationGuard.$allOperations` đọc context
này qua `systemBypassContext.getStore() === true` → `isBypass = true` → cho phép unscoped query.

Flag `bypassIsolation_SYSTEM_ONLY` trong args không còn cần thiết khi đã ở trong
`withTenant('SYSTEM')` context. `createTenantClient` cũng đã có guard strip flag này nếu
ai vô tình inject vào tenant client.

**Giữ nguyên trong prisma.ts:**
`args?.bypassIsolation_SYSTEM_ONLY === true` trong `isolationGuard` được GIỮ LẠI làm
fallback defense-in-depth và để `db.systemBypass()` vẫn hoạt động cho cross-tenant
reputation checks (`StaffRepository.checkReputation`, `getInternalExportData`).
