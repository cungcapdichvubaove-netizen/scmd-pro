import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Book, Search, ChevronRight, HelpCircle, Shield, Settings, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface HelpArticle {
  id: string;
  title: string;
  category: 'Admin' | 'Guard' | 'General';
  content: string;
  lastUpdated: string;
}

export const HelpCenter: React.FC = () => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/help/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('Failed to fetch help articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Admin', 'Guard', 'General'];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[32px] overflow-hidden border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="bg-white p-8 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <HelpCircle className="text-scmd-cyber" size={32} />
              Trung tâm Hỗ trợ SCMD
            </h2>
            <p className="text-slate-400 mt-1 font-medium">Tra cứu hướng dẫn vận hành và quy trình chuẩn.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Tìm kiếm hướng dẫn..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-scmd-cyber/10 focus:border-scmd-cyber transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Wiki Navigation */}
        <div className="w-full md:w-80 bg-white border-r border-slate-100 overflow-y-auto p-6 space-y-8">
          {categories.map(category => {
            const categoryArticles = filteredArticles.filter(a => a.category === category);
            if (categoryArticles.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  {category === 'Admin' ? <Settings size={14} className="text-slate-400" /> : 
                   category === 'Guard' ? <Shield size={14} className="text-slate-400" /> : 
                   <Book size={14} className="text-slate-400" />}
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {category === 'Admin' ? 'Dành cho Quản trị' : 
                     category === 'Guard' ? 'Dành cho Bảo vệ' : 'Chung'}
                  </h3>
                </div>
                <div className="space-y-1">
                  {categoryArticles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group",
                        selectedArticle?.id === article.id 
                          ? "bg-scmd-cyber text-slate-950 shadow-lg shadow-scmd-cyber/20" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span className="truncate">{article.title}</span>
                      <ChevronRight size={14} className={cn(
                        "transition-transform",
                        selectedArticle?.id === article.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-scmd-cyber border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-8 md:p-12">
          {selectedArticle ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                    selectedArticle.category === 'Admin' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                    selectedArticle.category === 'Guard' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                    "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {selectedArticle.category}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <Clock size={12} />
                    Cập nhật: {new Date(selectedArticle.lastUpdated).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {selectedArticle.title}
                </h1>
              </div>

              <div className="prose prose-slate prose-lg max-w-none 
                prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-strong:text-slate-900 prose-strong:font-black
                prose-ul:list-disc prose-ul:pl-6
                prose-li:text-slate-600
                prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-scmd-cyber prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
              </div>

              <div className="pt-12 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 italic">
                  Bạn vẫn cần hỗ trợ? Liên hệ đội ngũ kỹ thuật SCMD Pro.
                </p>
                <button className="px-6 py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all">
                  Gửi yêu cầu hỗ trợ
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center shadow-sm border border-slate-100">
                <Book className="text-slate-200" size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Chọn một bài viết</h3>
                <p className="text-slate-400 font-medium max-w-xs">
                  Chọn hướng dẫn từ danh sách bên trái để xem chi tiết quy trình vận hành.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
