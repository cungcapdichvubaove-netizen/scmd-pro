import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

import { SEOHead } from "@/components/seo/SEOHead";
import { LandingHeader } from "./LandingHeader";

type PublicArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  keywords: string;
  updatedAt: string;
  sections: {
    heading: string;
    body: string[];
    bullets?: string[];
  }[];
};

const ARTICLES: Record<string, PublicArticle> = {
  "san-pham": {
    slug: "san-pham",
    title: "Sản phẩm SCMD Pro: nền tảng quản lý an ninh và vận hành hiện trường",
    description:
      "Tổng quan dòng sản phẩm SCMD Pro cho quản lý bảo vệ, tuần tra thông minh, sự cố, báo cáo SLA và vận hành multi-tenant.",
    category: "Sản phẩm",
    keywords: "SCMD Pro, sản phẩm quản lý an ninh, phần mềm quản lý bảo vệ, SaaS bảo vệ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Một nền tảng, nhiều luồng vận hành",
        body: [
          "SCMD Pro được thiết kế như một nền tảng sản phẩm cho doanh nghiệp cần kiểm soát an ninh hiện trường bằng dữ liệu. Hệ thống không chỉ có quét QR, mà bao gồm nhân sự, checkpoint, ca trực, sự cố, báo cáo, phân quyền và audit log.",
          "Với mô hình B2B SaaS multi-tenant, mỗi khách hàng có workspace riêng, dữ liệu riêng và vai trò người dùng riêng. Đây là nền tảng để mở rộng từ một tòa nhà đến nhiều khu vực vận hành.",
        ],
        bullets: [
          "Tính năng vận hành hiện trường theo vai trò.",
          "Bảng giá theo quy mô nhân sự và mức độ triển khai.",
          "Tin tức cập nhật sản phẩm và bảo mật.",
          "Lộ trình phát triển theo hướng Security Command Center.",
        ],
      },
    ],
  },
  "giai-phap": {
    slug: "giai-phap",
    title: "Giải pháp SCMD Pro cho tuần tra, sự cố, AI và đánh giá nhà thầu",
    description:
      "Các giải pháp trọng tâm của SCMD Pro giúp chuẩn hóa tuần tra bảo vệ, phát hiện bất thường, quản lý sự cố và đánh giá SLA nhà thầu.",
    category: "Giải pháp",
    keywords: "giải pháp an ninh, tuần tra thông minh, quản lý sự cố, đánh giá nhà thầu bảo vệ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Giải pháp theo bài toán vận hành",
        body: [
          "Mỗi tổ chức có mô hình an ninh khác nhau, nhưng đều cần dữ liệu đáng tin cậy để kiểm soát chất lượng dịch vụ. SCMD Pro gom các bài toán phổ biến vào bốn nhóm giải pháp: tuần tra thông minh, AI Watchdog, quản lý sự cố và đánh giá nhà thầu.",
        ],
        bullets: [
          "Tuần tra QR/GPS chống gian lận.",
          "AI Watchdog phát hiện xu hướng bất thường.",
          "Incident workflow rõ trạng thái và trách nhiệm.",
          "Vendor/SLA scoring phục vụ nghiệm thu dịch vụ.",
        ],
      },
    ],
  },
  "ho-tro": {
    slug: "ho-tro",
    title: "Hỗ trợ SCMD Pro: hướng dẫn sử dụng, liên hệ, demo và trạng thái hệ thống",
    description:
      "Trung tâm hỗ trợ public cho người dùng SCMD Pro: hướng dẫn khởi tạo, kênh liên hệ, yêu cầu demo và thông tin trạng thái hệ thống.",
    category: "Hỗ trợ",
    keywords: "hỗ trợ SCMD Pro, hướng dẫn sử dụng SCMD, yêu cầu demo, trạng thái hệ thống",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Hỗ trợ theo vòng đời khách hàng",
        body: [
          "SCMD Pro cần hỗ trợ cả giai đoạn tìm hiểu, triển khai thử, vận hành chính thức và xử lý sự cố. Nhóm hỗ trợ public giúp người dùng nhanh chóng tìm đúng kênh thay vì quay về trang chủ hoặc gặp link rỗng.",
        ],
        bullets: [
          "Hướng dẫn sử dụng cho tenant admin, supervisor và guard.",
          "Kênh liên hệ hỗ trợ kỹ thuật và vận hành.",
          "Yêu cầu demo cho khách hàng đang đánh giá sản phẩm.",
          "Trạng thái hệ thống cho các kênh dịch vụ chính.",
        ],
      },
    ],
  },
  "he-thong": {
    slug: "he-thong",
    title: "Hệ thống SCMD Pro: đăng nhập, đăng ký, bảo mật và điều khoản dịch vụ",
    description:
      "Các liên kết hệ thống quan trọng của SCMD Pro gồm đăng nhập workspace, đăng ký dùng thử, chính sách bảo mật và điều khoản dịch vụ.",
    category: "Hệ thống",
    keywords: "hệ thống SCMD Pro, đăng nhập SCMD, đăng ký dùng thử, chính sách bảo mật, điều khoản dịch vụ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Các điểm vào hệ thống",
        body: [
          "Nhóm hệ thống tập trung vào các hành động có tính giao dịch: đăng nhập workspace, đăng ký dùng thử, đọc chính sách bảo mật và điều khoản dịch vụ. Các link này phải luôn có trang đích rõ ràng vì ảnh hưởng trực tiếp đến chuyển đổi khách hàng và niềm tin pháp lý.",
        ],
        bullets: [
          "Đăng nhập qua workspace finder.",
          "Đăng ký tenant dùng thử.",
          "Chính sách bảo mật dữ liệu tenant.",
          "Điều khoản sử dụng dịch vụ SaaS.",
        ],
      },
    ],
  },
  "tinh-nang-scmd-pro": {
    slug: "tinh-nang-scmd-pro",
    title: "Tính năng SCMD Pro cho quản lý an ninh và vận hành hiện trường",
    description:
      "Tổng quan các tính năng cốt lõi của SCMD Pro: tuần tra QR/GPS, quản lý sự cố, AI Watchdog, báo cáo PDF, RBAC và audit log.",
    category: "Sản phẩm",
    keywords: "tính năng SCMD Pro, phần mềm quản lý bảo vệ, tuần tra QR GPS, AI Watchdog",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "SCMD Pro giải quyết bài toán gì?",
        body: [
          "SCMD Pro là nền tảng quản lý an ninh và vận hành hiện trường cho tòa nhà, khu đô thị, nhà máy, kho vận và doanh nghiệp dịch vụ bảo vệ. Hệ thống tập trung vào dữ liệu có thể kiểm chứng thay vì báo cáo thủ công rời rạc.",
          "Các module được thiết kế theo luồng vận hành thật: phân công nhân sự, thiết lập checkpoint, ghi nhận tuần tra, xử lý sự cố, đánh giá SLA và xuất báo cáo nghiệm thu.",
        ],
        bullets: [
          "Tuần tra thông minh bằng QR, GPS và timestamp máy chủ.",
          "Quản lý sự cố từ ghi nhận, điều phối đến đóng hồ sơ.",
          "AI Watchdog phân tích bất thường trong ca trực.",
          "Báo cáo PDF và dashboard cho supervisor, tenant admin, super admin.",
        ],
      },
      {
        heading: "Giá trị cho ban quản lý và nhà thầu bảo vệ",
        body: [
          "SCMD Pro giúp giảm phụ thuộc vào file Excel, nhóm chat và biên bản giấy. Mỗi hành động quan trọng đều có người thực hiện, thời điểm, tenant context và audit trail.",
          "Với mô hình SaaS multi-tenant, doanh nghiệp có thể mở rộng nhiều địa điểm mà vẫn giữ phân quyền, dữ liệu và báo cáo tách biệt.",
        ],
      },
    ],
  },
  "bang-gia-scmd-pro": {
    slug: "bang-gia-scmd-pro",
    title: "Bảng giá SCMD Pro: Free, Pro và Max cho doanh nghiệp",
    description:
      "Giải thích cách chọn gói SCMD Pro theo quy mô nhân sự, nhu cầu vận hành và yêu cầu white-label.",
    category: "Sản phẩm",
    keywords: "bảng giá SCMD Pro, giá phần mềm bảo vệ, gói Pro SCMD, SaaS an ninh",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Nguyên tắc thiết kế gói dịch vụ",
        body: [
          "SCMD Pro chia gói theo mức độ trưởng thành vận hành. Free phù hợp để thử quy trình cốt lõi, Pro dành cho tenant vận hành thực tế, còn Max dành cho tổ chức cần triển khai riêng, white-label hoặc tích hợp sâu.",
        ],
        bullets: [
          "Free: 1 quản lý và 2 nhân viên để kiểm chứng quy trình.",
          "Pro: 99.000đ mỗi nhân viên mỗi tháng cho vận hành mở rộng.",
          "Max: cấu hình riêng cho dedicated deployment và white-label.",
        ],
      },
      {
        heading: "Khi nào nên nâng cấp lên Pro?",
        body: [
          "Tenant nên nâng cấp khi số lượng nhân sự vượt giới hạn Free, cần báo cáo nghiệm thu thường xuyên, hoặc cần quản trị nhiều checkpoint, nhiều ca trực và nhiều supervisor.",
          "Về mặt chi phí, Pro phù hợp khi dữ liệu tuần tra và sự cố trở thành căn cứ nghiệm thu dịch vụ, không chỉ là công cụ ghi nhận nội bộ.",
        ],
      },
    ],
  },
  "lo-trinh-phat-trien": {
    slug: "lo-trinh-phat-trien",
    title: "Lộ trình phát triển SCMD Pro: từ tuần tra số đến Security Command Center",
    description:
      "Lộ trình sản phẩm SCMD Pro tập trung vào dữ liệu vận hành, AI Watchdog, báo cáo SLA, tích hợp realtime và khả năng mở rộng enterprise.",
    category: "Sản phẩm",
    keywords: "lộ trình SCMD Pro, Security Command Center, phần mềm tuần tra, AI an ninh",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Định hướng sản phẩm",
        body: [
          "SCMD Pro không dừng ở phần mềm quét QR. Định hướng dài hạn là Security Command Center: nơi dữ liệu tuần tra, sự cố, nhân sự, nhà thầu và SLA được hợp nhất để hỗ trợ quyết định vận hành.",
        ],
        bullets: [
          "Chuẩn hóa dữ liệu hiện trường bằng PostgreSQL làm Single Source of Truth.",
          "Mở rộng phân tích AI theo khu vực, ca trực và mức độ rủi ro.",
          "Tăng năng lực báo cáo SLA cho chủ đầu tư và nhà thầu.",
          "Củng cố bảo mật multi-tenant cho triển khai enterprise.",
        ],
      },
      {
        heading: "Ưu tiên kỹ thuật",
        body: [
          "Các ưu tiên kỹ thuật gồm RLS, RBAC, audit log, OpenTelemetry, hàng đợi BullMQ, cache Redis và cơ chế realtime có kiểm soát. Đây là nền móng để hệ thống phục vụ nhiều tenant mà không đánh đổi an toàn dữ liệu.",
        ],
      },
    ],
  },
  "tuan-tra-thong-minh": {
    slug: "tuan-tra-thong-minh",
    title: "Tuần tra thông minh bằng QR, GPS và dữ liệu thời gian thực",
    description:
      "Cách SCMD Pro số hóa quy trình tuần tra bảo vệ bằng checkpoint QR, GPS, lịch ca và cảnh báo sai lệch.",
    category: "Giải pháp",
    keywords: "tuần tra thông minh, QR tuần tra, GPS bảo vệ, phần mềm tuần tra bảo vệ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Từ checklist giấy sang dữ liệu kiểm chứng",
        body: [
          "Tuần tra thông minh trong SCMD Pro kết hợp checkpoint QR, tọa độ GPS, lịch phân công và timestamp máy chủ. Mục tiêu là xác định nhân sự có thực sự đi đúng tuyến, đúng thời điểm và đúng vị trí hay không.",
        ],
        bullets: [
          "Thiết lập tuyến tuần tra theo khu vực và ca trực.",
          "Gắn checkpoint với vị trí GPS và mã QR.",
          "Đánh dấu suspicious khi sai lệch vượt ngưỡng vận hành.",
          "Tổng hợp báo cáo hoàn thành theo ngày, tuần, tháng.",
        ],
      },
      {
        heading: "Giảm rủi ro vận hành",
        body: [
          "Khi dữ liệu tuần tra được chuẩn hóa, supervisor có thể phát hiện bỏ lượt, quét gom, quét sai vị trí hoặc phản hồi chậm trước khi vấn đề trở thành tranh chấp nghiệm thu.",
        ],
      },
    ],
  },
  "ai-watchdog": {
    slug: "ai-watchdog",
    title: "AI Watchdog: phát hiện bất thường trong vận hành bảo vệ",
    description:
      "AI Watchdog phân tích tuần tra, sự cố, GPS và SLA để phát hiện rủi ro sớm trong SCMD Pro.",
    category: "Giải pháp",
    keywords: "AI Watchdog, AI giám sát bảo vệ, phát hiện bất thường tuần tra, SCMD Pro",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "AI hỗ trợ supervisor, không thay thế quy trình",
        body: [
          "AI Watchdog là lớp phân tích trên dữ liệu đã được xác thực từ hệ thống. Công cụ này không tự ý kết luận kỷ luật nhân sự, mà đưa ra tín hiệu rủi ro để supervisor kiểm tra và xử lý theo quy trình.",
        ],
        bullets: [
          "Phát hiện tuyến đi bất thường hoặc thiếu checkpoint.",
          "Đưa cảnh báo khi GPS, thời gian phản hồi hoặc SLA lệch chuẩn.",
          "Tổng hợp xu hướng rủi ro theo ca, khu vực và nhân sự.",
        ],
      },
      {
        heading: "Lợi ích cấp CTO",
        body: [
          "Về chiến lược, AI Watchdog biến SCMD Pro từ hệ thống ghi nhận thành nền tảng hỗ trợ quyết định. Dữ liệu vận hành không chỉ phục vụ báo cáo, mà còn giúp dự báo điểm nóng và tối ưu nguồn lực.",
        ],
      },
    ],
  },
  "quan-ly-su-co": {
    slug: "quan-ly-su-co",
    title: "Quản lý sự cố an ninh từ hiện trường đến báo cáo đóng hồ sơ",
    description:
      "SCMD Pro chuẩn hóa vòng đời sự cố: ghi nhận, phân loại, điều phối, bổ sung bằng chứng, xử lý và báo cáo.",
    category: "Giải pháp",
    keywords: "quản lý sự cố an ninh, incident management, báo cáo sự cố bảo vệ, SCMD Pro",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Vòng đời sự cố rõ trách nhiệm",
        body: [
          "Một sự cố an ninh cần có trạng thái, người phụ trách, bằng chứng và mốc thời gian rõ ràng. SCMD Pro chuẩn hóa luồng từ lúc nhân sự hiện trường ghi nhận đến khi supervisor xác minh và tenant admin xem báo cáo tổng hợp.",
        ],
        bullets: [
          "Ghi nhận sự cố kèm ảnh, mô tả, vị trí và thời gian.",
          "Phân loại mức độ ưu tiên để điều phối nhanh.",
          "Theo dõi trạng thái xử lý từ reported đến closed.",
          "Lưu audit trail cho các hành động nhạy cảm.",
        ],
      },
      {
        heading: "Giảm thất thoát thông tin",
        body: [
          "Thay vì trao đổi rời rạc qua nhóm chat, dữ liệu sự cố nằm trong cùng một hệ thống với tuần tra, nhân sự và báo cáo. Điều này giúp truy vết nhanh khi cần kiểm tra trách nhiệm hoặc nghiệm thu SLA.",
        ],
      },
    ],
  },
  "danh-gia-nha-thau": {
    slug: "danh-gia-nha-thau",
    title: "Đánh giá nhà thầu bảo vệ bằng SLA và dữ liệu vận hành",
    description:
      "SCMD Pro hỗ trợ đánh giá nhà thầu bảo vệ dựa trên tỷ lệ tuần tra, phản hồi sự cố, tuân thủ ca trực và bằng chứng audit.",
    category: "Giải pháp",
    keywords: "đánh giá nhà thầu bảo vệ, SLA bảo vệ, vendor compliance, SCMD Pro",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Đánh giá bằng dữ liệu thay vì cảm tính",
        body: [
          "Chất lượng nhà thầu bảo vệ thường khó đo nếu thiếu dữ liệu thống nhất. SCMD Pro đưa các chỉ số vận hành vào cùng một dashboard để ban quản lý đánh giá theo SLA, không chỉ theo phản ánh chủ quan.",
        ],
        bullets: [
          "Tỷ lệ hoàn thành checkpoint và ca trực.",
          "Thời gian phản hồi và đóng sự cố.",
          "Tần suất cảnh báo suspicious hoặc GPS lệch chuẩn.",
          "Lịch sử tuân thủ quy trình và chất lượng báo cáo.",
        ],
      },
      {
        heading: "Cơ sở cho nghiệm thu và tái ký",
        body: [
          "Khi dữ liệu được chuẩn hóa theo tenant và thời gian, ban quản lý có căn cứ minh bạch để nghiệm thu dịch vụ, áp dụng thưởng phạt hoặc quyết định tái ký hợp đồng.",
        ],
      },
    ],
  },
  "huong-dan-su-dung": {
    slug: "huong-dan-su-dung",
    title: "Hướng dẫn sử dụng SCMD Pro cho tenant admin, supervisor và guard",
    description:
      "Hướng dẫn nhanh cách bắt đầu với SCMD Pro: tạo workspace, thêm nhân sự, cấu hình checkpoint, vận hành ca trực và xem báo cáo.",
    category: "Hỗ trợ",
    keywords: "hướng dẫn SCMD Pro, cách dùng phần mềm tuần tra, tạo checkpoint, quản lý nhân viên bảo vệ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Quy trình khởi tạo tenant",
        body: [
          "Tenant admin bắt đầu bằng cách tạo workspace, thêm nhân sự, phân quyền và thiết lập các checkpoint quan trọng. Sau đó supervisor có thể phân công ca trực và kiểm tra log tuần tra theo thời gian thực.",
        ],
        bullets: [
          "Tạo hoặc truy cập workspace của doanh nghiệp.",
          "Thêm nhân sự và gán vai trò phù hợp.",
          "Tạo checkpoint QR/GPS theo tuyến thực địa.",
          "Theo dõi dashboard, sự cố và báo cáo.",
        ],
      },
      {
        heading: "Nguyên tắc vận hành tốt",
        body: [
          "Nên kiểm thử checkpoint bằng thiết bị thật, đào tạo guard trước ca đầu tiên và yêu cầu supervisor rà soát các lượt suspicious hằng ngày để dữ liệu luôn đáng tin cậy.",
        ],
      },
    ],
  },
  "trang-thai-he-thong": {
    slug: "trang-thai-he-thong",
    title: "Trạng thái hệ thống SCMD Pro và nguyên tắc vận hành ổn định",
    description:
      "Thông tin trạng thái dịch vụ, nguyên tắc giám sát, uptime, hàng đợi nền và quy trình phản hồi sự cố hệ thống SCMD Pro.",
    category: "Hỗ trợ",
    keywords: "trạng thái hệ thống SCMD Pro, uptime, monitoring, vận hành SaaS",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Cam kết vận hành",
        body: [
          "SCMD Pro được thiết kế theo hướng enterprise reliability: API, database, Redis, queue worker và realtime đều cần có giám sát riêng. Trạng thái hệ thống giúp khách hàng biết kênh nào đang hoạt động ổn định và kênh nào cần theo dõi.",
        ],
        bullets: [
          "Giám sát API health, background workers và Redis queue.",
          "Theo dõi lỗi theo traceId để điều tra nhanh.",
          "Ưu tiên thông báo sớm khi có ảnh hưởng đến tenant.",
        ],
      },
      {
        heading: "Khi cần hỗ trợ",
        body: [
          "Nếu tenant gặp lỗi đăng nhập, đồng bộ tuần tra, xuất báo cáo hoặc realtime dashboard, hãy gửi workspace, thời điểm phát sinh và ảnh chụp màn hình để đội hỗ trợ đối chiếu log nhanh hơn.",
        ],
      },
    ],
  },
  "chinh-sach-bao-mat": {
    slug: "chinh-sach-bao-mat",
    title: "Chính sách bảo mật SCMD Pro",
    description:
      "Chính sách bảo mật dữ liệu SCMD Pro: tenant isolation, RBAC, audit log, dữ liệu vận hành và nguyên tắc xử lý thông tin khách hàng.",
    category: "Hệ thống",
    keywords: "chính sách bảo mật SCMD Pro, tenant isolation, RBAC, bảo mật dữ liệu SaaS",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Dữ liệu được bảo vệ như thế nào?",
        body: [
          "SCMD Pro xử lý dữ liệu vận hành như nhân sự, checkpoint, patrol log, incident, báo cáo và audit log. Dữ liệu này được cô lập theo tenant và chỉ được truy cập theo quyền hợp lệ.",
        ],
        bullets: [
          "Áp dụng phân quyền theo vai trò cho người dùng.",
          "Ghi nhận audit log cho hành động nhạy cảm.",
          "Không dùng dữ liệu tenant này để hiển thị cho tenant khác.",
          "Ưu tiên nguyên tắc tối thiểu quyền trong API và báo cáo.",
        ],
      },
      {
        heading: "Trách nhiệm của khách hàng",
        body: [
          "Khách hàng cần quản lý tài khoản nội bộ, thu hồi quyền khi nhân sự nghỉ việc và không chia sẻ thông tin đăng nhập. SCMD Pro cung cấp công cụ kiểm soát, nhưng vận hành an toàn cần sự phối hợp từ tenant admin.",
        ],
      },
    ],
  },
  "dieu-khoan-dich-vu": {
    slug: "dieu-khoan-dich-vu",
    title: "Điều khoản dịch vụ SCMD Pro",
    description:
      "Điều khoản sử dụng SCMD Pro cho khách hàng SaaS: phạm vi dịch vụ, tài khoản, dữ liệu, thanh toán, giới hạn trách nhiệm và hỗ trợ.",
    category: "Hệ thống",
    keywords: "điều khoản dịch vụ SCMD Pro, SaaS security management, phần mềm quản lý bảo vệ",
    updatedAt: "2026-05-20",
    sections: [
      {
        heading: "Phạm vi dịch vụ",
        body: [
          "SCMD Pro cung cấp nền tảng quản lý an ninh, tuần tra, sự cố, nhân sự, báo cáo và các công cụ hỗ trợ vận hành. Khách hàng chịu trách nhiệm cấu hình dữ liệu đúng với thực tế triển khai.",
        ],
        bullets: [
          "Tài khoản phải được dùng đúng vai trò được cấp.",
          "Dữ liệu nhập vào hệ thống cần phản ánh vận hành thực tế.",
          "Gói dịch vụ và giới hạn nhân sự tuân theo cấu hình subscription.",
        ],
      },
      {
        heading: "Hỗ trợ và giới hạn trách nhiệm",
        body: [
          "SCMD Pro hỗ trợ xử lý lỗi kỹ thuật, hướng dẫn vận hành và cải tiến hệ thống. Các quyết định nhân sự, nghiệm thu hợp đồng hoặc xử lý pháp lý vẫn thuộc trách nhiệm của khách hàng và các bên liên quan.",
        ],
      },
    ],
  },
};

interface PublicArticlePageProps {
  slug?: string;
}

export function PublicArticlePage({ slug: forcedSlug }: PublicArticlePageProps) {
  const params = useParams<{ slug: string }>();
  const slug = forcedSlug ?? params.slug ?? "";
  const article = ARTICLES[slug];

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB]">
        <LandingHeader />
        <main className="mx-auto flex max-w-3xl flex-col items-center px-5 py-24 text-center">
          <ShieldCheck className="mb-5 h-12 w-12 text-[#2563EB]" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Không tìm thấy bài viết</h1>
          <p className="mt-3 text-sm leading-6 text-[#94A3B8]">
            Liên kết này chưa có nội dung công khai hoặc đã được chuyển sang trang khác.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-[#2563EB] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Về trang chủ
          </Link>
        </main>
      </div>
    );
  }

  const canonicalPath = forcedSlug
    ? {
        "trang-thai-he-thong": "/status",
        "chinh-sach-bao-mat": "/privacy",
        "dieu-khoan-dich-vu": "/terms",
      }[slug] ?? `/articles/${slug}`
    : `/articles/${slug}`;
  const canonicalUrl = `https://scmdpro.com${canonicalPath}`;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB]">
      <SEOHead
        title={`${article.title} | SCMD Pro`}
        description={article.description}
        url={canonicalUrl}
        type="article"
        keywords={article.keywords}
      />
      <LandingHeader />

      <main>
        <section className="border-b border-white/5 bg-[#0F172A] px-5 py-14">
          <div className="mx-auto max-w-4xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded text-sm font-semibold text-[#94A3B8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Trang chủ
            </Link>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#60A5FA]">{article.category}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#A7B4C8]">{article.description}</p>
            <p className="mt-5 text-xs text-[#64748B]">Cập nhật: {article.updatedAt}</p>
          </div>
        </section>

        <article className="mx-auto max-w-4xl px-5 py-12">
          <div className="space-y-12">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-bold tracking-tight text-white">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#A7B4C8]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {section.bullets.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-[#CBD5E1]"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-14 rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/10 p-6">
            <h2 className="text-lg font-bold text-white">Cần tư vấn triển khai SCMD Pro?</h2>
            <p className="mt-2 text-sm leading-6 text-[#A7B4C8]">
              Đội ngũ SCMD Pro có thể hỗ trợ đánh giá quy trình hiện tại, đề xuất cấu hình tenant,
              checkpoint, phân quyền và báo cáo phù hợp với mô hình vận hành của bạn.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-[#2563EB] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Liên hệ hỗ trợ
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
