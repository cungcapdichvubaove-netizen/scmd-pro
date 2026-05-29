import { Link } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  thumbnail?: string;
  category?: string;
  publishedAt?: string;
  author?: string;
}

interface NewsCardProps {
  article: NewsArticleSummary;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const THUMBNAIL_FALLBACK =
  'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=640&h=360&auto=format&fit=crop';

// ─── Component ────────────────────────────────────────────────────────────────

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article
      itemScope
      itemType="https://schema.org/NewsArticle"
      className="group overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5"
    >
      <Link to={`/news/${article.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1324] rounded-2xl">
        {/* Thumbnail */}
        <div className="aspect-video w-full overflow-hidden bg-slate-900">
          <img
            src={article.thumbnail ?? THUMBNAIL_FALLBACK}
            alt={article.title}
            itemProp="image"
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== THUMBNAIL_FALLBACK) {
                img.src = THUMBNAIL_FALLBACK;
              }
            }}
          />
        </div>

        {/* Body */}
        <div className="p-5">
          {article.category && (
            <span className="mb-3 inline-block rounded-full bg-[#2563EB]/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#4285F4]">
              {article.category}
            </span>
          )}

          <h2
            itemProp="headline"
            className="mb-2 text-base font-black leading-snug text-[#CCD6F6] transition-colors group-hover:text-white"
          >
            {article.title}
          </h2>

          <p
            itemProp="description"
            className="line-clamp-2 text-sm leading-relaxed text-[#8892B0]"
          >
            {article.excerpt}
          </p>

          {/* Meta */}
          {(article.author || article.publishedAt) && (
            <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#8892B0]">
              {article.author && (
                <span itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">{article.author}</span>
                </span>
              )}
              {article.author && article.publishedAt && <span aria-hidden="true">·</span>}
              {article.publishedAt && (
                <time itemProp="datePublished" dateTime={article.publishedAt}>
                  {article.publishedAt}
                </time>
              )}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
