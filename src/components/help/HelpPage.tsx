import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  ChevronRight,
  BookOpen,
  Shield,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";

import { SEOHead } from "@/components/seo/SEOHead";
import { JsonLd } from "@/components/seo/JsonLd";
import { SCMDLogo } from "@/apps/common/interfaces/components/SCMDLogo";

interface HelpArticle {
  slug: string;
  title: string;
  excerpt: string;
  readTime: number;
}

interface HelpCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  articles: HelpArticle[];
}

const CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    label: "Bắt đầu",
    icon: <BookOpen size={20} aria-hidden="true" />,
    description: "Hướng dẫn thiết lập hệ thống và onboarding cho người dùng mới.",
    articles: [
      { slug: "dang-ky-tai-khoan", title: "Đăng ký tài khoản dùng thử", excerpt: "Tạo tài khoản và cấu hình tenant đầu tiên trong 5 phút.", readTime: 3 },
      { slug: "tao-checkpoint-tuan-tra", title: "Tạo checkpoint tuần tra", excerpt: "Hướng dẫn tạo và cấu hình checkpoint QR cho đội tuần tra.", readTime: 5 },
      { slug: "them-nhan-vien", title: "Thêm nhân viên vào hệ thống", excerpt: "Quản lý danh sách nhân viên, phân quyền và tạo tài khoản.", readTime: 4 },
    ],
  },
  {
    id: "patrol",
    label: "Tuần tra",
    icon: <Shield size={20} aria-hidden="true" />,
    description: "Quản lý tuyến tuần tra, QR scan và xử lý báo cáo bất thường.",
    articles: [
      { slug: "scan-qr-tuan-tra", title: "Cách quét QR trong ca tuần tra", excerpt: "Hướng dẫn sử dụng tính năng QR Scan trên thiết bị di động.", readTime: 3 },
      { slug: "offline-mode", title: "Tuần tra khi mất sóng (Offline)", excerpt: "SCMD Pro hỗ trợ lưu dữ liệu ngoại tuyến và đồng bộ khi có mạng.", readTime: 4 },
      { slug: "bao-cao-su-co", title: "Báo cáo sự cố tại hiện trường", excerpt: "Ghi nhận và xử lý sự cố ngay trong app, đính kèm ảnh và GPS.", readTime: 5 },
    ],
  },
  {
    id: "reports",
    label: "Báo cáo",
    icon: <BarChart3 size={20} aria-hidden="true" />,
    description: "Xuất báo cáo PDF/Excel và phân tích dữ liệu vận hành.",
    articles: [
      { slug: "xuat-bao-cao-pdf", title: "Xuất báo cáo PDF tự động", excerpt: "Cấu hình lịch xuất báo cáo định kỳ và tùy chỉnh mẫu báo cáo.", readTime: 4 },
      { slug: "bao-cao-cham-cong", title: "Xem báo cáo chấm công", excerpt: "Hướng dẫn đọc và lọc dữ liệu chấm công theo ngày, tuần, tháng.", readTime: 3 },
    ],
  },
  {
    id: "admin",
    label: "Quản trị",
    icon: <Users size={20} aria-hidden="true" />,
    description: "Cấu hình hệ thống, phân quyền và quản lý subscription.",
    articles: [
      { slug: "phan-quyen-nhan-vien", title: "Phân quyền truy cập cho nhân viên", excerpt: "RBAC theo vai trò: Tenant Admin, Supervisor, Guard, Technician.", readTime: 5 },
      { slug: "nang-cap-goi-pro", title: "Nâng cấp lên gói Enterprise PRO", excerpt: "Quy trình thanh toán và kích hoạt gói PRO cho tenant.", readTime: 3 },
    ],
  },
  {
    id: "ai-watcher",
    label: "AI Watcher",
    icon: <Settings size={20} aria-hidden="true" />,
    description: "Cấu hình AI phát hiện bất thường và đọc kết quả phân tích.",
    articles: [
      { slug: "ai-watcher-la-gi", title: "AI Watcher hoạt động như thế nào?", excerpt: "Giải thích cơ chế phát hiện bất thường dựa trên quỹ đạo di chuyển.", readTime: 6 },
      { slug: "xem-canh-bao-ai", title: "Xem và xử lý cảnh báo AI", excerpt: "Hướng dẫn đọc kết quả phân tích và xác nhận hoặc bác bỏ cảnh báo.", readTime: 4 },
    ],
  },
];

function buildFAQSchema(categories: HelpCategory[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: categories.flatMap((category) =>
      category.articles.map((article) => ({
        "@type": "Question",
        name: article.title,
        acceptedAnswer: { "@type": "Answer", text: article.excerpt },
      }))
    ),
  };
}

export const HelpPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = query.toLowerCase();

  const visibleCategories = CATEGORIES
    .filter((category) => !activeCategory || category.id === activeCategory)
    .map((category) => ({
      ...category,
      articles: normalizedQuery
        ? category.articles.filter(
            (article) =>
              article.title.toLowerCase().includes(normalizedQuery) ||
              article.excerpt.toLowerCase().includes(normalizedQuery)
          )
        : category.articles,
    }))
    .filter((category) => category.articles.length > 0);

  return (
    <>
      <SEOHead
        title="Hướng dẫn sử dụng SCMD Pro | Help Center"
        description="Hướng dẫn đầy đủ về cách sử dụng SCMD Pro: tuần tra thông minh, AI Watcher, báo cáo tự động và quản lý nhân sự bảo vệ."
        url="https://scmdpro.com/help"
        type="website"
      />
      <JsonLd data={buildFAQSchema(CATEGORIES)} />

      <div className="min-h-screen bg-[#0D1324] font-sans text-slate-100">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0D1324]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-6">
            <a href="/" aria-label="Về trang chủ SCMD Pro" className="transition-opacity hover:opacity-80">
              <SCMDLogo variant="dark" size="md" />
            </a>
            <span className="hidden text-lg font-light text-white/20 sm:inline" aria-hidden="true">/</span>
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">Hướng dẫn</span>
          </div>
        </header>

        <section
          className="border-b border-white/5 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_42%)] px-6 py-8 md:py-10"
          aria-labelledby="help-hero-heading"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,420px)] lg:items-end"
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 px-4 py-2">
                <HelpCircle size={14} className="text-[#4285F4]" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-widest text-[#4285F4]">Help Center</span>
              </div>

              <h1
                id="help-hero-heading"
                className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl md:text-[2.75rem]"
              >
                Bạn cần hỗ trợ gì?
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Tìm hướng dẫn, tài liệu kỹ thuật và câu trả lời cho các tình huống vận hành phổ biến trong SCMD Pro.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
              <div className="relative">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="search"
                  placeholder="Tìm kiếm hướng dẫn..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Tìm kiếm hướng dẫn"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm font-medium text-white placeholder:text-slate-500 transition-colors focus:border-[#2563EB]/50 focus:outline-none"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Từ khóa phổ biến: QR tuần tra, offline, AI Watcher, báo cáo PDF, phân quyền.
              </p>
            </div>
          </motion.div>
        </section>

        <nav
          aria-label="Lọc theo danh mục"
          className="sticky top-16 z-30 border-b border-white/5 bg-[#0D1324]/92 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-4 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              aria-pressed={!activeCategory}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                !activeCategory ? "bg-[#2563EB] text-white" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Tất cả
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                aria-pressed={activeCategory === category.id}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                  activeCategory === category.id ? "bg-[#2563EB] text-white" : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {category.icon}
                {category.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="mx-auto max-w-6xl px-6 py-8 pb-20 md:py-10">
          {visibleCategories.length === 0 && (
            <div role="status" className="py-20 text-center text-slate-500">
              <Search size={40} className="mx-auto mb-4 opacity-30" aria-hidden="true" />
              <p className="font-black">Không tìm thấy kết quả cho “{query}”</p>
            </div>
          )}

          {visibleCategories.map((category) => (
            <section key={category.id} className="mb-12" aria-labelledby={`cat-heading-${category.id}`}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB]/20 text-[#4285F4]">
                  {category.icon}
                </div>
                <div>
                  <h2 id={`cat-heading-${category.id}`} className="text-lg font-black text-white">
                    {category.label}
                  </h2>
                  <p className="text-xs text-slate-500">{category.description}</p>
                </div>
              </div>

              <ul className="grid list-none gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.articles.map((article) => (
                  <li key={article.slug}>
                    <a
                      href={`/help/${article.slug}`}
                      className="group block h-full rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition-all hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      <h3 className="mb-2 text-sm font-black text-white transition-colors group-hover:text-[#4285F4]">
                        {article.title}
                      </h3>
                      <p className="mb-4 text-xs leading-relaxed text-slate-500">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        <span>{article.readTime} phút đọc</span>
                        <ChevronRight
                          size={14}
                          aria-hidden="true"
                          className="text-[#2563EB] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                        />
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>

        <footer className="border-t border-white/5 px-6 py-12 text-center">
          <p className="mb-4 text-sm text-slate-500">Không tìm thấy hướng dẫn bạn cần?</p>
          <a
            href="mailto:support@scmdpro.com"
            className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[#2563EB]/90"
          >
            Liên hệ hỗ trợ 24/7
          </a>
        </footer>
      </div>
    </>
  );
};
