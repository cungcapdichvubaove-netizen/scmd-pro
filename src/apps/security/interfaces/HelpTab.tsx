import React from 'react';
import { AlertTriangle, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { HelpCenter } from '../components/HelpCenter';

interface HelpTabProps {
  showBugModal: boolean;
  bugReport: { title: string; description: string; severity: string };
  isReportingBug: boolean;
  setShowBugModal: (v: boolean) => void;
  setBugReport: React.Dispatch<React.SetStateAction<{ title: string; description: string; severity: string }>>;
  handleSubmitBug: (e: React.FormEvent) => void;
}

export const HelpTab: React.FC<HelpTabProps> = ({
  showBugModal,
  bugReport,
  isReportingBug,
  setShowBugModal,
  setBugReport,
  handleSubmitBug,
}) => {
  return (
    <>
      {/* Main Help Center */}
      <div className="h-[calc(100vh-160px)] animate-in fade-in duration-500">
        <HelpCenter />
      </div>

      {/* Bug Report Modal */}
      <AnimatePresence>
        {showBugModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-slate-900">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBugModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 rounded-2xl bg-scmd-alert/10 flex items-center justify-center text-scmd-alert rotate-3">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Báo cáo lỗi hệ thống
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Phản hồi kỹ thuật 24/7
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBugModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitBug} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Tiêu đề lỗi
                  </label>
                  <SCMDInput
                    placeholder="VD: Không thể xuất báo cáo ca trực..."
                    value={bugReport.title}
                    onChange={(e) => setBugReport({ ...bugReport, title: e.target.value })}
                    className="h-12 border-slate-200 focus:border-slate-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Mức độ nghiêm trọng
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['LOW', 'MEDIUM', 'CRITICAL'].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setBugReport({ ...bugReport, severity: sev })}
                        className={cn(
                          'py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all',
                          bugReport.severity === sev
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200',
                        )}
                      >
                        {sev === 'LOW' ? 'Thường' : sev === 'MEDIUM' ? 'Cao' : 'Khẩn cấp'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Chi tiết lỗi
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Mô tả chi tiết các bước gây ra lỗi..."
                    className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-slate-200 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                    value={bugReport.description}
                    onChange={(e) => setBugReport({ ...bugReport, description: e.target.value })}
                  />
                </div>

                <SCMDButton
                  type="submit"
                  disabled={isReportingBug}
                  className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl shadow-xl shadow-slate-900/20"
                >
                  <div className="flex items-center justify-center gap-3">
                    {isReportingBug ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Zap size={18} />
                    )}
                    <span className="font-black text-sm uppercase tracking-widest">
                      Gửi báo cáo lỗi
                    </span>
                  </div>
                </SCMDButton>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
