import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Newspaper,
  ChevronLeft,
  Calendar,
  User,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import { PUBLIC_NEWS_ARTICLES } from "./news/publicNewsArticles";

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  excerpt?: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  imageUrl?: string;
  thumbnail?: string;
  tags?: string[];
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

interface NewsPageProps {
  onBack: () => void;
  onArticleClick?: (slug: string) => void;
}

const THUMBNAIL_FALLBACK =
  "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&h=675&auto=format&fit=crop";

function formatPublishDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} phút đọc`;
}

async function fetchNews(): Promise<Article[]> {
  try {
    const res = await fetch("/api/v1/news");
    if (!res.ok) return PUBLIC_NEWS_ARTICLES;
    const json: Article[] | PaginatedResponse<Article> = await res.json();
    const items = Array.isArray(json) ? json : (json.data ?? []);
    return items.length > 0 ? items : PUBLIC_NEWS_ARTICLES;
  } catch {
    return PUBLIC_NEWS_ARTICLES;
  }
}

function NewsSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_20px_80px_rgba(2,6,23,0.35)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#4285F4]">
          SCMD Pro Newsroom
        </p>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-[30px]">
          {title}
        </h2>
      </div>
      <p className="max-w-2xl text-sm leading-7 text-[#9FB0D4] sm:text-base">
        {description}
      </p>
    </div>
  );
}

function FeaturedArticle({
  article,
  onClick,
}: {
  article: Article;
  onClick: () => void;
}) {
  const thumbnail = article.imageUrl ?? article.thumbnail ?? THUMBNAIL_FALLBACK;
  const summary = article.summary ?? article.excerpt;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#10182D] lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]"
    >
      <button
        type="button"
        onClick={onClick}
        className="grid text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-inset lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]"
        aria-label={`Đọc bài nổi bật: ${article.title}`}
      >
        <div className="relative min-h-[280px] overflow-hidden lg:min-h-[520px]">
          <img
            src={thumbnail}
            alt={article.title}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== THUMBNAIL_FALLBACK) img.src = THUMBNAIL_FALLBACK;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1324] via-[#0D1324]/32 to-transparent" />
        </div>

        <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#7FB0FF]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Bài nổi bật
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#CCD6F6]">
                {article.category}
              </span>
            </div>

            <h3 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[44px] lg:leading-[1.08]">
              {article.title}
            </h3>

            {summary && (
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#B2C0DE] sm:text-lg">
                {summary}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#AAB7D4]">
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-[#4285F4]" aria-hidden="true" />
                {article.author}
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#4285F4]" aria-hidden="true" />
                <time dateTime={article.publishedAt}>{formatPublishDate(article.publishedAt)}</time>
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[#4285F4]" aria-hidden="true" />
                {estimateReadTime(article.content)}
              </span>
            </div>

            <span className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-black text-white shadow-[0_14px_40px_rgba(37,99,235,0.28)] transition-transform duration-200 group-hover:translate-x-1">
              Xem phân tích chi tiết
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

function CompactArticleCard({
  article,
  index,
  onClick,
}: {
  article: Article;
  index: number;
  onClick: () => void;
}) {
  const thumbnail = article.imageUrl ?? article.thumbnail ?? THUMBNAIL_FALLBACK;
  const summary = article.summary ?? article.excerpt;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.24), duration: 0.28 }}
      className="group"
    >
      <button
        type="button"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick();
        }}
        className="flex w-full min-h-12 gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-left transition-all duration-200 hover:border-[#2563EB]/35 hover:bg-[#2563EB]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1324] sm:p-5"
        aria-label={`Đọc bài: ${article.title}`}
      >
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#18233E] sm:h-28 sm:w-28">
          <img
            src={thumbnail}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== THUMBNAIL_FALLBACK) img.src = THUMBNAIL_FALLBACK;
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
            <span className="rounded-full bg-[#2563EB]/12 px-2.5 py-1 text-[#7FB0FF]">
              {article.category}
            </span>
            <time className="text-[#7F8FB3]" dateTime={article.publishedAt}>
              {formatPublishDate(article.publishedAt)}
            </time>
          </div>

          <h3 className="line-clamp-2 text-base font-black leading-snug text-[#E6ECFF] transition-colors group-hover:text-white sm:text-lg">
            {article.title}
          </h3>

          {summary && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#95A5C8]">
              {summary}
            </p>
          )}

          <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#5C93FF]">
            Đọc tiếp
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </button>
    </motion.article>
  );
}

function NewsGridCard({
  article,
  index,
  onClick,
}: {
  article: Article;
  index: number;
  onClick: () => void;
}) {
  const thumbnail = article.imageUrl ?? article.thumbnail ?? THUMBNAIL_FALLBACK;
  const summary = article.summary ?? article.excerpt;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.3 }}
      itemScope
      itemType="https://schema.org/NewsArticle"
      className="group overflow-hidden rounded-[26px] border border-white/8 bg-white/[0.03] shadow-[0_18px_60px_rgba(2,6,23,0.22)] transition-all duration-200 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/[0.05]"
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1324]"
        aria-label={`Đọc bài: ${article.title}`}
      >
        <div className="aspect-[16/10] overflow-hidden bg-[#18233E]">
          <img
            src={thumbnail}
            alt={article.title}
            itemProp="image"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== THUMBNAIL_FALLBACK) img.src = THUMBNAIL_FALLBACK;
            }}
          />
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]">
            <span className="rounded-full bg-[#2563EB]/12 px-2.5 py-1 text-[#7FB0FF]">
              {article.category}
            </span>
            <time className="text-[#7F8FB3]" itemProp="datePublished" dateTime={article.publishedAt}>
              {formatPublishDate(article.publishedAt)}
            </time>
          </div>

          <h3 itemProp="headline" className="text-lg font-black leading-snug text-[#E6ECFF] transition-colors group-hover:text-white sm:text-xl">
            {article.title}
          </h3>

          {summary && (
            <p itemProp="description" className="mt-3 line-clamp-3 text-sm leading-7 text-[#95A5C8] sm:text-[15px]">
              {summary}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4 text-sm text-[#AAB7D4]">
            <span className="inline-flex min-w-0 items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0 text-[#4285F4]" aria-hidden="true" />
              <span itemProp="author" className="truncate">{article.author}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-[#5C93FF]">
              Xem bài
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

function NewsPageLoadingState() {
  return (
    <div className="flex min-h-full flex-col bg-[#0D1324] text-[#CCD6F6]">
      <div className="border-b border-white/10 bg-[#0D1324]/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-52 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div role="status" aria-label="Đang tải bản tin" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="min-h-[420px] animate-pulse rounded-[28px] bg-white/5" />
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-[24px] bg-white/5" />
            <div className="h-32 animate-pulse rounded-[24px] bg-white/5" />
            <div className="h-32 animate-pulse rounded-[24px] bg-white/5" />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-80 animate-pulse rounded-[26px] bg-white/5" />
          <div className="h-80 animate-pulse rounded-[26px] bg-white/5" />
          <div className="h-80 animate-pulse rounded-[26px] bg-white/5" />
        </div>
        <div className="inline-flex items-center justify-center gap-3 text-sm text-[#9FB0D4]">
          <Loader2 className="h-5 w-5 animate-spin text-[#4285F4]" aria-hidden="true" />
          Đang tải newsroom và cập nhật bài viết mới nhất...
        </div>
      </div>
    </div>
  );
}

function NewsPageErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#0D1324] px-4 py-10 text-[#CCD6F6] sm:px-6">
      <NewsSurface className="w-full max-w-xl p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
          <AlertCircle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-2xl font-black tracking-tight text-white">Không thể tải newsroom</h2>
        <p className="mt-3 text-sm leading-7 text-[#9FB0D4] sm:text-base">
          Kết nối dữ liệu công khai đang gián đoạn. Trang vẫn giữ fallback an toàn nhưng yêu cầu hiện tại không thể hoàn tất từ API.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-6 py-3 text-sm font-black text-white shadow-[0_14px_40px_rgba(37,99,235,0.28)] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1324]"
        >
          Quay lại trang trước
        </button>
      </NewsSurface>
    </div>
  );
}

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, onArticleClick }) => {
  const { data: articles, isLoading, isError } = useQuery<Article[]>({
    queryKey: ["news-public"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <NewsPageLoadingState />;
  }

  if (isError) {
    return <NewsPageErrorState onBack={onBack} />;
  }

  const safeArticles = articles ?? [];
  const featuredArticle = safeArticles[0];
  const highlightArticles = safeArticles.slice(1, 4);
  const gridArticles = safeArticles.slice(4);
  const categoryCount = new Set(safeArticles.map((article) => article.category)).size;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,#0D1324_0%,#0B1120_100%)] text-[#CCD6F6]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0D1324]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#7FB0FF] transition-all duration-200 hover:border-[#2563EB]/40 hover:bg-[#2563EB]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1324]"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 text-center lg:text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#4285F4]">Trusted Security Intelligence</p>
            <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-[28px]">
              Bản tin vận hành & compliance
            </h1>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9FB0D4] md:inline-flex">
            <ShieldCheck className="h-4 w-4 text-[#4285F4]" aria-hidden="true" />
            Curated for enterprise teams
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-8 lg:py-10">
        <NewsSurface className="overflow-hidden p-5 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#7FB0FF]">
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                Editorial Hub
              </p>
              <h2 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[52px] lg:leading-[1.05]">
                Góc nhìn đáng tin cậy cho giám sát dịch vụ bảo vệ thuê ngoài, tuần tra và SLA hiện trường.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#9FB0D4] sm:text-lg">
                Newsroom của SCMD Pro tổng hợp cập nhật sản phẩm, thực hành vận hành, hardening bảo mật và phân tích compliance để Security Director, HR/Admin và Site Supervisor ra quyết định nhanh hơn.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7F8FB3]">Bài viết</p>
                <p className="mt-3 text-3xl font-black text-white">{safeArticles.length}</p>
                <p className="mt-2 text-sm text-[#9FB0D4]">Nguồn insight đã biên tập</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7F8FB3]">Chuyên mục</p>
                <p className="mt-3 text-3xl font-black text-white">{categoryCount}</p>
                <p className="mt-2 text-sm text-[#9FB0D4]">Từ bảo mật đến vận hành</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7F8FB3]">Tiêu chí</p>
                <p className="mt-3 text-lg font-black text-white">Rõ ràng · Kiểm chứng · Hữu dụng</p>
                <p className="mt-2 text-sm text-[#9FB0D4]">Ưu tiên giá trị thực tế cho enterprise</p>
              </div>
            </div>
          </div>
        </NewsSurface>

        {featuredArticle ? (
          <section aria-labelledby="featured-stories-heading" className="space-y-5">
            <SectionHeader
              title="Bài viết nổi bật"
              description="Ưu tiên các nội dung có giá trị giải thích cao cho quyết định vận hành, đối soát chất lượng dịch vụ và hardening multi-tenant."
            />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
              <FeaturedArticle
                article={featuredArticle}
                onClick={() => onArticleClick?.(featuredArticle.slug)}
              />

              {highlightArticles.length > 0 && (
                <NewsSurface className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 id="featured-stories-heading" className="text-lg font-black text-white">Theo dõi tiếp</h3>
                      <p className="text-sm text-[#8FA2C7]">Những chủ đề đang được đội vận hành quan tâm</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {highlightArticles.map((article, index) => (
                      <CompactArticleCard
                        key={article.id}
                        article={article}
                        index={index}
                        onClick={() => onArticleClick?.(article.slug)}
                      />
                    ))}
                  </div>
                </NewsSurface>
              )}
            </div>
          </section>
        ) : null}

        {gridArticles.length > 0 && (
          <section aria-labelledby="latest-insights" className="space-y-5">
            <SectionHeader
              title="Phân tích mới nhất"
              description="Bố cục ưu tiên khả năng đọc, tách lớp thông tin rõ ràng và hỗ trợ quét nhanh trên desktop lẫn mobile cho các bài product, security và field operations."
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {gridArticles.map((article, index) => (
                <NewsGridCard
                  key={article.id}
                  article={article}
                  index={index}
                  onClick={() => onArticleClick?.(article.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {safeArticles.length === 0 && (
          <NewsSurface className="p-8 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-[#4285F4]">
              <Newspaper className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white">Chưa có bản tin công khai</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#9FB0D4] sm:text-base">
              Khi có nội dung mới về vận hành bảo vệ thuê ngoài, tuần tra, SLA hoặc bảo mật multi-tenant, newsroom sẽ hiển thị tại đây với cấu trúc biên tập rõ ràng.
            </p>
          </NewsSurface>
        )}
      </main>
    </div>
  );
};
