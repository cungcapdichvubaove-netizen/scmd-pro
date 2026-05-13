import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

// UI Icons (lucide)
import {
  ArrowLeft,
  Tag,
  Bookmark,
  Share2,
  TrendingUp,
} from "lucide-react";

// Social Icons
import { FaFacebook, FaTwitter, FaLinkedin } from "react-icons/fa";

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

interface NewsDetailProps {
  onBack: () => void;
}

export const NewsDetail: React.FC<NewsDetailProps> = ({ onBack }) => {
  const { slug } = useParams<{ slug: string }>();

  // ===== FETCH ARTICLE =====
  const { data: article, isLoading } = useQuery<NewsArticle>({
    queryKey: ["news", slug],
    queryFn: async () => {
      const res = await fetch(`/api/news/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch article");
      return res.json();
    },
    enabled: !!slug,
  });

  // ===== RELATED =====
  const { data: relatedArticles = [] } = useQuery<NewsArticle[]>({
    queryKey: ["news", "related", article?.category],
    enabled: !!article,
    queryFn: async () => {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error("Failed to fetch news");
      const all = await res.json();

      return all
        .filter(
          (doc: NewsArticle) =>
            doc.id !== article?.id && doc.category === article?.category
        )
        .slice(0, 3);
    },
  });

  // ===== SHARE =====
  const handleShare = (
    platform: "facebook" | "twitter" | "linkedin" | "native"
  ) => {
    const url = window.location.href;
    const title = article?.title || "SCMD Pro News";

    switch (platform) {
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          "_blank"
        );
        break;

      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
          )}&text=${encodeURIComponent(title)}`,
          "_blank"
        );
        break;

      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            url
          )}`,
          "_blank"
        );
        break;

      case "native":
        if (navigator.share) {
          navigator
            .share({
              title,
              text: article?.excerpt,
              url,
            })
            .catch(console.error);
        } else {
          navigator.clipboard.writeText(url);
          alert("Đã sao chép link!");
        }
        break;
    }
  };

  // ===== LOADING =====
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ===== NOT FOUND =====
  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-6">
        <h1 className="text-4xl font-black text-white mb-4">
          Không tìm thấy bài viết
        </h1>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {/* PROGRESS BAR */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-50"
      />

      {/* HERO */}
      <header className="relative h-[60vh] overflow-hidden">
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-full object-cover opacity-40"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950" />

        <div className="absolute bottom-10 left-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>

          <h1 className="text-4xl font-black text-white">
            {article.title}
          </h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-10">
        {/* LEFT */}
        <aside className="lg:col-span-1 flex lg:flex-col gap-4">
          <button onClick={() => handleShare("facebook")}>
            <FaFacebook />
          </button>
          <button onClick={() => handleShare("twitter")}>
            <FaTwitter />
          </button>
          <button onClick={() => handleShare("linkedin")}>
            <FaLinkedin />
          </button>
          <button onClick={() => handleShare("native")}>
            <Share2 />
          </button>
        </aside>

        {/* ARTICLE */}
        <article className="lg:col-span-8">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>

          {/* TAGS */}
          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/5 rounded-lg flex items-center gap-1"
              >
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 p-6 bg-white/5 rounded-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Bookmark />
              <div>
                <p className="font-bold text-white">
                  Lưu bài viết
                </p>
              </div>
            </div>

            <button className="bg-blue-600 px-4 py-2 rounded-xl">
              Lưu
            </button>
          </div>
        </article>

        {/* RIGHT */}
        <aside className="lg:col-span-3">
          <h3 className="flex items-center gap-2 mb-4">
            <TrendingUp />
            Liên quan
          </h3>

          {relatedArticles.map((rel: NewsArticle) => (
            <div key={rel.id} className="mb-4">
              <p className="text-sm text-white">{rel.title}</p>
            </div>
          ))}
        </aside>
      </main>
    </div>
  );
};
