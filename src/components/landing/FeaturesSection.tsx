import { motion } from "framer-motion";

const FEATURES = [
  {
    id: "staff",
    category: "Minh bạch tuyệt đối",
    title: "Quản lý nhân sự và ca trực",
    description:
      "Quản lý toàn bộ thông tin nhân sự, phân ca linh hoạt và theo dõi hiệu suất làm việc theo thời gian thực. Tự động hóa lịch trực và điều phối nhân lực.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    accent: "#3B82F6",
    tags: ["Phân ca tự động", "Theo dõi hiệu suất", "Không giới hạn NV"],
  },
  {
    id: "patrol",
    category: "Chống gian lận GPS",
    title: "Chấm công thông minh và tuần tra",
    description:
      "Chấm công bằng QR code, GPS và nhận diện khuôn mặt. Xác thực vị trí chính xác từng mét, ngăn chặn hoàn toàn phần mềm giả lập vị trí.",
    icon: "M9 12l2 2 4-4m-4.165-5.303a3.42 3.42 0 011.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    accent: "#10B981",
    tags: ["GPS thực", "Chụp ảnh tại chỗ", "QR bảo mật"],
  },
  {
    id: "soc",
    category: "Chỉ huy tập trung",
    title: "Trung tâm điều hành trực tuyến",
    description:
      "Giám sát toàn bộ quân số và sự cố trên một màn hình duy nhất. Phản ứng nhanh với SOS khẩn cấp. Lịch làm việc linh hoạt, phân ca và điều chỉnh dễ dàng.",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2M12 12v.01",
    accent: "#2563EB",
    tags: ["Thời gian thực", "Bản đồ nhiệt", "SOS Alert"],
  },
  {
    id: "ai",
    category: "Cảnh báo chủ động",
    title: "AI Watchdog phát hiện bất thường",
    description:
      "AI tự động phân tích hành vi đội ngũ, phát hiện chuỗi vi phạm và gửi cảnh báo ngay lập tức tới quản lý. Giảm thiểu sai sót vận hành đáng kể.",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    accent: "#8B5CF6",
    tags: ["Tự động hóa", "Dự báo rủi ro", "Gemini AI"],
  },
  {
    id: "report",
    category: "Báo cáo chuyên nghiệp",
    title: "Báo cáo trực quan và tự động hóa",
    description:
      "Xuất báo cáo PDF/Excel chuyên nghiệp chỉ với một lần bấm. Biểu đồ trực quan, dễ theo dõi và giảm mạnh thời gian làm giấy tờ cho quản lý.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    accent: "#F59E0B",
    tags: ["Báo cáo tự động", "PDF / Excel", "Chuẩn ISO"],
  },
  {
    id: "security",
    category: "Bảo mật tuyệt đối",
    title: "Bảo mật dữ liệu theo tiêu chuẩn quốc tế",
    description:
      "Dữ liệu mã hóa AES-256, cô lập hoàn toàn giữa các tenant bằng Row-Level Security PostgreSQL. Giữ đúng nguyên tắc zero-trust và không rò rỉ chéo tenant.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    accent: "#EF4444",
    tags: ["AES-256", "ISO 27001", "Zero Leak"],
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-[#080C18] py-16 lg:py-20" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6]">
            Tính năng nổi bật
          </div>
          <h2
            id="features-heading"
            className="max-w-2xl text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl"
          >
            Đầy đủ tính năng:{" "}
            <span className="text-[#64748B]">dễ dùng, hiệu quả, bảo mật cao</span>
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#64748B]">
            SCMD Pro tập trung vào các luồng vận hành thật, nên mỗi tính năng đều hướng tới giảm thao tác và tăng độ tin cậy khi chạy production.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <motion.article
              key={feature.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="group relative flex flex-col rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl transition-all hover:border-[#3B82F6]/40"
            >
              <div
                className="relative mb-5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/5"
                aria-hidden="true"
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ background: `radial-gradient(circle at center, ${feature.accent} 0%, transparent 70%)` }}
                />
                <svg
                  className="relative z-10 h-5 w-5"
                  style={{ color: feature.accent }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>

              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: feature.accent }}>
                {feature.category}
              </div>

              <h3 className="mb-3 text-[0.95rem] font-bold leading-snug text-[#E5E7EB]">
                {feature.title}
              </h3>

              <p className="flex-1 text-sm leading-relaxed text-[#94A3B8]">{feature.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-white/5 px-3 py-1 text-[10px] font-bold text-[#64748B]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: feature.accent }}
                aria-hidden="true"
              />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
