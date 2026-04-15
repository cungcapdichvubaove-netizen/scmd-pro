import React, { useState } from 'react';
import { ChevronRight, Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils'; // Giả sử bạn có utility này để gộp class

// Cần đổi tên từ NewsHeader thành NewsPage để khớp với import trong App.tsx
interface NewsPageProps {
  onBack?: () => void;
  onArticleClick?: (slug: string) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onBack, onArticleClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hướng dẫn');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const categories = ['Tất cả', 'Công nghệ', 'An ninh', 'Sự kiện', 'Hướng dẫn'];

  return (
    <div className="bg-[#020617] relative overflow-hidden font-sans">
      {/* Background Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8 relative z-10">
        
        {/* Breadcrumb / Back Button */}
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all mb-12 group backdrop-blur-md"
        >
          <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={14} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Trang chủ</span>
        </button>

        {/* Hero Content - Stacked Layout for better reading flow */}
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Trung tâm tin tức
          </div>

          {/* Headline - Fixed Typography Wrapping */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
            Cập nhật <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              An ninh & Công nghệ
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-2xl mb-10">
            Khám phá những xu hướng mới nhất, hướng dẫn chuyên sâu và tin tức về hệ thống quản lý bảo vệ thông minh thế hệ mới.
          </p>

          {/* Integrated Search Bar */}
          <div className={cn(
            "relative max-w-xl transition-all duration-300 rounded-2xl",
            isSearchFocused ? "shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50" : "ring-1 ring-white/10"
          )}>
            <Search className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
              isSearchFocused ? "text-blue-400" : "text-slate-500"
            )} size={20} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài viết, chủ đề..." 
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 backdrop-blur-md rounded-2xl text-sm focus:outline-none focus:bg-slate-900/80 text-white placeholder:text-slate-500 transition-all"
            />
            {/* Optional AI Sparkle hint */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hidden md:flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wider">Bấm Enter</span>
              <kbd className="px-2 py-1 bg-white/5 rounded text-xs font-mono border border-white/10">↵</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Divider & Tabs */}
      <div className="relative border-y border-white/5 bg-slate-950/50 backdrop-blur-xl mt-8">
        <div className="max-w-6xl mx-auto px-6 py-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap border",
                  selectedCategory === cat 
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};