import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const TECH_PILLARS = [
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "PostgreSQL SSOT", desc: "Toàn bộ nghiệp vụ lưu trên PostgreSQL với RLS. Nghiêm cấm dual-source.", color: "#3B82F6" },
  { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", title: "Outbox + BullMQ", desc: "At-least-once delivery. Heavy Worker concurrency 3, Light Worker 30.", color: "#F59E0B" },
  { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", title: "OpenTelemetry", desc: "TraceId xuyên suốt Express → Prisma → AuditLog → BullMQ Jobs.", color: "#8B5CF6" },
  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Zod Zero-Trust", desc: "Validate tại controller và use-case boundary. Không tin tưởng dữ liệu từ frontend.", color: "#22C55E" },
  { icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", title: "Cloudflare R2", desc: "Presigned URL upload, mã hóa đầu cuối, vòng đời ảnh quản lý bởi DB.", color: "#EC4899" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "PWA Offline-First", desc: "IndexedDB lưu tạm tuần tra khi mất mạng, tự đồng bộ khi kết nối trở lại.", color: "#EF4444" },
];

const TESTIMONIALS = [
  {
    text: "SCMD Pro giúp chúng tôi tối ưu quy trình quản lý an ninh, tiết kiệm đáng kể thời gian và giảm sai sót vận hành. AI Watchdog phát hiện gian lận GPS rất chính xác.",
    name: "Trần Minh Quân",
    role: "Quản lý vận hành - Vinhomes",
    initial: "T",
  },
  {
    text: "Từ khi dùng SCMD Pro, thời gian xử lý sự cố giảm rõ rệt. Báo cáo tự động tiết kiệm nhiều giờ mỗi tuần và giao diện đủ rõ để đội vận hành dùng hằng ngày.",
    name: "Nguyễn Thị Lan",
    role: "Giám đốc nhân sự - Viettel",
    initial: "N",
  },
  {
    text: "Multi-tenant isolation được làm rất chắc. Mỗi site hoàn toàn tách biệt, còn báo cáo trực quan giúp chúng tôi ra quyết định nhanh hơn trong ca trực.",
    name: "Lê Hoàng Nam",
    role: "Giám đốc an ninh - Samsung",
    initial: "L",
  },
];

export function TrustSection() {
  return (
    <>
      <section className="bg-[#0B0F1A] py-14 lg:py-16" aria-labelledby="trust-heading">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5" aria-hidden="true" />
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2">
              <svg className="h-4 w-4 text-[#3B82F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span id="trust-heading" className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">
                Công nghệ nền tảng
              </span>
            </div>
            <div className="h-px flex-1 bg-white/5" aria-hidden="true" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH_PILLARS.map((pillar) => (
              <motion.div
                key={pillar.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl transition-all hover:border-[#3B82F6]/40"
              >
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5">
                  <svg className="h-5 w-5" style={{ color: pillar.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={pillar.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-[#E5E7EB]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pillar.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#94A3B8]">{pillar.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.04] bg-[#0A0E1A] py-14 lg:py-16" aria-labelledby="testimonials-heading">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6]">
              Khách hàng nói gì
            </div>
            <h2 id="testimonials-heading" className="text-2xl font-bold text-[#E5E7EB] sm:text-3xl">
              Niềm tin của khách hàng là động lực của chúng tôi
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <motion.figure
                key={item.name}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <div className="mb-4 flex gap-0.5" aria-label="5 sao" role="img">
                  {[...Array(5)].map((_, index) => (
                    <svg key={index} className="h-4 w-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mb-4 text-sm leading-relaxed text-[#94A3B8]">
                  &ldquo;{item.text}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-xs font-bold text-white" aria-hidden="true">
                    {item.initial}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#E5E7EB]">{item.name}</div>
                    <div className="text-xs text-[#64748B]">{item.role}</div>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-12"
        style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)" }}
        aria-label="Call to action"
      >
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                Sẵn sàng nâng tầm quản lý an ninh?
              </h2>
              <p className="mt-2 text-sm text-blue-200">
                Tham gia cùng các doanh nghiệp đã dùng SCMD Pro trong vận hành hằng ngày. Dùng thử 14 ngày miễn phí.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-7 py-3.5 text-sm font-extrabold text-[#2563EB] shadow-lg shadow-black/20 transition-all hover:bg-blue-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Dùng thử miễn phí 14 ngày
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Liên hệ kinh doanh
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
