export const FOOTER_LINKS = [
  {
    heading: "Sản phẩm",
    headingTo: "/articles/san-pham",
    links: [
      { label: "Tính năng", to: "/articles/tinh-nang-scmd-pro" },
      { label: "Bảng giá", to: "/articles/bang-gia-scmd-pro" },
      { label: "Tin tức & cập nhật", to: "/news" },
      { label: "Lộ trình phát triển", to: "/articles/lo-trinh-phat-trien" },
    ],
  },
  {
    heading: "Giải pháp",
    headingTo: "/articles/giai-phap",
    links: [
      { label: "Tuần tra thông minh", to: "/articles/tuan-tra-thong-minh" },
      { label: "AI Watchdog", to: "/articles/ai-watchdog" },
      { label: "Quản lý sự cố", to: "/articles/quan-ly-su-co" },
      { label: "Đánh giá nhà thầu", to: "/articles/danh-gia-nha-thau" },
    ],
  },
  {
    heading: "Hỗ trợ",
    headingTo: "/articles/ho-tro",
    links: [
      { label: "Hướng dẫn sử dụng", to: "/articles/huong-dan-su-dung" },
      { label: "Liên hệ hỗ trợ", to: "/contact" },
      { label: "Yêu cầu Demo", to: "/contact?intent=demo" },
      { label: "Trạng thái hệ thống", to: "/articles/trang-thai-he-thong" },
    ],
  },
  {
    heading: "Hệ thống",
    headingTo: "/articles/he-thong",
    links: [
      { label: "Đăng nhập", to: "/workspace" },
      { label: "Đăng ký dùng thử", to: "/register" },
      { label: "Chính sách bảo mật", to: "/articles/chinh-sach-bao-mat" },
      { label: "Điều khoản dịch vụ", to: "/articles/dieu-khoan-dich-vu" },
    ],
  },
] as const;
