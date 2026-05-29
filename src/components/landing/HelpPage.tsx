import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  ChevronRight,
  BookOpen,
  Shield,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd } from '@/components/seo/JsonLd';
import { LandingHeader } from './LandingHeader';

type HelpCategoryLabel = 'Bắt đầu' | 'Tuần tra' | 'Báo cáo' | 'Quản trị' | 'AI Watcher';

const CATEGORY_CLASSES: Record<HelpCategoryLabel | 'default', string> = {
  'Bắt đầu': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Tuần tra': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Báo cáo': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Quản trị': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'AI Watcher': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  default: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpArticle {
  slug: string;
  title: string;
  excerpt: string;
  readTime: number;
}

interface HelpCategory {
  id: string;
  label: HelpCategoryLabel;
  icon: React.ReactNode;
  description: string;
  articles: HelpArticle[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    label: 'Bắt đầu',
    icon: <BookOpen size={22} aria-hidden="true" />,
    description: 'Thiết lập hệ thống và onboarding cho người dùng mới.',
    articles: [
      { slug: 'dang-ky-tai-khoan', title: 'Đăng ký tài khoản dùng thử', excerpt: 'Tạo tài khoản và cấu hình tenant đầu tiên trong 5 phút.', readTime: 3 },
      { slug: 'tao-checkpoint-tuan-tra', title: 'Tạo checkpoint tuần tra', excerpt: 'Hướng dẫn tạo và cấu hình checkpoint QR cho đội tuần tra.', readTime: 5 },
      { slug: 'them-nhan-vien', title: 'Thêm nhân viên vào hệ thống', excerpt: 'Quản lý danh sách nhân viên, phân quyền và tạo tài khoản.', readTime: 4 },
    ],
  },
  {
    id: 'patrol',
    label: 'Tuần tra',
    icon: <Shield size={22} aria-hidden="true" />,
    description: 'Quản lý tuyến tuần tra, QR scan và xử lý báo cáo bất thường.',
    articles: [
      { slug: 'scan-qr-tuan-tra', title: 'Cách quét QR trong ca tuần tra', excerpt: 'Hướng dẫn sử dụng tính năng QR Scan trên thiết bị di động.', readTime: 3 },
      { slug: 'offline-mode', title: 'Tuần tra khi mất sóng (Offline)', excerpt: 'SCMD Pro hỗ trợ lưu dữ liệu ngoại tuyến và đồng bộ khi có mạng.', readTime: 4 },
      { slug: 'bao-cao-su-co', title: 'Báo cáo sự cố tại hiện trường', excerpt: 'Ghi nhận và xử lý sự cố ngay trong app, đính kèm ảnh và GPS.', readTime: 5 },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo',
    icon: <BarChart3 size={22} aria-hidden="true" />,
    description: 'Xuất báo cáo PDF/Excel và phân tích dữ liệu vận hành.',
    articles: [
      { slug: 'xuat-bao-cao-pdf', title: 'Xuất báo cáo PDF tự động', excerpt: 'Cấu hình lịch xuất báo cáo định kỳ và tùy chỉnh mẫu báo cáo.', readTime: 4 },
      { slug: 'bao-cao-cham-cong', title: 'Xem báo cáo chấm công', excerpt: 'Hướng dẫn đọc và lọc dữ liệu chấm công theo ngày, tuần, tháng.', readTime: 3 },
    ],
  },
  {
    id: 'admin',
    label: 'Quản trị',
    icon: <Users size={22} aria-hidden="true" />,
    description: 'Cấu hình hệ thống, phân quyền và quản lý subscription.',
    articles: [
      { slug: 'phan-quyen-nhan-vien', title: 'Phân quyền truy cập cho nhân viên', excerpt: 'RBAC theo vai trò: Tenant Admin, Supervisor, Guard, Technician.', readTime: 5 },
      { slug: 'nang-cap-goi-pro', title: 'Nâng cấp lên gói Enterprise PRO', excerpt: 'Quy trình thanh toán và kích hoạt gói PRO cho tenant.', readTime: 3 },
    ],
  },
  {
    id: 'ai-watcher',
    label: 'AI Watcher',
    icon: <Settings size={22} aria-hidden="true" />,
    description: 'Cấu hình AI phát hiện bất thường và đọc kết quả phân tích.',
    articles: [
      { slug: 'ai-watcher-la-gi', title: 'AI Watcher hoạt động như thế nào?', excerpt: 'Giải thích cơ chế phát hiện bất thường dựa trên quỹ đạo di chuyển.', readTime: 6 },
      { slug: 'xem-canh-bao-ai', title: 'Xem và xử lý cảnh báo AI', excerpt: 'Hướng dẫn đọc kết quả phân tích và xác nhận/bác bỏ cảnh báo.', readTime: 4 },
    ],
  },
];

const QUICK_STATS = [
  { value: `${CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0)}+`, label: 'Bài hướng dẫn' },
  { value: '24/7', label: 'Hỗ trợ trực tuyến' },
  { value: '< 2h', label: 'Thời gian phản hồi' },
];

// ─── SEO Schema ───────────────────────────────────────────────────────────────

function buildFAQSchema(categories: HelpCategory[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: categories.flatMap((cat) =>
      cat.articles.map((a) => ({
        '@type': 'Question',
        name: a.title,
        acceptedAnswer: { '@type': 'Answer', text: a.excerpt },
      }))
    ),
  };
}

function buildBreadcrumbSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://scmdpro.com' },
      { '@type': 'ListItem', position: 2, name: 'Hướng dẫn', item: 'https://scmdpro.com/help' },
    ],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const HelpPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = query.toLowerCase();

  const visibleCategories = CATEGORIES
    .filter((cat) => !activeCategory || cat.id === activeCategory)
    .map((cat) => ({
      ...cat,
      articles: normalizedQuery
        ? cat.articles.filter(
            (a) =>
              a.title.toLowerCase().includes(normalizedQuery) ||
              a.excerpt.toLowerCase().includes(normalizedQuery)
          )
        : cat.articles,
    }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <>
      <SEOHead
        title="Hướng dẫn sử dụng SCMD Pro | Help Center"
        description="Hướng dẫn đầy đủ về cách sử dụng SCMD Pro: tuần tra thông minh, AI Watcher, báo cáo tự động và quản lý nhân sự bảo vệ."
        url="https://scmdpro.com/help"
        type="website"
      />
      <JsonLd data={buildFAQSchema(CATEGORIES)} />
      <JsonLd data={buildBreadcrumbSchema()} />

      <div className="min-h-screen bg-[#0B0F1A] font-sans text-[#E5E7EB]">
        <LandingHeader />

        {/* Hero */}
        <section
          className="border-b border-white/5 bg-gradient-to-b from-[#0F172A] to-[#0B0F1A] pb-12 pt-14 px-5"
          aria-labelledby="help-hero-heading"
        >
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
            <Link to="/" className="transition-colors hover:text-[#3B82F6]">Trang chủ</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-[#E5E7EB]">Hướng dẫn</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6] border border-[#3B82F6]/20">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Help Center
            </div>

            <h1
              id="help-hero-heading"
              className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl md:text-5xl"
            >
              Bạn cần hỗ trợ gì?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#94A3B8]">
              Tìm hướng dẫn, tài liệu và câu trả lời cho mọi câu hỏi về SCMD Pro.
            </p>

            {/* Quick stats */}
            <div className="mt-8 flex items-center justify-center gap-8">
              {QUICK_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-bold text-[#3B82F6]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-[#94A3B8]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative mx-auto mt-8 max-w-xl">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                placeholder="Tìm kiếm hướng dẫn..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm kiếm hướng dẫn"
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm font-medium text-[#E5E7EB] shadow-sm placeholder:text-[#64748B] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all duration-200 ease-out"
              />
            </div>
          </motion.div>
        </section>

        {/* Category filter — sticky */}
        <nav
          aria-label="Lọc theo danh mục"
          className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-5 py-3 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              aria-pressed={!activeCategory}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ease-out ${
                !activeCategory
                  ? 'bg-[#3B82F6] text-white'
                  : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                aria-pressed={activeCategory === cat.id}
                className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeCategory === cat.id
                    ? CATEGORY_CLASSES[cat.label] || CATEGORY_CLASSES.default
                    : 'bg-transparent text-[#94A3B8] border-white/10 hover:border-white/20'
                }`}
              >
                <span className="h-4 w-4">
                  {cat.icon}
                </span>
                {cat.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Articles */}
        <main className="mx-auto max-w-6xl px-5 py-10 pb-20">
          {visibleCategories.length === 0 && (
            <div role="status" className="py-24 text-center">
              <Search size={40} className="mx-auto mb-4 text-gray-200" aria-hidden="true" />
              <p className="font-bold text-gray-400">
                Không tìm thấy kết quả cho &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {visibleCategories.map((cat, catIndex) => (
            <motion.section
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.06, duration: 0.3, ease: "easeInOut" }}
              className="mb-12"
              aria-labelledby={`cat-heading-${cat.id}`}
            >
              {/* Category header */}
              {(() => {
                const catClass = CATEGORY_CLASSES[cat.label] || CATEGORY_CLASSES.default;
                return (
                  <div className="mb-6 flex items-center gap-4">
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border ${catClass}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <h2 id={`cat-heading-${cat.id}`} className="text-lg font-bold text-[#E5E7EB]">
                        {cat.label}
                      </h2>
                      <p className="text-xs text-[#94A3B8]">{cat.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Articles grid */}
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ listStyle: 'none', padding: 0 }}>
                {cat.articles.map((article) => (
                  <li key={article.slug}>
                    <a
                      href={`/help/${article.slug}`}
                      className="group block h-full rounded-2xl border border-white/5 bg-white/3 p-5 backdrop-blur-xl transition-all duration-200 ease-out hover:border-[#3B82F6]/40 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                    >
                      <h3
                        className="mb-2 text-sm font-bold leading-snug text-[#E5E7EB] transition-colors group-hover:text-[#3B82F6]"
                      >
                        {article.title}
                      </h3>
                      <p className="mb-4 text-xs leading-relaxed text-[#94A3B8]">{article.excerpt}</p>
                      <div className="flex items-center justify-between text-[#94A3B8]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                          <Clock size={12} aria-hidden="true" />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{article.readTime}</span> 
                          <span> phút đọc</span>
                        </div>
                        {(() => {
                          const catClass = CATEGORY_CLASSES[cat.label] || CATEGORY_CLASSES.default;
                          const textColor = catClass.split(' ').find(c => c.startsWith('text-')) || 'text-[#3B82F6]';
                          return (
                            <ChevronRight
                              size={14}
                              aria-hidden="true"
                              className={`transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 ${textColor}`}
                            />
                          );
                        })()}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </main>

        {/* Footer CTA */}
        <footer className="border-t border-white/5 bg-[#0F172A] py-14 text-center px-5">
          <div className="mx-auto max-w-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 mx-auto border border-white/10">
              <MessageCircle className="h-7 w-7 text-[#3B82F6]" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-[#E5E7EB]">Vẫn chưa tìm được câu trả lời?</h2>
            <p className="mb-6 text-sm text-[#94A3B8]">
              Đội hỗ trợ của chúng tôi trực tuyến 24/7, sẵn sàng hỗ trợ qua chat hoặc email.
            </p>
            <a
              href="mailto:support@scmdpro.com"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#3B82F6] px-6 text-sm font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all hover:brightness-110 active:scale-95"
            >
              Liên hệ hỗ trợ 24/7
            </a>
          </div>
        </footer>
      </div>
    </>
  );
};
