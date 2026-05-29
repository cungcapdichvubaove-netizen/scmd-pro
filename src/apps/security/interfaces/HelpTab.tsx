import React, { useState } from "react";
import { AlertTriangle, X, Zap, Search, BookOpen, ChevronRight, MessageSquare, FileText, Send, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../../lib/utils";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";
import {
  DashboardPageHeader,
  dashboardInputClass,
  dashboardPanelClass,
  dashboardTextareaClass,
} from "../../common/interfaces/components/DashboardUI";

interface HelpTabProps {
  embedded?: boolean;
  showBugModal: boolean;
  bugReport: { title: string; description: string; severity: string };
  isReportingBug: boolean;
  setShowBugModal: (v: boolean) => void;
  setBugReport: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      severity: string;
    }>
  >;
  handleSubmitBug: (e: React.FormEvent) => void;
}

const HELP_CATEGORIES = [
  { id: 'getting-started', label: 'Bắt đầu', items: ['Khởi tạo Tenant', 'Thêm nhân sự đầu tiên', 'Thiết lập Site'] },
  { id: 'operations', label: 'Vận hành thực địa', items: ['Quản lý tuyến tuần tra', 'Xử lý sự cố SOS', 'Chấm công GPS'] },
  { id: 'compliance', label: 'Đối soát & SLA', items: ['Đánh giá Scorecard', 'Xuất báo cáo PDF', 'Quy tắc phạt vi phạm'] },
  { id: 'system', label: 'Cấu hình hệ thống', items: ['Phân quyền RBAC', 'Bảo mật Tenant', 'Tích hợp Zalo/Email'] },
];

export const HelpTab: React.FC<HelpTabProps> = ({
  showBugModal,
  bugReport,
  isReportingBug,
  setShowBugModal,
  setBugReport,
  handleSubmitBug,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Bước 1: Unified Header */}
        <DashboardPageHeader
          title="Trung tâm Hỗ trợ & Tri thức"
          description="Tra cứu tài liệu vận hành, quy trình xử lý sự cố và gửi phản hồi kỹ thuật trực tiếp cho đội ngũ SCMD PRO."
          eyebrow="Knowledge Base"
        />

        {/* Bước 2: 2-Columns Layout */}
        <div className="flex gap-8 min-h-[calc(100vh-260px)]">
          {/* Cột trái: Sidebar (25%) */}
          <aside className="w-80 shrink-0 space-y-6">
            {/* Search P0 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                placeholder="Tìm kiếm tài liệu..." 
                className={cn(dashboardInputClass, "h-11 pl-10 bg-slate-900/50 border-white/10 text-sm")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Nav List */}
            <nav className="space-y-8">
              {HELP_CATEGORIES.map(cat => (
                <div key={cat.id} className="space-y-2">
                  <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{cat.label}</h3>
                  <div className="space-y-1">
                    {cat.items.map(item => (
                      <button
                        key={item}
                        onClick={() => setActiveArticleId(item)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
                          activeArticleId === item 
                            ? "bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20" 
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className={activeArticleId === item ? "text-blue-400" : "text-slate-600"} />
                          {item}
                        </div>
                        {activeArticleId === item && <ChevronRight size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Ticket CTA */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
                <MessageSquare className="text-white" size={20} />
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">Cần hỗ trợ trực tiếp?</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Gửi yêu cầu hỗ trợ hoặc báo cáo lỗi kỹ thuật cho đội ngũ SCMD.</p>
              <SCMDButton onClick={() => setShowBugModal(true)} className="w-full mt-4 h-10 bg-blue-600 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-500">
                Gửi yêu cầu ngay
              </SCMDButton>
            </div>
          </aside>

          {/* Cột phải: Content Reader Area (75%) */}
          <main className={cn(dashboardPanelClass, "flex-1 p-8 lg:p-12 overflow-y-auto")}>
            {!activeArticleId ? (
              /* Default View (P0) */
              <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <BookOpen className="text-blue-500" size={28} />
                  Câu hỏi thường gặp (FAQ)
                </h2>
                <div className="mt-8 space-y-6">
                  {[
                    { q: "Làm thế nào để xuất báo cáo ca trực cho nhà thầu?", a: "Vào Tab Báo cáo nghiệm thu -> Chọn Kỳ đối soát -> Nhấn nút 'Tạo báo cáo tháng'." },
                    { q: "Tại sao nhân viên không thể check-in dù đã ở đúng vị trí?", a: "Vui lòng kiểm tra quyền truy cập vị trí trên điện thoại và đảm bảo GPS có độ chính xác dưới 50m." },
                    { q: "Cách thiết lập cảnh báo SOS về số điện thoại quản lý?", a: "Truy cập Cài đặt -> Thông báo -> Cấu hình kênh Zalo/Email cho vai trò Admin." }
                  ].map((faq, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                      <p className="text-sm font-black text-white mb-2">{faq.q}</p>
                      <p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Article View */
              <article className="max-w-3xl animate-in fade-in duration-300">
                <div className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                  <FileText size={12} /> Hướng dẫn vận hành
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight leading-tight">{activeArticleId}</h2>
                <div className="mt-10 space-y-6 text-slate-300 text-base leading-8">
                  <p>Đây là nội dung chi tiết của hướng dẫn "{activeArticleId}". Trong thực tế, dữ liệu này sẽ được render từ Markdown hoặc CMS nội bộ của hệ thống SCMD PRO.</p>
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                     <h4 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-2"><Zap size={14} className="text-amber-400" /> Điểm mấu chốt</h4>
                     <p className="text-sm text-slate-400">Đảm bảo bạn đã hoàn thành các bước cấu hình tenant trước khi bắt đầu module này.</p>
                  </div>
                </div>
              </article>
            )}
          </main>
        </div>
      </div>

      {/* Bước 3: Submit Ticket Drawer (Right-side) */}
      <AnimatePresence>
        {showBugModal && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBugModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex h-full w-full max-w-xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6 shrink-0">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">
                      Tạo yêu cầu hỗ trợ
                    </h3>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Support Ticket & Bug Report
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBugModal(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-scmd-navy text-scmd-silver/45 transition-colors hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitBug} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tiêu đề yêu cầu</label>
                    <input 
                      required
                      placeholder="VD: Không thể xuất báo cáo ca trực tháng 5" 
                      className={cn(dashboardInputClass, "h-12 bg-slate-950 border-white/10")}
                    value={bugReport.title}
                      onChange={(e) => setBugReport({ ...bugReport, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Module liên quan</label>
                      <select className={cn(dashboardInputClass, "h-12 bg-slate-950 border-white/10")}>
                        <option>Báo cáo (Reports)</option>
                        <option>Ca trực (Attendance)</option>
                        <option>Sự cố (Incidents)</option>
                        <option>Thiết lập (Settings)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Ưu tiên</label>
                      <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-white/10">
                        {["LOW", "MEDIUM", "CRITICAL"].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                            onClick={() => setBugReport({ ...bugReport, severity: sev })}
                        className={cn(
                              "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                          bugReport.severity === sev
                                ? (sev === 'CRITICAL' ? 'bg-red-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg')
                                : "text-slate-500 hover:text-white"
                        )}
                      >
                            {sev}
                      </button>
                    ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mô tả chi tiết</label>
                    <textarea 
                      required
                      rows={6} 
                      placeholder="Mô tả sự cố hoặc yêu cầu của bạn, các bước để tái hiện lỗi (nếu có)..." 
                      className={cn(dashboardTextareaClass, "bg-slate-950 border-white/10")}
                      value={bugReport.description}
                      onChange={(e) => setBugReport({ ...bugReport, description: e.target.value })}
                    />
                  </div>

                  <div className="p-4 rounded-xl border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/[0.04] transition-all">
                    <Paperclip className="text-slate-500" size={20} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Đính kèm ảnh/log (Tùy chọn)</span>
                  </div>
                </div>
              </form>

              <div className="p-8 border-t border-white/10 bg-slate-900/50">
                <SCMDButton onClick={handleSubmitBug} disabled={isReportingBug} className="w-full h-14 bg-blue-600 text-white shadow-xl shadow-blue-600/20 rounded-2xl">
                  <div className="flex items-center gap-3 uppercase font-black tracking-widest text-xs">
                    {isReportingBug ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={18} />}
                    Gửi yêu cầu hỗ trợ
                  </div>
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
