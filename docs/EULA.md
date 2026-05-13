# SCMD Pro - Thỏa Thuận Cấp Phép Người Dùng Cuối & Điều Khoản SaaS (EULA / SaaS Terms)

**Cập nhật lần cuối:** 20-04-2026
**Phạm vi áp dụng:** Hệ thống SCMD Pro (Security Company Management Dashboard)

Thỏa thuận này là hợp đồng pháp lý giữa Bạn (sau đây gọi là "Khách hàng" hoặc "Tenant") và Đơn vị phát triển SCMD Pro (sau đây gọi là "Nhà cung cấp"). Bằng việc truy cập hoặc sử dụng hệ thống SCMD Pro, Khách hàng đồng ý tuân thủ tuyệt đối các điều khoản dưới đây.

---

## 1. Cấp Phép Sử Dụng (License Grant)
Với điều kiện Khách hàng tuân thủ hoàn toàn Thỏa thuận này và hoàn tất các nghĩa vụ thanh toán (nếu có), Nhà cung cấp cấp cho Khách hàng một quyền truy cập (license) có thời hạn, không độc quyền, không thể chuyển nhượng, và không được cấp phép lại, nhằm mục đích sử dụng Hệ thống SCMD Pro dưới dạng Dịch vụ Phần mềm (SaaS) phục vụ riêng cho hoạt động quản lý an ninh nội bộ của Khách hàng.

## 2. Các Hành Vi Bị Nghiêm Cấm (Strict Restrictions)
Hệ thống SCMD Pro được bảo vệ bởi luật sở hữu trí tuệ và các cơ chế bảo mật Enterprise (Zero-Trust, RLS). Khách hàng **TUYỆT ĐỐI KHÔNG ĐƯỢC** (và không được phép để bất kỳ bên thứ ba nào) thực hiện các hành vi sau:

### 2.1. Cấm Dịch Ngược (No Reverse Engineering)
- Không được phép dịch ngược (reverse engineer), biên dịch ngược (decompile), tháo gỡ (disassemble), hoặc bằng bất kỳ cách nào cố gắng phá vỡ mã hóa để trích xuất mã nguồn, object code, cấu trúc cơ sở dữ liệu cốt lõi, hay thuật toán của Hệ thống SCMD Pro.
- Cấm mọi hành vi rà quét lỗ hổng, khai thác kiến trúc cô lập dữ liệu (Row-Level Security), hoặc tiêm nhiễm mã/dữ liệu độc hại vào hệ thống.

### 2.2. Cấm Sao Chép, Bán Lại & Thương mại hóa chéo (No Copying or Resale)
- Dịch vụ được cung cấp đích danh cho Khách hàng. Không được sao chép, nhân bản, bán lại (resale), cho thuê, phân phối, hoặc cấp phép phụ (sublicense) Hệ thống, toàn bộ hay một phần, cho bất kỳ bên nào khác.
- Nghiêm cấm việc tái đóng gói (repackage) hoặc sử dụng SCMD Pro để cung cấp một dịch vụ cạnh tranh (White-labeling trái phép), hoặc sử dụng dưới hình thức một "Service Bureau".

## 3. Giới Hạn Khách Thuê (Tenant-based Usage Limits)
SCMD Pro được thiết kế theo kiến trúc Đa khách thuê (Multi-Tenancy). Quyền sử dụng được ràng buộc chặt chẽ theo môi trường được cấp phát:

### 3.1. Giới hạn trên một (01) Pháp nhân (Entity Isolation)
- Mỗi không gian làm việc (Tenant Workspace) chỉ được sử dụng cho **MỘT (01) công ty/tổ chức duy nhất** đã đăng ký lúc onboarding. 
- Khách hàng không được phép dùng chung (pool/share) Tenant của mình để quản lý chéo nhân sự hoặc mục tiêu bảo vệ của các Công ty con, Công ty đối tác, hoặc Pháp nhân không liên đới mà chưa mua thêm giấy phép độc lập (Separate Tenant License).

### 3.2. Trách nhiệm Kiểm soát Truy cập nội bộ
- Khách hàng chịu trách nhiệm 100% trong việc cấp phát quyền (RBAC) nội bộ (ví dụ: cấp quyền `tenant-admin`, `supervisor`, `guard`).
- Nhà cung cấp sẽ không chịu trách nhiệm nếu dữ liệu bị thay đổi, lộ lọt phát sinh từ việc Khách hàng thao tác sai phân quyền nội bộ hoặc để lộ thông tin đăng nhập.

## 4. Chấm Dứt Dịch Vụ
Nhà cung cấp có quyền đình chỉ (Suspend) hoặc chấm dứt hoàn toàn (Terminate) quyền truy cập của Khách hàng ngay lập tức và không cần báo trước nếu phát hiện có sự vi phạm nghiêm trọng vào mục **2 (Hành vi bị cấm)** hoặc mục **3 (Giới hạn khách thuê)**. 

## 5. Từ Chối Bảo Đảm & Giới Hạn Trách Nhiệm
- Dịch vụ được cung cấp theo nguyên trạng ("AS IS"). Nhà cung cấp không đảm bảo hệ thống sẽ hoạt động không gián đoạn hoặc hoàn toàn không có lỗi kỹ thuật (zero-bugs), mặc dù luôn duy trì cam kết SLA ở mức cao nhất có thể.
- Trong mọi trường hợp, sự bồi thường tối đa của Nhà cung cấp (nếu có) sẽ không vượt quá tổng số tiền Khách hàng đã thanh toán cho Dịch vụ trong mười hai (12) tháng gần nhất tạo nên nền tảng của khiếu nại.
