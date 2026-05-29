import React from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  AlertTriangle, User, MapPin, AlertCircle, X, Clock, 
  CheckCircle2, Sparkles, Loader2, Camera, Check, Printer, ChevronRight 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../../lib/utils';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDTooltip } from '../../common/interfaces/components/SCMDTooltip';
import { useModalStore } from '../store/useModalStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { useShallow } from 'zustand/react/shallow';
import { htmlEscape, printHtmlFragment, formatVietnamDateTime } from './utils/reportExport';

interface DashboardModalsProps {
  handleDeleteCheckpoint: (id: string, cb: any) => void;
  handleDeleteStaff: (id: string, cb: any) => void;
  handleDeleteRoute: (id: string, cb: any) => void;
  setActiveTab: (tab: any) => void;
  handleAnalyzeLog: (id: string) => void;
}

export const DashboardModals: React.FC<DashboardModalsProps> = ({
  handleDeleteCheckpoint, handleDeleteStaff, handleDeleteRoute,
  setActiveTab,
  handleAnalyzeLog,
}) => {
  const { activeSOS, setActiveSOS, tenantInfo } = useDashboardStore(useShallow(state => ({
    activeSOS: state.activeSOS,
    setActiveSOS: state.setActiveSOS,
    tenantInfo: state.tenantInfo
  })));

  const {
    showConfirmModal, setShowConfirmModal,
    confirmText, setConfirmText,
    showWelcomeModal, setShowWelcomeModal,
    selectedMapPoint, setSelectedMapPoint,
    selectedLog, setSelectedLog,
    isAnalyzingLog,
    analysisResult,
    setAnalysisResult,
    showQRModal, setShowQRModal,
  } = useModalStore();

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const overlayVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const handlePrintCheckpointQR = () => {
    if (!showQRModal) return;
    const qrMarkup = document.getElementById('checkpoint-qr-print-source')?.innerHTML || '';
    const checkpointName = showQRModal.name || 'Điểm tuần tra';
    const qrValue = showQRModal.qr_hash || showQRModal.id || '';

    printHtmlFragment(
      `Phiếu QR - ${checkpointName}`,
      `
        <div class="center">
          <img class="logo" src="/logo_scmd_pro.png" alt="SCMD Pro" />
          <h1>Phiếu mã QR điểm tuần tra</h1>
          <div class="meta">${htmlEscape(tenantInfo?.name || 'SCMD Pro')} · Lập lúc ${htmlEscape(formatVietnamDateTime())}</div>
        </div>
        <div class="box center">
          <h2>${htmlEscape(checkpointName)}</h2>
          <div style="display:inline-flex;padding:18px;border:1px solid #e2e8f0;border-radius:18px;margin:16px auto;background:#fff">${qrMarkup}</div>
          <div class="meta"><strong>Mã định danh:</strong> ${htmlEscape(qrValue)}</div>
        </div>
        <div class="footer">Chỉ sử dụng mã QR này cho điểm tuần tra tương ứng. Không chia sẻ ra ngoài phạm vi vận hành.</div>
      `,
    );
  };

  return (
    <>
      {/* ── SOS Overlay ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeSOS && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-lg bg-scmd-navy rounded-[48px] overflow-hidden shadow-[0_0_120px_rgba(239,68,68,0.4)] border-4 border-red-500/50 backdrop-blur-2xl"
            >
              <div className="bg-gradient-to-b from-red-600 to-red-900 p-10 text-white text-center relative overflow-hidden">
                <motion.div 
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)]"
                />
                <AlertTriangle size={84} className="mx-auto mb-6 relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                <h2 className="text-5xl font-black uppercase tracking-tighter relative z-10 not-italic">EMERGENCY SOS</h2>
                <p className="text-red-100 font-bold mt-3 tracking-[0.3em] uppercase text-xs relative z-10">Phản ứng khẩn cấp cấp độ 1</p>
              </div>
              <div className="p-10 space-y-8 bg-scmd-surface/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-scmd-navy/80 rounded-3xl border border-white/5 shadow-inner">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <User size={12} /> Cán bộ yêu cầu
                    </p>
                    <p className="text-xl font-black text-white tracking-tight">{activeSOS.staffId}</p>
                  </div>
                  <div className="p-5 bg-scmd-navy/80 rounded-3xl border border-white/5 shadow-inner">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MapPin size={12} /> Tọa độ GPS
                    </p>
                    <p className="text-sm font-black text-white font-mono">
                      {activeSOS.location.lat.toFixed(5)}<br/>{activeSOS.location.lon.toFixed(5)}
                    </p>
                  </div>
                </div>
                
                <div className="p-6 bg-red-950/30 rounded-[32px] border border-red-500/20 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                  <p className="text-[10px] font-black text-red-400/60 uppercase tracking-widest mb-3 ml-2">
                    Báo cáo hiện trường
                  </p>
                  <p className="text-lg font-bold text-red-100 not-italic leading-snug ml-2">"{activeSOS.message}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSOS(null)}
                    className="py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all uppercase tracking-widest text-[10px] border border-white/10"
                  >
                    BỎ QUA
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveSOS(null);
                      setActiveTab('incidents');
                    }}
                    className="py-5 bg-red-600 hover:bg-red-500 text-white font-black rounded-3xl shadow-2xl shadow-red-600/40 transition-all uppercase tracking-widest text-[10px] animate-pulse"
                  >
                    TRIỂN KHAI PHƯƠNG ÁN
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                setShowConfirmModal(null);
                setConfirmText('');
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-scmd-navy rounded-[40px] p-10 shadow-[0_0_100px_rgba(239,68,68,0.15)] border border-red-500/20 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500/50" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Xác nhận <span className="text-red-500">Xóa vĩnh viễn</span></h3>
                  <p className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-[0.2em] mt-1">Phân hệ bảo mật — Kiểm soát rủi ro</p>
                </div>
              </div>

              <div className="p-6 bg-scmd-surface/50 rounded-3xl border border-white/5 mb-8 space-y-4">
                <p className="text-[11px] font-bold text-scmd-silver/60 uppercase tracking-widest leading-relaxed">
                  Thiết bị/Hồ sơ: <span className="text-white font-black">{showConfirmModal.name}</span> sẽ bị gỡ bỏ khỏi cơ sở dữ liệu và không thể khôi phục.
                </p>
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] mb-3">
                    Nhập chính xác tên bên dưới để xác nhận:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-5 py-4 bg-scmd-navy border border-white/10 rounded-2xl font-black text-white text-xs uppercase tracking-widest focus:outline-none focus:border-red-500 transition-all placeholder:text-scmd-silver/10"
                    placeholder={showConfirmModal.name}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={confirmText === showConfirmModal.name ? { scale: 1.02 } : {}}
                  whileTap={confirmText === showConfirmModal.name ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (confirmText !== showConfirmModal.name) return;
                    if (showConfirmModal.type === 'checkpoint')
                      handleDeleteCheckpoint(showConfirmModal.id, setShowConfirmModal);
                    else if (showConfirmModal.type === 'staff')
                      handleDeleteStaff(showConfirmModal.id, setShowConfirmModal);
                    else handleDeleteRoute(showConfirmModal.id, setShowConfirmModal);
                    setConfirmText('');
                  }}
                  className={cn(
                    'py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all',
                    confirmText === showConfirmModal.name
                      ? 'bg-red-500 text-white shadow-2xl shadow-red-500/40 hover:bg-red-600'
                      : 'bg-white/5 text-scmd-silver/20 cursor-not-allowed border border-white/5',
                  )}
                >
                  XÁC NHẬN XÓA
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowConfirmModal(null);
                    setConfirmText('');
                  }}
                  className="py-5 bg-white/5 text-white font-black rounded-3xl text-[10px] uppercase tracking-[0.2em] transition-all border border-white/10"
                >
                  BỎ QUA
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Welcome Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowWelcomeModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-lg bg-scmd-surface rounded-[40px] p-10 shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-scmd-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-scmd-primary rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-scmd-primary/30">
                  <Sparkles className="text-white w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase leading-tight">
                  Chào mừng {tenantInfo?.name} <br /> đến với SCMD PRO!
                </h2>
                <p className="text-scmd-silver/60 mb-10 leading-relaxed font-bold text-xs uppercase tracking-widest">
                  Hệ thống an ninh chuyên nghiệp SCMD PRO v2.4 đã sẵn sàng. Hãy bắt đầu bằng việc
                  tạo Điểm tuần tra đầu tiên hoặc khám phá các tính năng quản lý nhân sự cao cấp.
                </p>
                <div className="flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab('sites');
                      setShowWelcomeModal(false);
                    }}
                    className="w-full py-5 bg-scmd-primary hover:bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl transition-all shadow-2xl shadow-scmd-primary/20 flex items-center justify-center gap-2"
                  >
                    Tạo điểm tuần tra ngay <ChevronRight size={18} />
                  </motion.button>
                  <motion.button
                    whileHover={{ opacity: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowWelcomeModal(false)}
                    className="w-full py-4 text-scmd-silver/40 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors"
                  >
                    Tôi muốn tham quan trước
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Map Quick-View Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedMapPoint && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedMapPoint(null)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-md"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-scmd-slate rounded-[40px] p-8 shadow-2xl border border-slate-700"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center',
                      selectedMapPoint.status === 'SOS'
                        ? 'bg-scmd-alert text-white'
                        : 'bg-scmd-cyber/20 text-scmd-cyber',
                    )}
                  >
                    {selectedMapPoint.status === 'SOS' ? (
                      <AlertCircle size={24} />
                    ) : (
                      <MapPin size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedMapPoint.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {selectedMapPoint.lat}, {selectedMapPoint.lon}
                    </p>
                  </div>
                </div>
                <SCMDTooltip content="Đóng nhanh">
                  <button
                    onClick={() => setSelectedMapPoint(null)}
                    className="text-slate-500 hover:text-white p-2"
                  >
                    <X size={20} />
                  </button>
                </SCMDTooltip>
              </div>

              <div className="space-y-6">
                {selectedMapPoint.type === 'ALERT' && selectedMapPoint.description && (
                  <div className="p-4 bg-scmd-alert/10 rounded-2xl border border-scmd-alert/20">
                    <p className="text-[10px] font-black text-scmd-alert uppercase tracking-widest mb-2">
                      Chi tiết sự cố
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {selectedMapPoint.description}
                    </p>
                  </div>
                )}
                <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    Lượt tuần tra gần nhất
                  </p>
                  {selectedMapPoint.lastPatrol ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <User size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">
                          {selectedMapPoint.lastPatrol.staff}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(selectedMapPoint.lastPatrol.time).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">Chưa có dữ liệu tuần tra</p>
                  )}
                </div>
                <SCMDButton onClick={() => setSelectedMapPoint(null)} className="w-full h-14">
                  Đóng Quick View
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Log Detail Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Chi tiết tuần tra</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                    Mã log: #{selectedLog.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SCMDTooltip content="Phân tích dữ liệu bằng AI FLASH">
                    <SCMDButton
                      onClick={() => handleAnalyzeLog(selectedLog.id)}
                      disabled={isAnalyzingLog}
                      variant="ghost"
                      className="h-10 px-4 bg-scmd-primary/10 text-scmd-primary border-scmd-primary/20 hover:bg-scmd-primary/20"
                    >
                      {isAnalyzingLog ? (
                        <Loader2 className="animate-spin mr-2" size={16} />
                      ) : (
                        <Sparkles className="mr-2" size={16} />
                      )}
                      {isAnalyzingLog ? 'Đang phân tích...' : 'Phân tích AI'}
                    </SCMDButton>
                  </SCMDTooltip>
                  <button
                    onClick={() => {
                      setSelectedLog(null);
                      setAnalysisResult(null);
                    }}
                    className="p-2 hover:bg-slate-200 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">
                      Thời gian thực hiện
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {new Date(selectedLog.startTime).toLocaleTimeString('vi-VN')} -{' '}
                      {new Date(selectedLog.endTime).toLocaleTimeString('vi-VN')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-slate-400" />
                      <p className="text-xs text-slate-500 font-medium">
                        {Math.round(selectedLog.durationSeconds)} giây
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'p-5 rounded-2xl border',
                      selectedLog.isSuspicious
                        ? 'bg-red-50 border-red-100'
                        : 'bg-emerald-50 border-emerald-100',
                    )}
                  >
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">
                      Trạng thái trung thực
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedLog.isSuspicious ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                      <p
                        className={cn(
                          'text-sm font-bold',
                          selectedLog.isSuspicious ? 'text-red-700' : 'text-emerald-700',
                        )}
                      >
                        {selectedLog.isSuspicious ? 'Nghi ngờ gian lận' : 'Hợp lệ'}
                      </p>
                    </div>
                    {selectedLog.suspicionReason && (
                      <p className="text-[10px] text-red-500 mt-2 font-bold bg-white/50 px-2 py-1 rounded-md border border-red-100">
                        Lý do: {selectedLog.suspicionReason}
                      </p>
                    )}
                  </div>
                </div>

                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-blue-900 uppercase">Kết quả giám định AI</h4>
                        <p className="text-[10px] text-blue-600/60 font-bold uppercase tracking-widest">
                          Dựa trên GPS & Hình ảnh thực tế
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-black text-blue-600">{analysisResult.anomalyScore}%</p>
                        <p className="text-[8px] font-black text-blue-400 uppercase">Chỉ số nghi vấn</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-blue-800 bg-white/50 p-3 rounded-xl border border-blue-100">
                        "{analysisResult.reason}"
                      </p>
                      {analysisResult.deviations && analysisResult.deviations.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
                            Lệch hành trình phát hiện
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.deviations.map((d: string, i: number) => (
                              <span key={i} className="px-2 py-1 bg-white text-[10px] h-6 flex items-center font-bold text-blue-600 rounded-lg border border-blue-100">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Dữ liệu Checklist chi tiết
                  </h4>
                  <div className="space-y-3">
                    {selectedLog.checkItemsData?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              item.value ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400',
                            )}
                          >
                            {item.type === 'photo' ? <Camera size={20} /> : <Check size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.task}</p>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                              {item.type}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.type === 'toggle' && (
                            <div
                              className={cn(
                                'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                item.value
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700',
                              )}
                            >
                              {item.value ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                            </div>
                          )}
                          {item.type === 'photo' && item.value && (
                            <img
                              src={item.value}
                              alt="Patrol photo"
                              className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.onerror = null;
                            }}
                            />
                          )}
                          {item.type === 'text' && (
                            <p className="text-sm text-slate-600">"{item.value || 'Không có ghi chú'}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <SCMDButton
                  onClick={() => {
                    setSelectedLog(null);
                    setAnalysisResult(null);
                  }}
                  className="px-8 h-12"
                >
                  Đóng báo cáo
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── QR Modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowQRModal(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative bg-white rounded-[40px] p-10 shadow-2xl max-w-sm w-full text-center"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-2">{showQRModal.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                Mã QR bảo mật
              </p>
              <div id="checkpoint-qr-print-source" className="flex justify-center mb-8 p-4 bg-slate-50 rounded-3xl inline-block">
                <QRCodeSVG
                  value={showQRModal.qr_hash || showQRModal.id}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePrintCheckpointQR}
                  className="flex-1 h-14 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> In QR
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowQRModal(null)}
                  className="flex-1 h-14 bg-slate-100 text-slate-500 font-bold rounded-2xl"
                >
                  Đóng
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
