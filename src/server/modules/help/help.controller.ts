import { Request, Response } from 'express';

export class HelpController {
  static async getArticles(_req: Request, res: Response) {
    const articles = [
      {
        id: 'ta-4',
        title: 'Tối ưu hóa Hiệu năng hiển thị (Phiên bản v2.6.3)',
        category: 'Admin',
        content: `Hệ thống SCMD Pro vừa được cập nhật cấu trúc xử lý dữ liệu mới để loại bỏ hoàn toàn độ trễ khi tải trang.

### 1. Tốc độ khung hình (Real-time Feedback)
Hệ thống hiển thị Danh sách ưu tiên (Priorities) và Luồng sự cố (NOC Feed) đã được tối ưu để hoạt động thời gian thực nhưng không làm treo thiết bị dù có hàng trăm sự kiện diễn ra.

### 2. Tách biệt Chức năng (Component Isolation)
Các giao diện điều khiển (Quản lý Điểm, Nhân sự, Sự cố) được cô lập. Việc tìm kiếm hoặc tải dữ liệu ở một trang này không làm chậm trễ hay tải lại dữ liệu của các trang hiển thị khác.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-1',
        title: 'Tổng quan Trung tâm Chỉ huy (Command Center)',
        category: 'Admin',
        content: `Trung tâm Chỉ huy (Command Center) là trái tim của hệ thống SCMD Pro, cung cấp cái nhìn toàn cảnh và theo thời gian thực về tình hình an ninh.

### 1. Bản đồ Chiến thuật (Tactical Map)
- Hiển thị vị trí trực quan của tất cả các điểm tuần tra.
- **Màu xanh**: Điểm đang hoạt động bình thường.
- **Màu xám**: Điểm chưa đến giờ tuần tra.
- **Màu đỏ (Nhấp nháy)**: Điểm đang có sự cố (SOS) cần xử lý ngay lập tức.

### 2. Luồng Sự kiện (Live Feed)
- Cập nhật liên tục các hoạt động của nhân viên bảo vệ (check-in, quét QR, báo cáo).
- Các sự kiện quan trọng (CRITICAL) sẽ được đánh dấu nổi bật.

### 3. Danh sách Ưu tiên (Priorities)
- Gợi ý các công việc cần xử lý gấp dựa trên phân tích của AI (ví dụ: điểm tuần tra bị bỏ lỡ, khu vực có rủi ro cao).`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-2',
        title: 'Hệ thống Cảnh báo AI và Trust Score',
        category: 'Admin',
        content: `Hệ thống SCMD Pro tích hợp Trí tuệ Nhân tạo (AI) để tự động đánh giá và cảnh báo các rủi ro an ninh.

### 1. Điểm Tin cậy (Trust Score)
- Là chỉ số tổng hợp (từ 0-100) đánh giá mức độ an toàn của mục tiêu.
- Điểm số được tính toán dựa trên: Tỷ lệ hoàn thành tuần tra, thời gian phản hồi sự cố, và số lượng cảnh báo bất thường.
- **Mục tiêu**: Duy trì Trust Score trên 90 điểm (EXCELLENT).

### 2. Cảnh báo Bất thường (Anomalies)
AI liên tục phân tích dữ liệu tuần tra để phát hiện các hành vi bất thường:
- **Đứng yên quá lâu**: Nhân viên không di chuyển trong khoảng thời gian dài.
- **Sai lệch tuyến đường**: Nhân viên đi chệch khỏi tuyến đường đã được phân công.
- **Bỏ lỡ điểm quét**: Quá thời gian quy định nhưng chưa quét mã QR.

Khi có cảnh báo, hệ thống sẽ tự động thông báo cho Quản lý (Tenant Admin) để kịp thời xử lý.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-3',
        title: 'Quản lý Nhân sự và Phân quyền',
        category: 'Admin',
        content: `Hướng dẫn thêm mới và quản lý đội ngũ bảo vệ.

### 1. Thêm mới Nhân viên
1. Truy cập mục **Nhân sự** trên thanh menu.
2. Nhấn nút **+ Thêm nhân sự**.
3. Điền đầy đủ thông tin: Mã nhân viên, Họ tên, Tên đăng nhập.
4. Chọn vai trò: \`Guard\` (Bảo vệ) hoặc \`Tenant Admin\` (Quản lý).
5. Nhấn **Lưu**.

### 2. Theo dõi Chấm công
- Hệ thống tự động ghi nhận thời gian bắt đầu và kết thúc ca trực khi nhân viên đăng nhập/đăng xuất hoặc thực hiện quét QR lần đầu/lần cuối trong ngày.
- Quản lý có thể xem chi tiết tại tab **Chấm công**.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-4',
        title: 'Thiết lập Điểm tuần tra và Tuyến đường',
        category: 'Admin',
        content: `Để hệ thống hoạt động, bạn cần thiết lập các điểm quét QR và nhóm chúng thành các tuyến đường.

### 1. Tạo Điểm tuần tra (Checkpoint)
- Mỗi điểm tuần tra tương ứng với một mã QR duy nhất.
- Bạn cần nhập Tên điểm (VD: Hầm B1, Cổng chính) và Tọa độ (Lat/Lng) để hiển thị trên Bản đồ chiến thuật.
- Sau khi tạo, hệ thống sẽ tự động sinh mã QR. Bạn có thể in mã này và dán tại vị trí thực tế.

### 2. Tạo Tuyến đường (Route)
- Tuyến đường là tập hợp các điểm tuần tra theo một thứ tự nhất định.
- Bạn có thể thiết lập **Tần suất** (VD: 2 giờ/lần) và **Khung giờ** áp dụng.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-6',
        title: 'AI Watcher: Phân tích chi tiết Nhật ký (v3.4)',
        category: 'Admin',
        content: `Hệ thống v3.4 bổ sung tính năng "Phân tích AI" giúp Quản lý kiểm soát chất lượng tuần tra một cách tự động.

### 1. Cách sử dụng
- Tại tab **Lịch sử tuần tra**, nhấn vào nút **Kính lúp (AI)** bên cạnh mỗi bản ghi.
- AI sẽ mất khoảng 3-5 giây để phân tích toàn bộ dữ liệu của lượt tuần tra đó.

### 2. AI chấm điểm những gì?
- **Sai lệch GPS**: Tự động tính toán khoảng cách giữa vị trí bảo vệ quét mã và vị trí thực tế của điểm kiểm soát.
- **Tốc độ bất thường**: Cảnh báo nếu bảo vệ hoàn thành lượt tuần tra quá nhanh so với thực tế (vượt rào).
- **Tính xác thực**: Đánh giá các ghi chú và hình ảnh đính kèm để phát hiện gian lận.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-7',
        title: 'Cơ chế Leo thang SOS Tự động (Escalation)',
        category: 'Admin',
        content: `Nhằm đảm bảo không có tín hiệu cầu cứu nào bị bỏ sót, SCMD Pro v3.4 vận hành cơ chế leo thang tự động.

### Quy trình hoạt động
1. **Phát tín hiệu**: Bảo vệ nhấn nút SOS trên ứng dụng.
2. **Cảnh báo tức thì**: Toàn bộ Quản lý và Giám sát mục tiêu nhận thông báo qua App và Zalo.
3. **Tự động leo thang**: Nếu sau **5 phút** tín hiệu chưa được xác nhận "Đang xử lý", hệ thống sẽ tự động chuyển trạng thái thành **Escalated (Leo thang)** và gửi cảnh báo khẩn cấp cấp độ cao nhất đến toàn bộ ban chỉ huy.

### Lợi ích
- Đảm bảo phản ứng nhanh trong mọi tình huống khẩn cấp.
- Giám sát trách nhiệm của cấp quản lý trong việc hỗ trợ nhân viên hiện trường.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'ta-5',
        title: 'Nâng cấp kỹ thuật và Dịch vụ Export PDF',
        category: 'Admin',
        content: `Hệ thống SCMD Pro đã được nâng cấp mạnh mẽ vào phiên bản 2.6.1 để mang đến trải nghiệm ổn định nhất:

### Xuất Báo cáo tự động (PDF/Excel)
- Tốc độ xuất báo cáo PDF đã nhanh hơn gấp nhiều lần nhờ công nghệ render PDF Service độc lập (tách biệt nền tảng).
- **Lưu ý**: Dịch vụ có giới hạn an toàn để đảm bảo tính sẵn sàng (5 lần xuất / phút). Bạn có thể thử lại sau vài giây nếu bị gián đoạn.

### Duy trì phiên đăng nhập (Session)
- Phiên bản mới đã cải tiến tính năng tự động duy trì kết nối. Khi thao tác của bạn dài hơn so với thiết lập thời gian mặc định, ứng dụng sẽ tự động làm mới token ngầm mà không gây cản trở công việc.`
      },
      {
        id: 'g-1',
        title: 'Hướng dẫn Quét mã QR Tuần tra',
        category: 'Guard',
        content: `Quy trình thực hiện tuần tra chuẩn dành cho nhân viên bảo vệ.

### Các bước thực hiện:
1. Đăng nhập vào ứng dụng SCMD bằng tài khoản được cấp.
2. Di chuyển đến vị trí có dán mã QR (Điểm tuần tra).
3. Mở tính năng **Quét QR** trên ứng dụng.
4. Hướng camera vào mã QR.
5. Nếu hệ thống yêu cầu, hãy chụp một bức ảnh hiện trạng hoặc nhập ghi chú (nếu có sự cố nhỏ).
6. Nhấn **Xác nhận**. Hệ thống sẽ thông báo "Quét thành công".

### Lưu ý:
- Phải bật Dịch vụ định vị (GPS) trên điện thoại để hệ thống xác thực vị trí.
- Nếu quét mã QR ở khoảng cách quá xa so với tọa độ gốc, hệ thống sẽ cảnh báo.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'g-2',
        title: 'Quy trình Báo cáo Sự cố (SOS)',
        category: 'Guard',
        content: `Trong trường hợp khẩn cấp, nhân viên bảo vệ cần kích hoạt báo động SOS ngay lập tức.

### Cách kích hoạt SOS:
1. Nhấn giữ nút **SOS** màu đỏ trên màn hình chính của ứng dụng trong 3 giây.
2. Hệ thống sẽ tự động:
   - Gửi cảnh báo khẩn cấp (kèm tọa độ hiện tại) về Trung tâm Chỉ huy (NOC).
   - Phát âm thanh báo động trên thiết bị của Quản lý.
   - Ghi lại toàn bộ sự kiện vào Nhật ký sự cố.

### Khi nào nên dùng SOS?
- Phát hiện cháy nổ.
- Có kẻ gian đột nhập, trộm cắp.
- Xung đột, ẩu đả gây mất an ninh trật tự.
- Tai nạn nghiêm trọng cần cấp cứu.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gen-1',
        title: 'Bảo mật Tài khoản và Đăng nhập',
        category: 'General',
        content: `Hướng dẫn bảo vệ tài khoản của bạn trên hệ thống SCMD Pro.

### 1. Đăng nhập
- Sử dụng Tên đăng nhập (hoặc Mã nhân viên) và Mật khẩu được cấp.
- Không chia sẻ tài khoản cho bất kỳ ai, kể cả đồng nghiệp.

### 2. Đổi mật khẩu
- Khuyến nghị đổi mật khẩu ngay trong lần đăng nhập đầu tiên.
- Mật khẩu nên có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.

### 3. Xử lý khi quên mật khẩu
- Nhân viên bảo vệ (Guard): Vui lòng liên hệ Quản lý mục tiêu (Tenant Admin) để được cấp lại mật khẩu.
- Quản lý mục tiêu: Sử dụng tính năng "Quên mật khẩu" trên màn hình đăng nhập hoặc liên hệ đội ngũ Hỗ trợ SCMD.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gen-2',
        title: 'Bảo mật Thời gian thực (Active Invalidation)',
        category: 'General',
        content: `Nhằm tăng cường bảo mật cho doanh nghiệp, SCMD Pro v3.4 áp dụng cơ chế vô hiệu hóa phiên bản đăng nhập ngay lập tức.

### Cơ chế hoạt động
- Khi Quản lý thay đổi trạng thái của doanh nghiệp (Tạm ngưng) hoặc thay đổi quyền hạn của nhân viên, hệ thống sẽ **xóa bộ nhớ đệm (cache)** ngay lập tức.
- Tất cả các thiết bị đang đăng nhập sẽ bị đẩy ra ngoài hoặc yêu cầu xác thực lại trong vòng tối đa 5 phút (Thay vì 60 phút như trước đây).

### Lợi ích
- Đảm bảo nhân sự đã nghỉ việc hoặc doanh nghiệp đã ngừng hợp tác không thể truy cập dữ liệu quan trọng ngay khi lệnh cấm được ban hành.`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gen-3',
        title: 'Giám sát và Chẩn đoán lỗi (Observability)',
        category: 'General',
        content: `SCMD Pro v3.4 tích hợp hệ thống giám sát toàn diện giúp đội ngũ kỹ thuật phát hiện và xử lý lỗi ngay lập tức.

### Tính năng Tracking
- Mọi tác vụ từ lúc bảo vệ quét mã đến khi báo cáo xuất hiện đều được gắn một mã định danh (**traceId**).
- Hệ thống tự động ghi nhận độ trễ và các điểm nghẽn cổ chai (nếu có).

### Ý nghĩa với Doanh nghiệp
- Giảm thiểu thời gian gián đoạn dịch vụ.
- Minh bạch hóa quá trình xử lý dữ liệu và cam kết SLA (Service Level Agreement).`,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'gen-4',
        title: 'Tích hợp Thông báo Zalo OA',
        category: 'General',
        content: `Hệ thống SCMD Pro v3.4 hỗ trợ gửi thông báo tự động qua **Zalo Official Account** để tăng tính khẩn cấp và tiết kiệm chi phí.

### Các loại thông báo
- **Leo thang SOS**: Gửi tin nhắn trực tiếp đến Giám sát khi tín hiệu SOS không được xử lý kịp thời.
- **Báo cáo sự cố**: Thông báo ngay lập tức cho các bên liên quan khi có sự cố nghiêm trọng.
- **Check-in/Check-out**: Nhật ký điểm danh hàng ngày được gửi tóm tắt cho quản lý.

### Cách thức hoạt động
Hệ thống sử dụng số điện thoại nhân sự đã đăng ký để khớp với tài khoản Zalo. Đảm bảo nhân sự đã quan tâm Zalo OA của doanh nghiệp để nhận được tin nhắn.`,
        lastUpdated: new Date().toISOString()
      }
    ];
    res.json(articles);
  }
}
