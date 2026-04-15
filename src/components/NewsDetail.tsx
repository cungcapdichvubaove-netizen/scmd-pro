import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  User, 
  Share2, 
  Facebook, 
  Twitter, 
  Linkedin,
  ArrowLeft,
  Tag,
  Bookmark,
  TrendingUp
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  thumbnail: string;
  category: string;
  author: string;
  published_at: any;
  tags: string[];
  seo_title?: string;
  seo_description?: string;
}

interface NewsDetailProps {
  slug: string;
  onBack: () => void;
}

export const NewsDetail: React.FC<NewsDetailProps> = ({ slug, onBack }) => {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'news'),
        where('slug', '==', slug),
        where('status', '==', 'published'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as NewsArticle;
        setArticle(data);
        fetchRelated(data.category, data.id);
      }
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async (category: string, currentId: string) => {
    try {
      const q = query(
        collection(db, 'news'),
        where('category', '==', category),
        where('status', '==', 'published'),
        limit(4)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as NewsArticle))
        .filter(doc => doc.id !== currentId)
        .slice(0, 3);
      setRelatedArticles(docs);
    } catch (error) {
      console.error("Error fetching related news:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black text-white mb-4">Không tìm thấy bài viết</h1>
        <p className="text-slate-400 mb-8">Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all"
        >
          Quay lại tin tức
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* SEO Metadata (Simulated) */}
      <title>{article.seo_title || article.title} | SCMD Pro News</title>
      <meta name="description" content={article.seo_description || article.excerpt} />

      {/* SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "headline": article.title,
          "image": [article.thumbnail],
          "datePublished": article.published_at?.toDate ? article.published_at.toDate().toISOString() : new Date().toISOString(),
          "author": [{
            "@type": "Person",
            "name": article.author
          }]
        })}
      </script>

      {/* Progress Bar */}
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        className="fixed top-0 left-0 right-0 h-1 bg-blue-600 origin-left z-50"
      />

      {/* Hero Header */}
      <header className="relative h-[60vh] min-h-[400px] overflow-hidden">
        <img 
          src={article.thumbnail || `https://picsum.photos/seed/${article.slug}/1920/1080`}
          alt={article.title}
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end pb-16">
          <div className="max-w-4xl mx-auto px-6 w-full">
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">Quay lại tin tức</span>
            </button>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-4 mb-6"
            >
              <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                {article.category}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Calendar size={12} />
                {article.published_at?.toDate ? article.published_at.toDate().toLocaleDateString('vi-VN') : '---'}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock size={12} />
                5 phút đọc
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[1.1]"
            >
              {article.title}
            </motion.h1>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Sidebar Left: Author & Share */}
        <aside className="lg:col-span-1 flex lg:flex-col items-center lg:items-start gap-8 lg:sticky lg:top-32 h-fit">
          <div className="flex flex-col items-center lg:items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-xl">
              {article.author.charAt(0)}
            </div>
            <div className="hidden lg:block text-center lg:text-left">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tác giả</p>
              <p className="text-sm font-bold text-white">{article.author}</p>
            </div>
          </div>

          <div className="w-px h-8 bg-white/5 lg:w-full lg:h-px" />

          <div className="flex lg:flex-col gap-4">
            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
              <Facebook size={18} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-blue-400 hover:text-white transition-all">
              <Twitter size={18} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-blue-700 hover:text-white transition-all">
              <Linkedin size={18} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all">
              <Share2 size={18} />
            </button>
          </div>
        </aside>

        {/* Article Body */}
        <article className="lg:col-span-8">
          <div className="prose prose-invert prose-blue max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:text-slate-300 prose-p:text-lg prose-p:leading-relaxed prose-strong:text-white prose-a:text-blue-400 prose-img:rounded-[32px] prose-img:shadow-2xl">
            <ReactMarkdown>{article.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-wrap gap-2">
            {article.tags?.map(tag => (
              <span key={tag} className="px-4 py-2 bg-white/5 rounded-xl text-xs font-bold text-slate-400 flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer">
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-16 p-8 bg-white/5 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                <Bookmark size={24} />
              </div>
              <div>
                <h4 className="font-black text-white">Bạn thấy bài viết hữu ích?</h4>
                <p className="text-sm text-slate-500 font-medium">Lưu lại để đọc sau hoặc chia sẻ với đồng nghiệp.</p>
              </div>
            </div>
            <button className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">
              Lưu bài viết
            </button>
          </div>
        </article>

        {/* Sidebar Right: Related */}
        <aside className="lg:col-span-3 space-y-10">
          <div>
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={20} />
              Bài viết liên quan
            </h3>
            <div className="space-y-6">
              {relatedArticles.map(rel => (
                <div 
                  key={rel.id}
                  onClick={() => {
                    window.scrollTo(0, 0);
                    onBack(); // This is a bit hacky, better to have a direct navigate
                  }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-video rounded-xl overflow-hidden mb-3">
                    <img 
                      src={rel.thumbnail || `https://picsum.photos/seed/${rel.slug}/400/225`}
                      alt={rel.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="font-bold text-white text-sm leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                    {rel.published_at?.toDate ? rel.published_at.toDate().toLocaleDateString('vi-VN') : '---'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] text-white shadow-2xl shadow-blue-600/20">
            <h3 className="text-xl font-black mb-4">Trải nghiệm SCMD Pro 2026</h3>
            <p className="text-sm font-medium text-blue-100 mb-6 leading-relaxed">Hệ thống quản lý an ninh thông minh nhất hiện nay. Thử nghiệm miễn phí 14 ngày.</p>
            <button className="w-full py-3 bg-white text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all">
              Dùng thử ngay
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};
