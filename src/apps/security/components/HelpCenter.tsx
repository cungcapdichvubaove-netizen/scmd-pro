import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Book, 
  Search, 
  ChevronRight, 
  HelpCircle, 
  Shield, 
  Clock,
  MessageSquare,
  Send,
  X,
  MessageCircle,
  Info
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { apiFetch } from '../../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { dashboardInputClass, dashboardPanelClass, dashboardTabButtonClass } from '../../common/interfaces/components/DashboardUI';

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
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketData, setTicketData] = useState({ title: '', message: '', priority: 'LOW' });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const data = await apiFetch<HelpArticle[]>('/api/help/articles');
      setArticles(data);
    } catch (err) {
      console.error('Failed to fetch help articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = ticketData.title.trim();
    const message = ticketData.message.trim();
    const priority = ticketData.priority.trim().toUpperCase();

    if (title.length < 3 || message.length < 5) {
      setStatusMessage({ text: "Vui lòng nhập tiêu đề tối thiểu 3 ký tự và nội dung tối thiểu 5 ký tự.", type: 'error' });
      return;
    }

    setIsSubmittingTicket(true);
    try {
      await apiFetch('/api/tenant/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: message,
          severity: priority,
          type: 'SUPPORT'
        })
      });
      setStatusMessage({ text: "Yêu cầu hỗ trợ đã được gửi thành công!", type: 'success' });
      setTicketData({ title: '', message: '', priority: 'LOW' });
      setTimeout(() => {
        setShowTicketModal(false);
        setStatusMessage(null);
      }, 2000);
    } catch (error) {
      setStatusMessage({ text: "Lỗi khi gửi yêu cầu. Vui lòng kiểm tra lại thông tin hoặc thử lại sau.", type: 'error' });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Admin', 'Guard', 'General'];

  return (
    <div className={cn(dashboardPanelClass, 'flex h-full flex-col overflow-hidden relative')}>
      {/* Header */}
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_34%),rgba(13,19,36,0.86)] p-5 sm:p-6 lg:p-8 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-white flex items-center gap-4 uppercase not-italic">
              <div className="w-12 h-12 bg-scmd-primary/15 rounded-2xl flex items-center justify-center text-scmd-primary shadow-lg shadow-scmd-primary/10">
                <HelpCircle size={28} />
              </div>
              Trung tâm hỗ trợ vận hành
            </h2>
            <p className="max-w-2xl text-sm font-semibold leading-6 text-scmd-silver/65">Tra cứu quy trình tuần tra, sự cố, evidence và gửi ticket hỗ trợ mà không rời khỏi dashboard.</p>
          </div>
          <div className="relative w-full lg:w-[480px] group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-scmd-silver/35 group-focus-within:text-scmd-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Tìm: báo cáo, SOS, AI Watcher, SLA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(dashboardInputClass, 'h-14 pl-14 pr-6 font-black')}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Wiki Navigation */}
        <div className="hidden md:block w-96 shrink-0 bg-scmd-navy/55 border-r border-white/8 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {categories.map(category => {
            const categoryArticles = filteredArticles.filter(a => a.category === category);
            if (categoryArticles.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="w-1.5 h-6 bg-scmd-cyber/30 rounded-full" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {category === 'Admin' ? 'Management' : 
                     category === 'Guard' ? 'Operational' : 'General Info'}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  {categoryArticles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className={cn(
                        "w-full min-h-[52px] text-left px-5 py-4 rounded-2xl text-sm font-semibold transition-all flex items-start gap-2 group tracking-normal leading-snug focus:outline-none focus:ring-2 focus:ring-scmd-primary/30",
                        selectedArticle?.id === article.id 
                          ? "bg-scmd-primary text-white shadow-xl shadow-scmd-primary/20"
                          : "text-scmd-silver/62 hover:bg-white/7 hover:text-white"
                      )}
                    >
                      <span className="flex-1">{article.title}</span>
                      <ChevronRight size={16} className={cn(
                        "mt-0.5 shrink-0 transition-transform",
                        selectedArticle?.id === article.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      )} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-scmd-cyber border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Đang tải wiki...</span>
            </div>
          )}

          {/* Contact Support Area in Sidebar */}
          <div className="pt-10 border-t border-slate-800 mt-10">
            <div className={cn(dashboardPanelClass, 'p-5 space-y-4 shadow-xl')}>
              <div className="p-3 bg-scmd-cyber/10 rounded-2xl w-fit text-scmd-cyber">
                <MessageCircle size={20} />
              </div>
              <h4 className="text-white font-black uppercase text-xs  tracking-tighter">Cần hỗ trợ trực tiếp?</h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed ">Gửi yêu cầu hỗ trợ (Support Ticket) cho đội ngũ kỹ thuật của chúng tôi.</p>
              <button
                onClick={() => setShowTicketModal(true)}
                className={dashboardTabButtonClass(true)}
              >
                Gửi yêu cầu ngay
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-scmd-navy/35 overflow-y-auto p-5 sm:p-8 lg:p-12 custom-scrollbar relative">
          {selectedArticle ? (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg",
                    selectedArticle.category === 'Admin' ? "bg-blue-500/20 text-blue-400 border-blue-400/30" : 
                    selectedArticle.category === 'Guard' ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/30" : 
                    "bg-slate-800/50 text-slate-400 border-slate-700"
                  )}>
                    {selectedArticle.category} Division
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-xl">
                    <Clock size={12} className="text-scmd-cyber" />
                    Last Updated: {new Date(selectedArticle.lastUpdated).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <h1 className="text-5xl font-black text-white tracking-tighter leading-[1.1] uppercase ">
                  {selectedArticle.title}
                </h1>
                <div className="h-1.5 w-32 bg-scmd-cyber/30 rounded-full" />
              </div>

              <div className="prose prose-invert prose-lg max-w-none 
                prose-headings:font-black prose-headings:tracking-tight prose-headings:text-white
                prose-p:text-slate-300 prose-p:leading-[1.8] prose-p:font-medium
                prose-strong:text-scmd-cyber prose-strong:font-black
                prose-ul:list-none prose-ul:pl-0
                prose-li:text-slate-300 prose-li:mb-4 prose-li:flex prose-li:items-start prose-li:gap-3
                prose-code:bg-slate-900/80 prose-code:px-2 prose-code:py-1 prose-code:rounded-lg prose-code:text-scmd-cyber prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-code:border prose-code:border-slate-800
                bg-scmd-navy/75 p-6 sm:p-10 lg:p-12 rounded-[28px] border border-white/10 shadow-2xl backdrop-blur-xl relative group">
                <div className="absolute top-8 right-12 text-slate-800 group-hover:text-scmd-cyber/10 transition-colors pointer-events-none">
                  <Shield size={120} strokeWidth={0.5} />
                </div>
                <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
              </div>

              <div className="pt-16 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-scmd-cyber border border-slate-800">
                    <Info size={24} />
                  </div>
                  <div>
                    <p className="text-white font-black uppercase text-xs  tracking-tight">Vẫn còn thắc mắc?</p>
                    <p className="text-[10px] text-slate-600 font-bold">Đội ngũ SCMD Pro sẵn sàng hỗ trợ 24/7.</p>
                  </div>
                </div>
                <SCMDButton 
                  onClick={() => setShowTicketModal(true)}
                  variant="primary"
                  className="px-8 h-14 bg-white text-slate-950 font-black shadow-xl shadow-scmd-cyber/20 hover:scale-105"
                >
                  GỬI TICKET HỖ TRỢ NGAY
                </SCMDButton>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in duration-1000">
              <div className="relative">
                {/* Complex Technical Illustration Wrapper */}
                <div className="relative z-10 w-48 h-48 bg-scmd-navy border border-white/5 rounded-[56px] flex items-center justify-center shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-scmd-primary/10 to-transparent opacity-50" />
                  
                  {/* Decorative Circuit Lines */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      <line x1="20" y1="0" x2="20" y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="80" y1="0" x2="80" y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1="70" x2="100" y2="70" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                  </div>

                  <Book className="text-scmd-primary group-hover:scale-110 transition-transform duration-700 relative z-20" size={80} />
                  
                  {/* Animated Scanner Effect */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2px] bg-scmd-cyber/40 blur-[2px] z-30"
                  />
                </div>

                {/* Glowing Background Orbs */}
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], rotate: [0, 90, 0] }}
                  transition={{ duration: 10, repeat: Infinity }}
                  className="absolute -top-10 -left-10 w-40 h-40 bg-scmd-primary/20 blur-[60px] rounded-full -z-10"
                />
                <motion.div 
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.3, 0.1], rotate: [0, -45, 0] }}
                  transition={{ duration: 8, repeat: Infinity }}
                  className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -z-10"
                />
              </div>

              <div className="space-y-4 max-w-md">
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none not-italic">
                  Hệ tri thức <span className="text-scmd-cyber">SCMD</span>
                </h3>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] bg-white/5 py-2 rounded-full border border-white/5 px-8 inline-block mb-4">
                  OPERATIONAL DOCUMENTATION
                </p>
                <p className="text-slate-400 font-medium text-sm leading-relaxed px-4">
                  Tra cứu quy trình vận hành tiêu chuẩn, hướng dẫn sử dụng AI Watcher và các nghiệp vụ an ninh nâng cao.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Ticket Modal */}
      <AnimatePresence>
        {showTicketModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTicketModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-950 p-10 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-scmd-cyber/20 rounded-2xl text-scmd-cyber shadow-lg">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase  tracking-tighter">Support Ticket</h3>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">TẠO YÊU CẦU HỖ TRỢ KỸ THUẬT</p>
                  </div>
                </div>
                <button 
                  type="button"
                  aria-label="Đóng modal hỗ trợ"
                  onClick={() => setShowTicketModal(false)}
                  className="p-3 bg-slate-900 text-slate-500 hover:text-white rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSendTicket} className="p-10 space-y-8">
                {statusMessage ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-6 rounded-[32px] text-center font-black uppercase tracking-widest text-xs border animate-pulse",
                      statusMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}
                  >
                    {statusMessage.text}
                  </motion.div>
                ) : (
                  <>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label htmlFor="support-ticket-title" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Vấn đề cần hỗ trợ</label>
                        <SCMDInput 
                          id="support-ticket-title"
                          required
                          value={ticketData.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicketData({...ticketData, title: e.target.value})}
                          placeholder="Tiêu đề vắn tắt..."
                          className="h-16 font-black"
                        />
                      </div>
                      <div className="space-y-3">
                        <label htmlFor="support-ticket-message" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nội dung chi tiết</label>
                        <textarea 
                          id="support-ticket-message"
                          required
                          value={ticketData.message}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTicketData({...ticketData, message: e.target.value})}
                          className="w-full h-40 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-slate-300 font-medium focus:outline-none focus:border-scmd-cyber transition-all shadow-inner"
                          placeholder="Mô tả sự cố hoặc yêu cầu bạn đang gặp phải..."
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTicketData({...ticketData, priority: p})}
                            className={cn(
                              "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              ticketData.priority === p 
                                ? (p === 'HIGH' ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" :
                                   p === 'MEDIUM' ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20" :
                                   "bg-scmd-cyber text-slate-950 border-scmd-cyber shadow-lg shadow-scmd-cyber/20")
                                : "bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-400"
                            )}
                          >
                            {p === 'LOW' ? 'Thấp' : p === 'MEDIUM' ? 'Thường' : 'Gấp'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <SCMDButton 
                      disabled={isSubmittingTicket}
                      type="submit"
                      className="w-full h-16 bg-white text-slate-950 font-black rounded-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-[0.3em]"
                    >
                      {isSubmittingTicket ? (
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          ĐANG GỬI...
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Send size={18} />
                          GỬI YÊU CẦU NGAY
                        </div>
                      )}
                    </SCMDButton>
                    <p className="text-center text-[10px] font-bold text-slate-600 ">Cam kết hỗ trợ giải quyết trong vòng 15-30 phút.</p>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
