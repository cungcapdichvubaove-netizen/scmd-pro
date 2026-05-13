import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  ChevronLeft, 
  Calendar, 
  User, 
  ExternalLink, 
  AlertCircle,
  Loader2
} from 'lucide-react';

/**
 * SCMD Pro - News & Announcements Component
 * UI/UX: Deep Navy Theme (#0D1324) & Thumb-first Layout
 */

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  imageUrl?: string;
}

interface NewsPageProps {
  onBack: () => void;
  onArticleClick?: (article: Article) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, onArticleClick }) => {
  // Mock data for demonstration - in production this uses the real data stream pipeline
  const { data: articles, isLoading, isError } = useQuery<Article[]>({
    queryKey: ['news-announcements'],
    queryFn: async () => {
      // Logic for AI analysis or real-time stream would be triggered here
      return [
        {
          id: '1',
          title: 'Hệ thống SCMD Pro cập nhật phiên bản 2.0.5',
          summary: 'Cập nhật kiến trúc Clean Architecture và cơ chế Smart Patrol mới.',
          content: 'Nội dung chi tiết về đợt cập nhật Enterprise Security Management System...',
          author: 'System Admin',
          publishedAt: '2026-04-20',
          category: 'Hệ thống'
        }
      ];
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg)] text-[#CCD6F6]">
        <Loader2 className="w-10 h-10 animate-spin text-[#4285F4] mb-4" />
        <p className="text-sm font-medium">Đang tải bản tin...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-bg)] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-[#CCD6F6] font-bold mb-2">Không thể tải dữ liệu</h3>
        <button 
          onClick={onBack}
          className="h-12 px-6 bg-[var(--color-primary-accent)] text-[var(--color-text-primary)] rounded-lg font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[#CCD6F6] overflow-hidden">
      {/* Header - Navy Professional */}
      <header className="flex items-center justify-between px-4 h-16 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="flex items-center justify-center h-12 w-12 rounded-full hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 text-[#4285F4]" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">Bản Tin An Ninh</h1>
        <div className="w-12" /> {/* Spacer for symmetry */}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        <AnimatePresence mode="popLayout">
          {articles?.map((article: Article, index: number) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onArticleClick?.(article)}
              className="bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[#2E3447] active:scale-[0.98] transition-transform cursor-pointer shadow-lg"
            >
              {article.imageUrl && (
                <div className="h-40 w-full overflow-hidden">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=400&h=225&auto=format&fit=crop";
                      target.onerror = null;
                    }}
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary-accent)]/10 text-[#4285F4] uppercase tracking-wider">
                    {article.category}
                  </span>
                  <div className="flex items-center text-[#8892B0] text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {article.publishedAt}
                  </div>
                </div>
                <h2 className="text-lg font-bold text-[#CCD6F6] leading-tight mb-2">
                  {article.title}
                </h2>
                <p className="text-[#8892B0] text-sm line-clamp-2">
                  {article.summary}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-[#8892B0] text-xs">
                    <User className="w-3 h-3 mr-1" />
                    {article.author}
                  </div>
                  <div className="flex items-center text-[#4285F4] text-xs font-semibold">
                    Xem chi tiết
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </main>

      {/* Thumb-first Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-20">
        <button 
          className="h-14 w-14 bg-[var(--color-primary-accent)] text-[var(--color-text-primary)] rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform shadow-[#4285F4]/20"
          onClick={() => {/* Trigger AI logic analysis or feedback */}}
        >
          <Newspaper className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

