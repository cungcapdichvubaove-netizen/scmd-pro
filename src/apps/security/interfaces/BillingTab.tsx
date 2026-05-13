import React from 'react';
import { CreditCard, Check, CheckCircle2, Zap, ShieldCheck, Clock, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../lib/utils';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { useDashboardStore } from '../store/useDashboardStore';

export const BillingTab: React.FC = () => {
  const {
    isPro,
    isSubmitting,
    showUpgradeModal,
    tenantInfo,
    setShowUpgradeModal,
    handleUpgrade
  } = useDashboardStore(useShallow(state => ({
    isPro: state.isPro,
    isSubmitting: state.isSubmitting,
    showUpgradeModal: state.showUpgradeModal,
    tenantInfo: state.tenantInfo,
    setShowUpgradeModal: state.setShowUpgradeModal,
    handleUpgrade: state.handleUpgrade
  })));

  const hasPendingUpgrade = tenantInfo?.hasPendingUpgrade;

  return (
    <>
      <motion.div
        key="billing"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700"
      >
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-5xl font-black tracking-tighter text-white uppercase">
                Billing & Plan
              </h2>
              <span
                className={cn(
                  'px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border animate-pulse',
                  isPro
                    ? 'bg-scmd-cyber/10 border-scmd-cyber text-scmd-cyber shadow-[0_0_15px_rgba(66,133,244,0.2)]'
                    : 'bg-slate-800 border-slate-700 text-slate-400',
                )}
              >
                {isPro ? 'PRO ACTIVE' : 'FREE CORE'}
              </span>
            </div>
            <p className="text-slate-400 font-medium max-w-lg">
              Nâng cấp sức mạnh hệ thống với AI Watcher và Báo cáo tự động hóa cao cấp.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-[24px] border border-slate-800 backdrop-blur-md">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <CreditCard className="text-scmd-cyber" size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Phương thức thanh toán
              </p>
              <p className="text-white font-bold text-sm uppercase">Chưa thiết lập</p>
            </div>
          </div>
        </header>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FREE */}
          <div
            className={cn(
              'relative overflow-hidden group transition-all duration-500',
              !isPro ? 'scale-100' : 'scale-95 hover:scale-100',
            )}
          >
            <SCMDCard
              className={cn(
                'p-8 border-2 transition-all duration-500 rounded-[40px] h-full flex flex-col',
                !isPro
                  ? 'border-scmd-silver/20 bg-scmd-surface shadow-2xl'
                  : 'border-white/5 bg-scmd-surface/40',
              )}
            >
              {!isPro && (
                <div className="absolute top-8 right-8 bg-scmd-silver/20 text-white p-2 rounded-full border border-white/10">
                  <Check size={20} strokeWidth={4} />
                </div>
              )}

              <div className="mb-8">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">
                  Gói cơ bản
                </p>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">
                  SCMD FREE
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white uppercase">0đ</span>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                    /vĩnh viễn
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {[
                  'Khởi tạo dùng cơ bản',
                  'Tối đa 1 quản lý',
                  'Tối đa 2 nhân viên',
                  'Giám sát tuần tra Real-time',
                  'SOS & Alarm cơ bản',
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-slate-400" />
                    </div>
                    <span className="text-slate-400 font-semibold text-xs tracking-tight">{feat}</span>
                  </div>
                ))}
              </div>

              <SCMDButton
                disabled={!isPro}
                variant="ghost"
                className="w-full h-14 rounded-[20px] border-2 border-slate-700 text-slate-500 font-black tracking-widest text-[10px] uppercase mt-auto"
              >
                {!isPro ? 'ĐANG SỬ DỤNG' : 'PHIÊN BẢN HIỆN TẠI'}
              </SCMDButton>
            </SCMDCard>
          </div>

          {/* PRO */}
          <div
            className={cn(
              'relative overflow-hidden group transition-all duration-700',
              isPro ? 'scale-105' : 'hover:scale-100',
            )}
          >
            <div className="absolute inset-0 bg-scmd-cyber/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />

            <SCMDCard
              className={cn(
                'p-8 border-2 transition-all duration-700 rounded-[40px] relative z-10 h-full flex flex-col',
                isPro
                   ? 'border-scmd-primary bg-scmd-surface shadow-[0_0_50px_rgba(37,99,235,0.15)]'
                   : 'border-white/5 bg-scmd-navy/60 hover:border-scmd-primary/50',
              )}
            >
              {isPro && (
                <div className="absolute top-8 right-8 bg-scmd-primary text-white p-2 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-white/20">
                  <Check size={20} strokeWidth={4} />
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-scmd-cyber fill-current" />
                  <span className="text-scmd-cyber text-[9px] font-black tracking-[0.2em] uppercase">
                    Khuyên dùng
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">
                  SCMD PRO
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white tracking-tighter">99.000</span>
                  <span className="text-slate-400 text-lg font-black uppercase">đ</span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest ml-1">
                    /nhân viên
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {[
                  'FULL sức mạnh SCMD CORE',
                  'AI WATCHER: Chống gian lận hình ảnh',
                  'Smart Báo cáo PDF & Excel Pro',
                  'Quản lý Vendor & SLA chuyên sâu',
                  'AI Strategic Insight Command',
                  'Hỗ trợ Support 24/7 Priority',
                  'Tư vấn giải pháp bảo mật 1:1',
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-0.5 rounded-full bg-scmd-cyber/10 flex items-center justify-center shrink-0 border border-scmd-cyber/20">
                      <CheckCircle2 size={12} className="text-scmd-cyber" />
                    </div>
                    <span className="text-slate-200 font-bold text-xs tracking-tight">{feat}</span>
                  </div>
                ))}
              </div>

              <SCMDButton
                onClick={() => !isPro && !hasPendingUpgrade && setShowUpgradeModal(true)}
                disabled={isPro || hasPendingUpgrade}
                variant={isPro ? 'ghost' : 'primary'}
                className={cn(
                  'w-full h-14 rounded-[20px] font-black tracking-widest text-[10px] uppercase transition-all duration-300 mt-auto',
                  isPro
                    ? 'border-2 border-scmd-cyber/30 text-scmd-cyber hover:bg-scmd-cyber/10'
                    : hasPendingUpgrade
                    ? 'bg-slate-800 text-slate-500 border-2 border-slate-700'
                    : 'bg-scmd-cyber text-white shadow-2xl shadow-scmd-cyber/30 hover:scale-105 active:scale-95',
                )}
              >
                {isPro 
                  ? 'GÓI CƯỚC HIỆN TẠI' 
                  : hasPendingUpgrade 
                  ? 'ĐANG CHỜ PHÊ DUYỆT' 
                  : 'NÂNG CẤP LÊN PRO NGAY'}
              </SCMDButton>
            </SCMDCard>

            <div className="absolute -bottom-10 left-10 right-10 h-20 bg-scmd-cyber/10 blur-[60px] opacity-20 -z-10" />
          </div>

          {/* PRO MAX */}
          <div className="relative overflow-hidden group transition-all duration-700 scale-95 hover:scale-100">
            <SCMDCard className="p-8 border-2 transition-all duration-500 rounded-[40px] h-full flex flex-col border-slate-800 bg-slate-900/60 hover:border-purple-500/50">
              <div className="mb-8">
                <p className="text-purple-400 text-xs font-black uppercase tracking-widest mb-1">
                  Dành cho tập đoàn
                </p>
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">
                  PRO MAX
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white uppercase">Liên hệ</span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {[
                  'Toàn bộ tính năng gói SCMD PRO',
                  'Dedicated Server & Data Isolation',
                  'SLA 99.99% Guaranteed uptime',
                  'White-label App for Enterprise',
                  'API Access & Custom Integration',
                  'Customize Báo cáo linh hoạt',
                  'Đội ngũ kỹ thuật hỗ trợ On-site',
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 mt-0.5 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                      <CheckCircle2 size={12} className="text-purple-400" />
                    </div>
                    <span className="text-slate-300 font-semibold text-xs tracking-tight">{feat}</span>
                  </div>
                ))}
              </div>

              <SCMDButton
                disabled
                variant="ghost"
                className="w-full h-14 rounded-[20px] border-2 border-purple-500/30 text-purple-400 font-black tracking-widest text-[10px] uppercase mt-auto hover:bg-purple-500/10"
              >
                LIÊN HỆ ĐỘI NGŨ KINH DOANH
              </SCMDButton>
            </SCMDCard>
          </div>
        </div>

        {/* Trust footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
          {[
            {
              icon: <ShieldCheck />,
              title: 'Bảo mật Native',
              desc: 'Cách ly dữ liệu (Isolation) tuyệt đối giữa các doanh nghiệp.',
            },
            {
              icon: <Clock />,
              title: 'Uptime 99.99%',
              desc: 'Hạ tầng Cloud Run tự động mở rộng theo nhu cầu tải của bạn.',
            },
            {
              icon: <HelpCircle />,
              title: 'Sát cánh 24/7',
              desc: 'Đội ngũ kỹ sư SCMD luôn trực chiến giúp bạn xử lý mọi vấn đề.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-slate-900/40 p-8 rounded-[32px] border border-white/5 hover:border-scmd-cyber/20 transition-all group"
            >
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-scmd-cyber mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">
                {item.title}
              </h4>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
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
