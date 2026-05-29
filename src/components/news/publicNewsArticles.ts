export interface PublicNewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  thumbnail: string;
  category: string;
  author: string;
  publishedAt: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
}

export const PUBLIC_NEWS_ARTICLES: PublicNewsArticle[] = [
  {
    id: "news-ai-watchdog-2-0",
    title: "AI Watchdog 2.0: giám sát tuần tra bảo vệ bằng AI cho tòa nhà và khu đô thị",
    slug: "scmd-pro-ai-watchdog-2-0",
    excerpt:
      "AI Watchdog 2.0 giúp đội vận hành phát hiện bất thường tuần tra, sai lệch GPS và rủi ro SLA theo thời gian thực trong SCMD Pro.",
    seoTitle: "AI Watchdog 2.0 cho quản lý tuần tra bảo vệ | SCMD Pro",
    seoDescription:
      "Tìm hiểu AI Watchdog 2.0 của SCMD Pro: phân tích ca trực, phát hiện gian lận GPS, cảnh báo rủi ro SLA và tối ưu lịch tuần tra bảo vệ.",
    thumbnail:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&h=675&auto=format&fit=crop",
    category: "Tính năng",
    author: "SCMD Pro Team",
    publishedAt: "2026-05-20",
    tags: ["AI Watchdog", "tuần tra bảo vệ", "GPS", "SLA vận hành"],
    content: `# AI Watchdog 2.0 trong SCMD Pro là gì?

AI Watchdog 2.0 là lớp phân tích thông minh của SCMD Pro dành cho nghiệp vụ quản lý bảo vệ, tuần tra an ninh và vận hành hiện trường. Thay vì chỉ ghi nhận log sau khi ca trực kết thúc, hệ thống liên tục đối chiếu dữ liệu GPS, checkpoint QR, thời gian phản hồi sự cố và lịch phân công để phát hiện rủi ro ngay trong ca.

## Bài toán vận hành

Các ban quản lý tòa nhà, khu đô thị, nhà máy và chuỗi bán lẻ thường gặp 4 vấn đề lớn: nhân sự quét điểm không đúng vị trí, bỏ lượt tuần tra, phản hồi sự cố chậm và thiếu dữ liệu khách quan khi đánh giá chất lượng dịch vụ bảo vệ.

Với AI Watchdog 2.0, SCMD Pro chuyển dữ liệu vận hành thành tín hiệu kiểm soát rủi ro:

- Phát hiện đường đi bất thường so với tuyến tuần tra đã cấu hình.
- Cảnh báo checkpoint có GPS lệch quá ngưỡng cho phép.
- Nhận diện ca trực có tỷ lệ hoàn thành thấp hoặc phản hồi sự cố chậm.
- Gợi ý tối ưu lịch tuần tra dựa trên mật độ sự kiện và khung giờ rủi ro.

## Giá trị chiến lược

AI Watchdog giúp SCMD Pro phát triển từ phần mềm ghi nhận tuần tra thành hệ thống hỗ trợ quyết định vận hành. Dữ liệu không chỉ phục vụ báo cáo, mà còn giúp dự báo điểm nóng và tối ưu nguồn lực bảo vệ.`,
  },
  {
    id: "news-checkpoint-gps",
    title: "Hướng dẫn thiết lập checkpoint GPS chống gian lận tuần tra trong SCMD Pro",
    slug: "huong-dan-checkpoint-gps-chong-gian-lan",
    excerpt:
      "Quy trình cấu hình checkpoint QR và GPS trong SCMD Pro để giảm gian lận tuần tra, kiểm soát sai lệch vị trí và nâng chất lượng nghiệm thu ca trực.",
    seoTitle: "Thiết lập checkpoint GPS chống gian lận tuần tra | SCMD Pro",
    seoDescription:
      "Hướng dẫn cấu hình checkpoint GPS, QR code, bán kính xác thực và quy trình kiểm tra sai lệch vị trí cho hệ thống tuần tra bảo vệ SCMD Pro.",
    thumbnail:
      "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200&h=675&auto=format&fit=crop",
    category: "Hướng dẫn",
    author: "SCMD Pro Team",
    publishedAt: "2026-05-20",
    tags: ["checkpoint GPS", "QR tuần tra", "chống gian lận", "SCMD ERP"],
    content: `# Vì sao checkpoint GPS quyết định độ tin cậy của tuần tra?

Checkpoint là điểm kiểm soát trung tâm trong nghiệp vụ tuần tra bảo vệ. Nếu checkpoint được đặt sai, thiếu bán kính xác thực hoặc không gắn đúng tuyến, dữ liệu quét QR có thể tạo cảm giác hệ thống đang hoạt động nhưng thực tế không phản ánh đúng vị trí nhân sự.

## Quy trình thiết lập checkpoint chuẩn

1. Khảo sát tuyến tuần tra thực tế trước khi nhập dữ liệu.
2. Đặt checkpoint tại vị trí có ý nghĩa kiểm soát: cổng, sảnh, phòng kỹ thuật, tầng hầm, kho hoặc khu vực rủi ro cao.
3. Ghi nhận tọa độ GPS tại đúng điểm dán QR, tránh lấy tọa độ từ bản đồ ước lượng.
4. Cấu hình bán kính xác thực theo môi trường.
5. Kiểm thử bằng thiết bị thật ở nhiều khung giờ.

## Ngưỡng sai lệch GPS

SCMD Pro khuyến nghị dùng ngưỡng 50m làm mốc cảnh báo mặc định cho tình huống sai lệch GPS đáng ngờ. Tuy nhiên, con số này cần được hiệu chỉnh theo địa hình, đặc biệt với tầng hầm, lõi thang máy hoặc khu vực nhiều vật cản.`,
  },
  {
    id: "news-multi-tenant-security",
    title: "Bảo mật multi-tenant trong SCMD Pro: RLS, RBAC và Zero Trust cho dữ liệu vận hành",
    slug: "cap-nhat-bao-mat-multi-tenant-v4-38",
    excerpt:
      "SCMD Pro bảo vệ dữ liệu nhiều khách hàng bằng PostgreSQL RLS, RBAC, kiểm tra tenant context và chiến lược Zero Trust ở mọi điểm vào ra.",
    seoTitle: "Bảo mật multi-tenant bằng RLS và RBAC | SCMD Pro",
    seoDescription:
      "Phân tích kiến trúc bảo mật multi-tenant của SCMD Pro: PostgreSQL RLS, RBAC, tenant isolation, audit log và Zero Trust cho dữ liệu vận hành.",
    thumbnail:
      "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?q=80&w=1200&h=675&auto=format&fit=crop",
    category: "Bảo mật",
    author: "SCMD Pro Team",
    publishedAt: "2026-05-20",
    tags: ["RLS", "RBAC", "Zero Trust", "tenant isolation"],
    content: `# Multi-tenant security là nền móng của SCMD Pro

SCMD Pro phục vụ nhiều doanh nghiệp, ban quản lý và đơn vị bảo vệ trên cùng một nền tảng SaaS. Vì vậy, bảo mật multi-tenant không phải là tính năng bổ sung mà là nguyên tắc kiến trúc bắt buộc.

## RLS bảo vệ dữ liệu tại PostgreSQL

Row-Level Security giúp giới hạn dữ liệu theo tenant ở tầng cơ sở dữ liệu. Business logic được lưu tại PostgreSQL như Single Source of Truth, còn ứng dụng chỉ được truy cập dữ liệu qua tenant context hợp lệ.

## RBAC và Zero Trust

SCMD Pro dùng RBAC để phân tách vai trò như tenant admin, supervisor, guard và technician. API cần validate payload, kiểm tra quyền, xác nhận tenant context và trả lỗi đã được làm sạch để không lộ stack trace.

## Audit log và observability

Audit log và OpenTelemetry traceId giúp đội kỹ thuật điều tra sự cố xuyên suốt từ Express, Prisma đến background worker mà không phải suy đoán thủ công.`,
  },
  {
    id: "news-release-5-1-1",
    title: "SCMD Pro v5.1.1: củng cố public SEO, bảo mật phiên và trải nghiệm landing",
    slug: "scmd-pro-v5-1-1-public-seo-security",
    excerpt:
      "Bản v5.1.1 chuẩn hóa nội dung public, cải thiện bảo mật phiên đăng nhập, hardening token và tăng độ ổn định cho trải nghiệm khách hàng.",
    seoTitle: "SCMD Pro v5.1.1: Public SEO và Security Hardening",
    seoDescription:
      "Tổng quan bản cập nhật SCMD Pro v5.1.1 với public SEO, bảo mật phiên, token hardening và cải thiện trải nghiệm landing page.",
    thumbnail:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&h=675&auto=format&fit=crop",
    category: "Cập nhật",
    author: "SCMD Pro Team",
    publishedAt: "2026-05-20",
    tags: ["release notes", "security", "public SEO", "SCMD Pro"],
    content: `# SCMD Pro v5.1.1 tập trung vào nền tảng vận hành bền vững

Phiên bản v5.1.1 củng cố các điểm chạm public, tăng tính nhất quán của nội dung landing page và tiếp tục hardening các lớp bảo mật quan trọng như phiên đăng nhập, token nội bộ và quyền truy cập Super Admin.

## Điểm nổi bật

- Chuẩn hóa nội dung public để mỗi liên kết có trang đích rõ ràng.
- Cải thiện metadata SEO cho bài viết và trang nội dung.
- Rà soát các luồng token, reCAPTCHA và quyền truy cập nhạy cảm.
- Duy trì nguyên tắc Zero Trust, RLS/RBAC và auditability.

## Ý nghĩa với khách hàng

Khách hàng có trải nghiệm tìm hiểu sản phẩm rõ ràng hơn, trong khi đội vận hành có nền tảng bảo mật ổn định hơn để mở rộng nhiều tenant và nhiều quy trình hiện trường.`,
  },
];

export function findPublicNewsArticle(slug: string): PublicNewsArticle | undefined {
  return PUBLIC_NEWS_ARTICLES.find((article) => article.slug === slug);
}
