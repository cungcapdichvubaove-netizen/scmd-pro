import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Newspaper,
  ChevronLeft,
  Calendar,
  User,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/seo/SEOHead';
import { LandingHeader } from './LandingHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type NewsCategoryLabel = 'Cập nhật' | 'Tính năng' | 'Bảo mật' | 'Hướng dẫn';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  excerpt?: string;
  content: string;
  author: string;
  publishedAt: string;
  category: NewsCategoryLabel;
  imageUrl?: string;
  thumbnail?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

interface NewsPageProps {
  onBack?: () => void;
  onArticleClick?: (slug: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THUMBNAIL_FALLBACK =
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=400&h=225&auto=format&fit=crop';

const CATEGORY_CLASSES: Record<NewsCategoryLabel | 'default', string> = {
  'Cập nhật': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'Tính năng': 'bg-green-500/10 text-green-500 border-green-500/20',
  'Bảo mật': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Hướng dẫn': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  default: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchNews(): Promise<Article[]> {
  const res = await fetch('/api/v1/news');
  if (!res.ok) throw new Error(`Failed to fetch news: ${res.status}`);
  const json: Article[] | PaginatedResponse<Article> = await res.json();
  return Array.isArray(json) ? json : (json.data ?? []);
}

// ─── ArticleCard ──────────────────────────────────────────────────────────────

function ArticleCard({
  article,
  index,
  onClick,
}: {
  article: Article;
  index: number;
  onClick: () => void;
}) {
  const thumbnail = article.imageUrl ?? article.thumbnail;
  const summary = article.summary ?? article.excerpt; // Use summary or excerpt
  const catClass = CATEGORY_CLASSES[article.category] || CATEGORY_CLASSES['default'];
  // Trích xuất màu chữ từ catClass để áp dụng cho icon, đảm bảo đồng bộ
  const iconColor = catClass.split(' ').find((c) => c.startsWith('text-')) || 'text-blue-500';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: Math.min(index * 0.07, 0.4), duration: 0.3 }}
      onClick={onClick}
      role="button" // Semantic role for clickable element
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`Đọc bài: ${article.title}`}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-white/3 p-6 backdrop-blur-xl transition-all hover:border-[#3B82F6]/40"
    >
      {thumbnail && (
        <div className="h-44 w-full overflow-hidden rounded-lg bg-white/5 mb-4">
          <img
            src={thumbnail}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            style={{ aspectRatio: '16/9' }}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== THUMBNAIL_FALLBACK) img.src = THUMBNAIL_FALLBACK;
            }}
          />
        </div>
      )}

      <div className="p-0"> {/* Padding moved to card itself */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 group-hover:bg-opacity-30 group-hover:border-opacity-40 ${catClass}`}
          >
            {article.category}
          </span>
          <div className="flex items-center gap-1 text-xs text-[#64748B]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Calendar className={`h-3 w-3 ${iconColor} opacity-70 transition-opacity duration-200 group-hover:opacity-100`} aria-hidden="true" />
            <time dateTime={article.publishedAt}>
              {article.publishedAt}
            </time>
          </div>
        </div>

        <h2 className="mb-2 text-lg font-bold leading-snug text-[#E5E7EB] transition-colors duration-200 ease-out group-hover:text-[#3B82F6]">
          {article.title}
        </h2>

        {summary && (
          <p className="text-sm leading-relaxed text-[#94A3B8] line-clamp-2">{summary}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <User className={`h-3 w-3 ${iconColor} opacity-70 transition-opacity duration-200 group-hover:opacity-100`} aria-hidden="true" />
            {article.author}
          </div>
          <div className={`flex items-center gap-1 text-xs font-semibold ${iconColor}`}>
            Xem chi tiết
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, onArticleClick }) => {
  const [activeCategory, setActiveCategory] = useState<NewsCategoryLabel | null>(null);

  const { data: articles, isLoading, isError } = useQuery<Article[]>({
    queryKey: ['news-public'],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
  });

  const categories = articles
    ? Array.from(new Set(articles.map((a) => a.category)))
    : [];

  const visibleArticles = activeCategory
    ? articles?.filter((a) => a.category === activeCategory)
    : articles;

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A]">
        <LandingHeader />
        <div role="status" aria-label="Đang tải bản tin" className="flex flex-col items-center justify-center py-32 text-[#94A3B8]">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#3B82F6]" aria-hidden="true" />
          <p className="text-sm font-medium">Đang tải bản tin...</p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0B0F1A]">
        <LandingHeader />
        <div role="alert" className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" aria-hidden="true" />
          <h3 className="mb-2 font-bold text-[#E5E7EB]">Không thể tải dữ liệu</h3>
          <p className="mb-6 text-sm text-[#94A3B8]">Vui lòng kiểm tra kết nối và thử lại.</p>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="h-12 rounded-xl bg-[#3B82F6] px-6 text-sm font-bold text-white transition-all hover:brightness-110"
            >
              Quay lại
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-[#E5E7EB]">
      <SEOHead
        title="Tin tức từ SCMD Pro | Cập nhật & Thông báo"
        description="Cập nhật tính năng mới, hướng dẫn vận hành và các thông báo quan trọng từ đội ngũ phát triển SCMD Pro."
        url="https://scmdpro.com/news"
        type="article" // Giả định các bài tin tức là loại 'article'
      />
      <LandingHeader />

      {/* Hero section */}
      <section className="border-b border-white/5 bg-gradient-to-b from-[#0F172A] to-[#0B0F1A] py-14 px-5 text-center" aria-labelledby="news-heading">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
          <Link to="/" className="transition-colors hover:text-[#3B82F6]">Trang chủ</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-[#E5E7EB]">Bản tin</span>
        </nav>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#3B82F6]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3B82F6] border border-[#3B82F6]/20">
          <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
          Bản tin & Cập nhật
        </div>
        <h1 id="news-heading" className="mt-3 text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
          Tin tức từ SCMD Pro
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-[#94A3B8]">
          Cập nhật tính năng mới, hướng dẫn vận hành và các thông báo quan trọng từ đội ngũ phát triển.
        </p>
      </section>

      {/* Category filter */}
      {categories.length > 0 && (
        <nav aria-label="Lọc theo danh mục" className="sticky top-16 z-20 border-b border-white/5 bg-[#0B0F1A]/70 backdrop-blur-md">
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
            {categories.map((cat) => {
              const catClass = CATEGORY_CLASSES[cat] || CATEGORY_CLASSES['default'];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  aria-pressed={activeCategory === cat}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeCategory === cat
                      ? catClass
                      : 'bg-transparent text-[#94A3B8] border-white/10 hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Article grid */}
      <main className="mx-auto max-w-6xl px-5 py-10 pb-20">
        <AnimatePresence mode="popLayout">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleArticles?.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={index}
                onClick={() => onArticleClick?.(article.slug)}
              />
            ))}
          </div>
        </AnimatePresence>

        {visibleArticles?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Newspaper className="mb-4 h-12 w-12 text-gray-200" aria-hidden="true" />
            <p className="font-bold text-[#94A3B8]">Chưa có bản tin nào trong danh mục này.</p>
          </div>
        )}
      </main>

      {/* Back FAB — mobile only */}
      {onBack && (
        <div className="fixed bottom-6 right-6 z-20 md:hidden">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-2xl shadow-[#3B82F6]/30 transition-transform active:scale-90"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
