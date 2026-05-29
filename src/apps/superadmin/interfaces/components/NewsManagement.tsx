import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Newspaper, 
  Edit, 
  Trash2, 
  Type, 
  Link as LinkIcon, 
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Globe,
  Tag,
  FileText,
  Eye,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../../lib/utils';
import { getAuthHeaders } from '../../../common/utils/auth';
import { useDebounce } from '../../../common/hooks/useDebounce';
import { DashboardPageHeading, DashboardSpinner } from '../../../common/interfaces/components/DashboardUI';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  status: 'draft' | 'published';
  thumbnail: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  publishedAt: string;
}

export const NewsManagement: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'Công nghệ',
    status: 'draft' as 'draft' | 'published',
    thumbnail: '',
    seoTitle: '',
    seoDescription: '',
    tags: ''
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/sys-manage/news', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        // FIX BUG3: Backend NewsRepository.getAll() trả về paginated { data, nextCursor, hasMore }
        // setNews phải nhận array items, không phải cả object paginated
        const items: NewsItem[] = Array.isArray(json) ? json : (json.data ?? []);
        setNews(items);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item: NewsItem | null = null) => {
    if (item) {
      setEditingNews(item);
      setForm({
        title: item.title,
        slug: item.slug,
        content: item.content,
        excerpt: item.excerpt,
        category: item.category,
        status: item.status,
        thumbnail: item.thumbnail || '',
        seoTitle: item.seoTitle || '',
        seoDescription: item.seoDescription || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
      });
    } else {
      setEditingNews(null);
      setForm({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'Công nghệ',
        status: 'draft',
        thumbnail: '',
        seoTitle: '',
        seoDescription: '',
        tags: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingNews ? 'PUT' : 'POST';
    const url = editingNews ? `/api/v1/sys-manage/news/${editingNews.id}` : '/api/v1/sys-manage/news';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
          author: 'Super Admin',
          publishedAt: form.status === 'published' ? new Date().toISOString() : null
        })
      });

      if (res.ok) {
        await fetchNews();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Error saving news:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      const res = await fetch(`/api/v1/sys-manage/news/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchNews();
      }
    } catch (err) {
      console.error("Error deleting news:", err);
    }
  };

  const filteredNews = news.filter(item => 
    item.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex justify-between items-center bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-white/5">
        <div>
          <DashboardPageHeading>Quản lý Tin tức</DashboardPageHeading>
          <p className="text-slate-400 mt-2 font-medium">Hệ thống CMS chiến lược cho SCMD Pro.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="px-8 py-4 bg-sky-500 text-slate-950 rounded-2xl font-black text-sm hover:bg-sky-400 transition-all shadow-2xl shadow-sky-500/20 flex items-center gap-2"
        >
          <Plus size={20} />
          Viết bài mới
        </button>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài viết..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-white placeholder:text-slate-600"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/30 rounded-xl border border-white/5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{news.filter(n => n.status === 'published').length} Công khai</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/30 rounded-xl border border-white/5">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{news.filter(n => n.status === 'draft').length} Bản nháp</span>
            </div>
          </div>
        </div>

        {loading ? (
          <DashboardSpinner message="Đang tải dữ liệu..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
            <AnimatePresence mode="popLayout">
              {filteredNews.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-slate-950/40 border border-white/5 rounded-xl p-6 shadow-2xl group hover:border-sky-500/30 transition-all flex flex-col h-full"
                >
                  <div className="relative aspect-video rounded-[28px] overflow-hidden mb-6">
                    <img 
                      src={item.thumbnail || `https://picsum.photos/seed/${item.slug}/400/225`} 
                      alt={item.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute top-4 left-4">
                      <span className={cn(
                        "px-3 py-1 transparent-glass border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md",
                        item.status === 'published' ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      )}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white mb-2 line-clamp-2 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-2 leading-relaxed">{item.excerpt}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest inline-flex items-center gap-1">
                        <Tag size={10} className="text-sky-500" />
                        {item.category}
                      </span>
                      <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-tighter">
                        {new Date(item.publishedAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-3 bg-white/5 hover:bg-sky-500/20 rounded-2xl text-slate-400 hover:text-sky-400 transition-all group/btn"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl text-slate-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredNews.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-xl">
                <Newspaper className="mx-auto text-slate-800 mb-4" size={48} />
                <p className="text-slate-600 font-bold">Không tìm thấy bài viết nào phù hợp.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-10 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl pointer-events-auto"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col pointer-events-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-sky-500/10 rounded-3xl flex items-center justify-center text-sky-400 rotate-3 border border-sky-500/20">
                    <Newspaper size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{editingNews ? 'Hiệu chỉnh văn bản' : 'Khởi tạo nội dung mới'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase">Lõi CMS tình báo</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-3xl transition-all"
                >
                  <XCircle size={32} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-10">
                    {/* Main Content Area */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tiêu đề bài viết</label>
                        <div className="relative">
                          <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                          <input 
                            required
                            type="text" 
                            value={form.title}
                            onChange={(e) => setForm({...form, title: e.target.value})}
                            className="w-full pl-16 pr-6 py-5 bg-slate-950/50 border border-white/10 rounded-3xl text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all placeholder:text-slate-800"
                            placeholder="Nhập tiêu đề mang tính chiến lược..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nội dung bài viết (Markdown Support)</label>
                        <div className="relative group">
                          <div className="absolute top-4 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ctrl + B (Bold)</span>
                            <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ctrl + I (Italic)</span>
                          </div>
                          <textarea 
                            required
                            value={form.content}
                            onChange={(e) => setForm({...form, content: e.target.value})}
                            className="w-full p-8 bg-slate-950/50 border border-white/10 rounded-xl text-white font-medium text-base focus:outline-none focus:border-sky-500/30 min-h-[500px] resize-none leading-relaxed placeholder:text-slate-800"
                            placeholder="Khởi đầu bài viết bằng một câu nói ấn tượng..."
                          />
                          <div className="absolute bottom-6 right-8 flex items-center gap-2">
                            <FileText size={14} className="text-slate-600" />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{form.content.length} characters</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {/* Meta & Settings Sidebar */}
                    <div className="space-y-8 bg-white/5 p-8 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings size={14} className="text-sky-500" />
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Cấu hình xuất bản</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Slug URL</label>
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input 
                              required
                              type="text" 
                              value={form.slug}
                              onChange={(e) => setForm({...form, slug: e.target.value})}
                              className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-mono text-xs focus:outline-none"
                              placeholder="tieu-de-chien-luoc-2026"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Danh mục</label>
                          <select 
                            value={form.category}
                            onChange={(e) => setForm({...form, category: e.target.value})}
                            className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none appearance-none"
                          >
                            <option value="Công nghệ">🚀 Công nghệ</option>
                            <option value="An ninh">🛡️ An ninh</option>
                            <option value="Sự kiện">📅 Sự kiện</option>
                            <option value="Hướng dẫn">📖 Hướng dẫn</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Trạng thái</label>
                          <div className="flex gap-2">
                            {(['draft', 'published'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setForm({...form, status: s})}
                                className={cn(
                                  "flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                  form.status === s 
                                    ? s === 'published' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-amber-500/20 border-amber-500 text-amber-400"
                                    : "bg-slate-950/50 border-white/5 text-slate-600 hover:border-white/20"
                                )}
                              >
                                {s === 'draft' ? 'Bản nháp' : 'Công khai'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8 bg-white/5 p-8 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={14} className="text-sky-500" />
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">SEO Optimization</h4>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Meta Title</label>
                          <input 
                            type="text" 
                            value={form.seoTitle}
                            onChange={(e) => setForm({...form, seoTitle: e.target.value})}
                            className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold text-xs focus:outline-none"
                            placeholder="Tiêu đề hiển thị trên Google..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Meta Description</label>
                          <textarea 
                            value={form.seoDescription}
                            onChange={(e) => setForm({...form, seoDescription: e.target.value})}
                            className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-medium text-xs focus:outline-none h-32 resize-none leading-relaxed"
                            placeholder="Mô tả tóm tắt cho công cụ tìm kiếm..."
                          />
                        </div>

                        <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Google Preview</span>
                            <Eye size={12} className="text-sky-400" />
                          </div>
                          <p className="text-sky-400 text-sm font-medium hover:underline truncate mb-1">https://scmd.pro/news/{form.slug}</p>
                          <h5 className="text-white text-base font-black truncate mb-1">{form.seoTitle || form.title || 'Untitled'}</h5>
                          <p className="text-slate-500 text-[10px] line-clamp-2">{form.seoDescription || form.excerpt || 'No description provided.'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Thumbnail URL</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                          <input 
                            type="text" 
                            value={form.thumbnail}
                            onChange={(e) => setForm({...form, thumbnail: e.target.value})}
                            className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold text-xs focus:outline-none"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>
                      <div className="aspect-video bg-slate-950/50 rounded-[28px] border border-white/5 overflow-hidden flex items-center justify-center">
                        {form.thumbnail ? (
                          <img src={form.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-800" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tags (phân cách bằng dấu phẩy)</label>
                      <input 
                        type="text" 
                        value={form.tags}
                        onChange={(e) => setForm({...form, tags: e.target.value})}
                        className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold text-xs focus:outline-none"
                        placeholder="e.g. an ninh, cong nghe, saas"
                      />
                    </div>
                  </div>
                </div>
              </form>

              <div className="p-10 border-t border-white/5 bg-slate-900/80 backdrop-blur-md flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tự động sao lưu: 1 phút trước</span>
                </div>
                <div className="flex gap-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 text-slate-400 font-black text-sm uppercase tracking-widest hover:text-white transition-all underline decoration-sky-500/0 hover:decoration-sky-500/50 underline-offset-8"
                  >
                    Hủy bỏ thao tác
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-12 py-5 bg-sky-500 text-slate-950 rounded-[24px] font-black text-base hover:bg-sky-400 transition-all shadow-2xl shadow-sky-500/20 flex items-center gap-3"
                  >
                    <CheckCircle2 size={20} />
                    {editingNews ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
