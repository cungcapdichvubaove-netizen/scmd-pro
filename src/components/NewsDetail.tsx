import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Tag, Bookmark, Share2, TrendingUp } from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin } from 'react-icons/fa';

import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd } from '@/components/seo/JsonLd';
import { PUBLIC_NEWS_ARTICLES, findPublicNewsArticle } from '@/components/news/publicNewsArticles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsArticle {
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

interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore?: boolean;
}

type SharePlatform = 'facebook' | 'twitter' | 'linkedin' | 'native';

interface NewsDetailProps {
  onBack: () => void;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Public route — /api/v1/news/:slug
 * Route /api/v1/sys-manage/news/:slug KHÔNG tồn tại trên backend.
 */
async function fetchArticle(slug: string): Promise<NewsArticle> {
  try {
    const res = await fetch(`/api/v1/news/${slug}`);
    if (res.ok) return res.json();
  } catch {
    // Use bundled public articles when the API is unavailable in public/static mode.
  }

  const fallback = findPublicNewsArticle(slug);
  if (!fallback) throw new Error(`Fetch article failed: ${slug}`);
  return fallback;
}

/**
 * Lấy danh sách news để lọc related articles phía client.
 * TODO: Khi backend hỗ trợ /api/v1/news?category=X thì chuyển sang server-filter.
 */
async function fetchRelated(
  currentId: string,
  category: string,
): Promise<NewsArticle[]> {
  let all: NewsArticle[] = PUBLIC_NEWS_ARTICLES;

  try {
    const res = await fetch('/api/v1/news');
    if (res.ok) {
      const json: NewsArticle[] | PaginatedResponse<NewsArticle> = await res.json();
      const items = Array.isArray(json) ? json : (json.data ?? []);
      if (items.length > 0) all = items;
    }
  } catch {
    // Keep bundled public articles as the safe fallback.
  }

  return all
    .filter((a) => a.id !== currentId && a.category === category)
    .slice(0, 3);
}

// ─── Share utils ──────────────────────────────────────────────────────────────

function buildShareUrl(platform: SharePlatform, url: string, title: string): string | null {
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case 'native':
      return null; // handled separately
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NewsDetail: React.FC<NewsDetailProps> = ({ onBack }) => {
  const { slug } = useParams<{ slug: string }>();

  // Guard: slug phải là string hợp lệ
  const validSlug = slug && typeof slug === 'string' ? slug : null;

  const { data: fetchedArticle, isLoading } = useQuery<NewsArticle>({
    queryKey: ['news', validSlug],
    queryFn: () => fetchArticle(validSlug!),
    enabled: !!validSlug,
  });

  const staticArticle = validSlug ? findPublicNewsArticle(validSlug) : undefined;
  const article = fetchedArticle ?? staticArticle;

  const { data: relatedArticles = [] } = useQuery<NewsArticle[]>({
    queryKey: ['news', 'related', article?.id, article?.category],
    queryFn: () => fetchRelated(article!.id, article!.category),
    enabled: !!article,
  });

  // ─── Share handler ──────────────────────────────────────────────────────────

  const handleShare = useCallback(
    async (platform: SharePlatform) => {
      const url = window.location.href;
      const title = article?.title ?? 'SCMD Pro News';

      if (platform === 'native') {
        if (navigator.share) {
          await navigator.share({ title, text: article?.excerpt, url }).catch(() => null);
        } else {
          await navigator.clipboard.writeText(url);
          // TODO: thay alert bằng toast notification
          alert('Đã sao chép link!');
        }
        return;
      }

      const shareUrl = buildShareUrl(platform, url, title);
      if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
    },
    [article],
  );

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Đang tải bài viết"
        className="min-h-screen flex items-center justify-center bg-slate-950"
      >
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Not found ──────────────────────────────────────────────────────────────

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-6">
        <h1 className="text-4xl font-black text-white mb-4">Không tìm thấy bài viết</h1>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
        >
          Quay lại
        </button>
      </div>
    );
  }

  // ─── SEO data ───────────────────────────────────────────────────────────────

  const seoTitle = article.seoTitle ?? article.title;
  const seoDescription = article.seoDescription ?? article.excerpt;
  const canonicalUrl = `https://scmdpro.com/news/${article.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: seoDescription,
    image: article.thumbnail,
    author: { '@type': 'Person', name: article.author },
    publisher: { '@type': 'Organization', name: 'SCMD Pro', url: 'https://scmdpro.com' },
    datePublished: article.publishedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    keywords: article.tags?.join(', '),
    inLanguage: 'vi-VN',
    isAccessibleForFree: true,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* SEO — dùng component đã có thay vì inject DOM thủ công */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={article.thumbnail}
        url={canonicalUrl}
        type="article"
      />
      <JsonLd data={articleSchema} />

      <div className="bg-slate-950 text-slate-100 min-h-screen">
        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-50"
        />

        {/* Hero */}
        <header className="relative h-[60vh] overflow-hidden">
          <img
            src={article.thumbnail}
            alt={article.title}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950" aria-hidden="true" />
          <div className="absolute bottom-10 left-6 right-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Quay lại
            </button>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {article.title}
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10">
          {/* Share Sidebar */}
          <aside aria-label="Chia sẻ bài viết" className="lg:col-span-1 flex lg:flex-col gap-4">
            {(
              [
                { platform: 'facebook', Icon: FaFacebook, label: 'Chia sẻ Facebook' },
                { platform: 'twitter', Icon: FaTwitter, label: 'Chia sẻ Twitter' },
                { platform: 'linkedin', Icon: FaLinkedin, label: 'Chia sẻ LinkedIn' },
                { platform: 'native', Icon: Share2, label: 'Chia sẻ khác' },
              ] as const
            ).map(({ platform, Icon, label }) => (
              <button
                key={platform}
                type="button"
                aria-label={label}
                onClick={() => handleShare(platform)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-[#2563EB]/10 hover:text-[#4285F4] transition-all"
              >
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </aside>

          {/* Article Body */}
          <article className="lg:col-span-8">
            <div className="prose prose-invert prose-lg max-w-none">
              <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg flex items-center gap-1.5 text-xs text-slate-400"
                  >
                    <Tag size={11} aria-hidden="true" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Save CTA */}
            <div className="mt-12 p-6 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Bookmark size={20} className="text-slate-400" aria-hidden="true" />
                <p className="font-bold text-white">Lưu bài viết</p>
              </div>
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors active:scale-95"
              >
                Lưu
              </button>
            </div>
          </article>

          {/* Related Articles */}
          <aside aria-label="Bài viết liên quan" className="lg:col-span-3">
            <h3 className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest mb-6">
              <TrendingUp size={16} aria-hidden="true" className="text-[#4285F4]" />
              Liên quan
            </h3>
            <div className="space-y-4">
              {relatedArticles.map((rel) => (
                <div
                  key={rel.id}
                  className="p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-[#2563EB]/30 transition-colors"
                >
                  <p className="text-sm text-[#CCD6F6] font-bold leading-snug">{rel.title}</p>
                  {rel.excerpt && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rel.excerpt}</p>
                  )}
                </div>
              ))}
              {relatedArticles.length === 0 && (
                <p className="text-xs text-slate-600">Không có bài viết liên quan.</p>
              )}
            </div>
          </aside>
        </main>
      </div>
    </>
  );
};
