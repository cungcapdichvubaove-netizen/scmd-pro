# Security Specification & TDD (SCMD Pro Firestore)

## 1. Data Invariants
- Một `PatrolLog` không thể tồn tại nếu không có `tenantId` và `staffId` hợp lệ.
- Một `Incident` (Sự cố) phải có `checkpointId` thuộc cùng một `tenantId` với người tạo.
- Nhân viên (`Staff`) chỉ được phép đọc dữ liệu thuộc `tenantId` của mình.
- Dữ liệu nhạy cảm (PII) như email/số điện thoại chỉ chủ sở hữu hoặc admin tenant mới được đọc.

## 2. The Dirty Dozen (Payloads to Block)

### Identity Spoofing
1. **L1: Remote Identity Theft** - Thử tạo `PatrolLog` với `staffId` của người khác.
   ```json
   { "staffId": "victim_uid", "tenantId": "my_tenant", "status": "completed" }
   ```
2. **L2: Cross-Tenant Injection** - Thử tạo `Checkpoint` cho `tenantId` khác mà mình không thuộc về.
   ```json
   { "tenantId": "competitor_tenant", "name": "Hack Point" }
   ```

### State Shortcutting
3. **L3: Illegal Termination** - Thử cập nhật trạng thái sự cố trực tiếp thành 'resolved' mà không qua quy trình.
   ```json
   { "status": "resolved" }
   ```

### Integrity & Resource Poisoning
4. **L4: Bomb ID** - Sử dụng ID tài liệu cực lớn (1MB string) để gây quá tải.
5. **L5: Shadow Fields** - Thêm trường `isVerified: true` vào tài liệu `Staff` để leo thang đặc quyền.
   ```json
   { "name": "John", "isVerified": true }
   ```
6. **L6: Type Mismatch** - Gửi tọa độ `latitude` dưới dạng `string` thay vì `number`.
   ```json
   { "latitude": "10.0", "longitude": 20.0 }
   ```

### PII Leakage
7. **L7: Bulk Staff Scraping** - Thử đọc danh sách toàn bộ `Staff` (list operation) mà không có filter `tenantId`.
8. **L8: Profile Snooping** - Đọc `Staff` profile của người khác trong cùng một tenant (nếu không phải manager/admin).

### Denial of Wallet
9. **L9: Recursive Query** - Thực hiện truy vấn không giới hạn số lượng tài liệu.
10. **L10: Deep Path Injection** - Thử viết vào đường dẫn rác `/checkpoints/garbage/sub/data`.

### Email Spoofing
11. **L11: Unverified Superadmin** - Đăng nhập với email của admin nhưng `email_verified: false` và cố gắng truy cập `/tenants`.
12. **L12: Role Ghosting** - Gửi `role: "admin"` trong payload `createStaff` khi người gửi chỉ là "guard".

## 3. Test Runner (Draft)
Xem `firestore.rules.test.ts` để biết chi tiết thực thi.
