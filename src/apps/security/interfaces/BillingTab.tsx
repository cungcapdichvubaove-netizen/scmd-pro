import React from 'react';
import { CreditCard, Check, CheckCircle2, Zap, Loader2, Plus, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../lib/utils';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { DashboardPageHeader } from '../../common/interfaces/components/DashboardUI';
import { useDashboardStore } from '../store/useDashboardStore';

export const BillingTab: React.FC = () => {
  const {
    isPro,
    isSubmitting,
    showUpgradeModal,
    setShowUpgradeModal,
    handleUpgrade
  } = useDashboardStore(useShallow(state => ({
    isPro: state.isPro,
    isSubmitting: state.isSubmitting,
    showUpgradeModal: state.showUpgradeModal,
    setShowUpgradeModal: state.setShowUpgradeModal,
    handleUpgrade: state.handleUpgrade
  })));

  return (
    <>
      <motion.div
        key="billing"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 animate-in fade-in duration-500 pb-20"
      >
        {/* Bước 1: Unified Billing Header */}
        <DashboardPageHeader
          title="Quản lý Gói dịch vụ & Thanh toán"
          description="Giám sát chu kỳ thanh toán, hạn mức vận hành và cấu hình phương thức chi trả."
          eyebrow="Subscription"
        />

        {/* Bước 2: Main Billing Grid (70/30) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột Trái: Current Subscription Profile */}
          <div className="lg:col-span-2">
            <SCMDCard className="h-full bg-slate-900/40 border-white/5 p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck className="text-blue-400" size={28} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Gói dịch vụ hiện tại</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-3xl font-black text-white">{isPro ? 'SCMD PRO' : 'SCMD FREE'}</p>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase">Đang hoạt động</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chu kỳ tiếp theo</p>
                  <p className="text-sm font-bold text-white mt-1">20/06/2024</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Hạn mức Nhân sự</p>
                  <p className="text-lg font-bold text-white mt-1">{isPro ? 'Không giới hạn' : '02 Nhân sự'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Vendor SLA</p>
                  <p className="text-lg font-bold text-white mt-1">{isPro ? 'Kích hoạt' : 'Bị khóa'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Báo cáo PDF</p>
                  <p className="text-lg font-bold text-white mt-1">{isPro ? 'Nâng cao' : 'Cơ bản'}</p>
                </div>
              </div>
            </SCMDCard>
          </div>

          {/* Cột Phải: Payment & Invoices */}
          <div className="lg:col-span-1 space-y-4">
            <SCMDCard className="bg-slate-900/60 border-white/10 p-6">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thanh toán</h3>
                  <CreditCard size={14} className="text-slate-500" />
               </div>
               <p className="text-xs font-medium text-slate-500 mb-6">Bạn chưa thiết lập phương thức thanh toán tự động.</p>
               <SCMDButton className="w-full h-12 bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">
                 <Plus size={14} className="mr-2" /> Thêm phương thức
               </SCMDButton>
            </SCMDCard>
            
            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors group">
              <div className="flex items-center gap-3">
                <ExternalLink size={16} className="text-slate-500 group-hover:text-blue-400" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white">Lịch sử hóa đơn</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-400">0 bản ghi</span>
            </button>
          </div>
        </div>

        {/* Bước 3: Compact Upgrade Tiers */}
        <div className="pt-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap size={18} className="text-blue-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Nâng cấp năng lực vận hành</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className={cn('relative opacity-50 grayscale', !isPro && 'opacity-100 grayscale-0')}>
            <SCMDCard className="p-6 border-white/5 bg-slate-900/20 flex flex-col h-full">
              <div className="mb-8">
                <h3 className="text-lg font-black text-slate-300 uppercase tracking-tight">SCMD FREE</h3>
                <p className="text-4xl font-black text-white mt-4">0đ</p>
              </div>
              <SCMDButton
                disabled
                className="w-full h-12 bg-white/5 border border-white/5 text-slate-500 font-black uppercase text-[10px] tracking-widest mt-auto"
              >
                {isPro ? 'PHIÊN BẢN CŨ' : 'ĐANG SỬ DỤNG'}
              </SCMDButton>
            </SCMDCard>
          </div>

          {/* PRO */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-blue-500/20 blur opacity-30 rounded-[28px]" />
            <SCMDCard className={cn("p-6 border-blue-500/30 bg-slate-900/40 flex flex-col h-full ring-2 ring-blue-500/20")}>
              <div className="mb-8">
                <h3 className="text-lg font-black text-blue-400 uppercase tracking-tight flex items-center justify-between">
                  SCMD PRO
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </h3>
                <p className="text-4xl font-black text-white mt-4">99.000<span className="text-lg ml-1 text-slate-500">đ/NV</span></p>
              </div>
              <SCMDButton
                onClick={() => !isPro && setShowUpgradeModal(true)}
                className="w-full h-12 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/20 mt-auto"
              >
                {isPro ? 'GÓI ĐANG DÙNG' : 'NÂNG CẤP NGAY'}
              </SCMDButton>
            </SCMDCard>
          </div>

          {/* PRO MAX */}
          <div className="group">
            <SCMDCard className="p-6 border-white/5 bg-slate-950/40 flex flex-col h-full hover:border-purple-500/40 transition-all">
              <div className="mb-8">
                <h3 className="text-lg font-black text-purple-400 uppercase tracking-tight">SCMD PRO MAX</h3>
                <p className="text-xl font-black text-white mt-4 uppercase">Liên hệ</p>
              </div>
              <SCMDButton
                onClick={() => window.location.href = '/contact'}
                className="w-full h-12 bg-white/5 border border-purple-500/20 text-purple-400 font-black uppercase text-[10px] tracking-widest mt-auto hover:bg-purple-500/10"
              >
                LIÊN HỆ NÂNG CẤP
              </SCMDButton>
            </SCMDCard>
          </div>
        </div>
        </div>

        <section className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4 items-start">
           <Info className="text-blue-400 shrink-0" size={18} />
           <p className="text-xs font-medium text-blue-300 leading-relaxed italic">
             Mọi thay đổi gói dịch vụ sẽ được áp dụng ngay lập tức cho chu kỳ hiện tại. Khoản thanh toán chênh lệch sẽ được tính vào kỳ hóa đơn tiếp theo (Pro-rated billing).
           </p>
        </section>
      </motion.div>

      {/* Upgrade Confirm Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
              {/* Sidebar Info */}
              <div className="md:w-56 bg-scmd-cyber/5 p-8 border-r border-slate-800 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-scmd-cyber/10 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                  <Zap size={36} className="text-scmd-cyber fill-current" />
                </div>
                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4">
                  QUYỀN LỢI PRO
                </h4>
                <div className="space-y-4 w-full">
                  {[
                    { label: 'AI Watcher', active: true },
                    { label: 'Báo cáo PDF Pro', active: true },
                    { label: 'Vendor SLA', active: true },
                    { label: 'Hỗ trợ 24/7', active: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={12} className="text-scmd-cyber" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 p-10">
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-white mb-3">Xác nhận nâng cấp SCMD PRO</h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    Bạn đang yêu cầu chuyển đổi hệ thống sang phiên bản chuyên nghiệp. 
                    Vui lòng xem kỹ quy trình phê duyệt dưới đây.
                  </p>
                </div>

                <div className="relative mb-10 pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  <div className="relative">
                    <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-scmd-cyber border-4 border-slate-900 z-10" />
                    <div>
                      <h5 className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest mb-1">
                        Bước 1: Gửi yêu cầu
                      </h5>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Hệ thống sẽ gửi yêu cầu nâng cấp tới đội ngũ quản trị cấp cao (Super Admin).
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900 z-10" />
                    <div>
                      <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                        Bước 2: Xét duyệt & Thanh toán
                      </h5>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Chúng tôi sẽ liên hệ qua email/số điện thoại để hướng dẫn thanh toán và xác minh.
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900 z-10" />
                    <div>
                      <h5 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">
                        Bước 3: Kích hoạt tức thì
                      </h5>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Dữ liệu của bạn sẽ được nâng cấp lên chuẩn PRO mà không bị gián đoạn hoạt động.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <SCMDButton
                    onClick={() => handleUpgrade('PRO')}
                    disabled={isSubmitting}
                    className="flex-1 h-14 bg-scmd-cyber text-white font-black shadow-2xl shadow-scmd-cyber/30 hover:scale-105"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      'XÁC NHẬN GỬI YÊU CẦU'
                    )}
                  </SCMDButton>
                  <SCMDButton
                    onClick={() => setShowUpgradeModal(false)}
                    variant="ghost"
                    className="h-14 px-8 text-slate-400 border-slate-800 hover:bg-slate-800"
                  >
                    QUAY LẠI
                  </SCMDButton>
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center mt-4">
                  Hotline hỗ trợ: 1900 1234
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BillingTab;
