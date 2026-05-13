import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../store/useDashboardStore';
import {
  AlertCircle,
  BrainCircuit,
  Lock,
  CheckCircle2,
  Shield,
  ArrowRight,
  Users,
  ChevronRight,
  User,
} from 'lucide-react';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDSuspense } from '../../common/interfaces/components/SCMDSuspense';
import { cn } from '../../../lib/utils';
import type { Staff, Stats, ActiveTab } from './types';

const TacticalMap = React.lazy(() => import('./components/TacticalMap').then(m => ({ default: m.TacticalMap })));
const CommandFeed = React.lazy(() => import('./components/CommandFeed').then(m => ({ default: m.CommandFeed })));
const PriorityWidget = React.lazy(() => import('./components/PriorityWidget').then(m => ({ default: m.PriorityWidget })));
const PredictiveInsights = React.lazy(() => import('./components/PredictiveInsights').then(m => ({ default: m.PredictiveInsights })));

// Using local StatCard component
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendInverse?: boolean;
  subtext?: string;
}> = ({ label, value, icon, trend, trendInverse, subtext }) => (
  <SCMDCard
    glass={false}
    className="bg-scmd-surface p-6 rounded-[32px] border border-white/5 shadow-2xl hover:border-scmd-primary/30 transition-all duration-500 group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-scmd-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-scmd-primary/10 transition-colors" />
    <div className="flex items-center justify-between mb-6 relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-scmd-navy/80 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-inner">
        {icon}
      </div>
      {trend && (
        <span
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase border',
            trend.startsWith('+')
              ? trendInverse
                ? 'bg-scmd-error/10 text-scmd-error border-scmd-error/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : trendInverse
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-scmd-error/10 text-scmd-error border-scmd-error/20',
          )}
        >
          {trend}
        </span>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] mb-1">{label}</p>
      <p className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{value}</p>
      {subtext && (
        <p className="text-[10px] text-scmd-silver/30 font-bold mt-2 uppercase tracking-wide opacity-50">{subtext}</p>
      )}
    </div>
  </SCMDCard>
);

interface OverviewTabProps {
  isPro: boolean;
  stats: Stats;
  staff: Staff[];
  mapData: any[];
  priorities: any[];
  monthlyInsights: any;
  isLoadingMonthlyAI: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  setShowBugModal: (show: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setSelectedMapPoint: (point: any) => void;
  onExportPriorities: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = React.memo(({
  isPro,
  stats,
  staff,
  mapData,
  priorities,
  monthlyInsights,
  isLoadingMonthlyAI,
  setActiveTab,
  setShowBugModal,
  setShowUpgradeModal,
  setSelectedMapPoint,
  onExportPriorities,
}) => {
  const { nocFeed } = useDashboardStore(useShallow(state => ({
    nocFeed: state.nocFeed
  })));

  const sortedNocFeed = useMemo(() => {
    return [...(nocFeed || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [nocFeed]);

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">Tổng quan Hệ thống</h2>
          <p className="text-scmd-silver/40 font-bold uppercase tracking-widest text-[10px] mt-2">
            Dữ liệu chiến lược cho người quản lý
          </p>
        </div>
        <div className="flex gap-3">
          <SCMDButton
            onClick={() => setActiveTab('incidents')}
            className="bg-scmd-error/10 text-scmd-error border-scmd-error/20 hover:bg-scmd-error/20 h-10 px-4"
          >
            <AlertCircle size={16} /> Sự cố
          </SCMDButton>
          <SCMDButton
            onClick={() => setShowBugModal(true)}
            className="bg-scmd-navy text-scmd-silver/60 border-white/5 h-10 px-4 hover:bg-scmd-surface hover:text-white transition-all"
          >
            Báo cáo lỗi
          </SCMDButton>
        </div>
      </div>

      {/* Daily Brief */}
      <SCMDCard className="bg-scmd-surface border-scmd-cyber/20 p-6 relative overflow-hidden group">
        {!isPro && (
          <div className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
            <div className="bg-scmd-navy p-4 rounded-3xl shadow-2xl border border-white/10 mb-4 animate-bounce">
              <Lock className="text-scmd-cyber" size={24} />
            </div>
            <SCMDButton
              onClick={() => setShowUpgradeModal(true)}
              className="h-10 px-6 bg-scmd-cyber text-scmd-navy font-black text-[10px] uppercase tracking-widest shadow-xl shadow-scmd-cyber/20"
            >
              Nâng cấp PRO để xem AI Insight
            </SCMDButton>
          </div>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-scmd-cyber/20 rounded-xl flex items-center justify-center">
            <BrainCircuit size={20} className="text-scmd-cyber" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              Daily Brief • <span className="text-scmd-cyber">SCMD Insight</span>
            </h3>
            <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-widest">
              Phân tích nhanh đầu ca trực hôm nay
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              color: 'emerald',
              label: 'Trạng thái Site',
              text: 'Site Hồ Chí Minh đang hoạt động tốt nhất với SLA 98%.',
            },
            {
              color: 'scmd-alert',
              label: 'Cảnh báo SLA',
              text: 'Vendor Security Pro có xu hướng bỏ điểm vào ca đêm.',
            },
            {
              color: 'sky',
              label: 'Hành động gợi ý',
              text: 'Cần kiểm tra đột xuất tại Cổng số 3 do tần suất vi phạm tăng.',
            },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/40">
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-bold text-scmd-silver/80 leading-relaxed font-bold">{item.text}</p>
            </div>
          ))}
        </div>
      </SCMDCard>

      {/* Predictive Insights (Edge + Cloud AI Strategy) */}
      <div className={cn("transition-all duration-700", !isPro && "opacity-40 grayscale pointer-events-none")}>
         <React.Suspense fallback={<SCMDSuspense fullHeight={false} message="Đang nạp AI Insights..." />}>
          <PredictiveInsights />
         </React.Suspense>
      </div>

      {/* Map + Feed */}
      <div className="grid grid-cols-12 gap-8 h-[500px]">
        <div className="col-span-8 h-full">
          <React.Suspense fallback={<SCMDSuspense fullHeight={false} message="Đang khởi tạo bản đồ chiến thuật..." />}>
            <TacticalMap points={mapData} onPointClick={setSelectedMapPoint} />
          </React.Suspense>
        </div>
        <div className="col-span-4 h-full">
          <React.Suspense fallback={<SCMDSuspense fullHeight={false} message="Đang nạp bảng tin..." />}>
            <CommandFeed items={sortedNocFeed} />
          </React.Suspense>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8">
          <div className="grid grid-cols-3 gap-6">
            <StatCard
              label="Tỉ lệ hoàn thành"
              value={`${stats.completionRate}%`}
              icon={<CheckCircle2 className="text-scmd-safety" />}
              trend="+5.2%"
            />
            <StatCard
              label="Lượt tuần tra"
              value={Array.isArray(stats.completedCheckpoints) ? stats.completedCheckpoints.toString() : (stats.completedCheckpoints || 0).toString()}
              icon={<Shield className="text-scmd-cyber" />}
              subtext={`Trên tổng số ${stats.totalCheckpoints} điểm`}
            />
            <StatCard
              label="Sự cố SOS"
              value={(Array.isArray(nocFeed) ? nocFeed.filter((i: any) => i.type === 'SOS').length : 0).toString()}
              icon={<AlertCircle className="text-scmd-alert" />}
              trend={(Array.isArray(nocFeed) && nocFeed.filter((i: any) => i.type === 'SOS').length > 0) ? '+1' : '0'}
              trendInverse
            />

            {/* AI Monthly Insight card */}
            <SCMDCard
              onClick={() => (isPro ? setActiveTab('reports') : setShowUpgradeModal(true))}
              className="col-span-3 bg-scmd-surface border-white/5 p-6 rounded-[32px] overflow-hidden relative group cursor-pointer hover:border-scmd-primary/30 transition-all duration-300"
            >
              {!isPro && (
                <div className="absolute inset-0 bg-scmd-navy/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="bg-scmd-navy p-3 rounded-2xl shadow-2xl border border-white/10 group-hover:scale-110 transition-transform">
                    <Lock className="text-scmd-cyber" size={20} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={cn(
                    'bg-scmd-primary p-1.5 rounded-lg shadow-lg shadow-scmd-primary/20',
                    isLoadingMonthlyAI && 'animate-pulse'
                  )}
                >
                  <BrainCircuit size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-scmd-primary">
                  {isLoadingMonthlyAI
                    ? 'The Strategist is calculating...'
                    : 'Chief Strategist AI Insight'}
                </span>
              </div>
              {monthlyInsights ? (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-scmd-silver line-clamp-2">
                    "{monthlyInsights.summary}"
                  </p>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[8px] font-black text-scmd-silver/60 uppercase tracking-widest mb-1">
                        Rủi ro gian lận
                      </p>
                      <p
                        className={cn(
                          'text-xl font-black',
                          monthlyInsights.fraudRiskScore > 20
                            ? 'text-red-500'
                            : 'text-emerald-500'
                        )}
                      >
                        {monthlyInsights.fraudRiskScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-scmd-silver/60 uppercase tracking-widest mb-1">
                        Hiệu quả SLV
                      </p>
                      <p className="text-xl font-black text-white">
                        {monthlyInsights.efficiencyScore}%
                      </p>
                    </div>
                    <div className="ml-auto flex items-end">
                      <span className="text-[10px] font-black text-blue-500 flex items-center gap-1">
                        Chi tiết <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-scmd-silver/40 font-bold py-4 text-center">
                  Chưa có dữ liệu chiến lược tháng này
                </p>
              )}
            </SCMDCard>

            {/* Staff preview shortcut */}
            <SCMDCard
              onClick={() => setActiveTab('staff')}
              className="bg-scmd-surface p-6 rounded-[32px] border border-white/5 shadow-2xl hover:border-scmd-primary/50 transition-all cursor-pointer group relative overflow-hidden col-span-3 md:col-span-1"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-scmd-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-scmd-primary/20">
                  <Users className="text-scmd-primary" size={24} />
                </div>
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">
                  Quản lý nhân sự
                </p>
                <p className="text-2xl font-black text-white">{Array.isArray(staff) ? staff.length : 0} Nhân viên</p>
                <div className="mt-4 flex items-center gap-2 text-scmd-primary text-[10px] font-black uppercase tracking-widest">
                  Quản lý ngay <ChevronRight size={12} />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-scmd-primary/5 rounded-full blur-2xl" />
            </SCMDCard>
          </div>
        </div>
        <div className="col-span-4">
          <React.Suspense fallback={<SCMDSuspense fullHeight={false} message="Đang nạp danh sách ưu tiên..." />}>
            <PriorityWidget
              tasks={priorities}
              onExport={onExportPriorities}
            />
          </React.Suspense>
        </div>
      </div>

      {/* Staff preview */}
      <div className="bg-scmd-surface/50 rounded-[40px] border border-white/5 p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Nhân sự trực tuyến</h3>
            <p className="text-scmd-primary/60 text-[10px] font-black uppercase tracking-widest mt-1">
              Trạng thái quân số thời gian thực
            </p>
          </div>
          <SCMDButton
            onClick={() => setActiveTab('staff')}
            className="bg-scmd-navy text-scmd-primary border-scmd-primary/20 hover:bg-scmd-primary/10 h-10 px-4"
          >
            Xem tất cả <ChevronRight size={14} className="ml-1" />
          </SCMDButton>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {Array.isArray(staff) && staff.slice(0, 4).map((s) => (
            <div
              key={s.id}
              className="bg-scmd-surface p-6 rounded-3xl border border-white/5 hover:border-scmd-primary/30 transition-all group shadow-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-scmd-navy rounded-2xl flex items-center justify-center text-scmd-silver/40 group-hover:text-scmd-primary transition-colors border border-white/5 shadow-inner">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-black text-white text-sm">{s.fullName}</p>
                  <p className="text-[10px] font-bold text-scmd-silver/40 uppercase tracking-widest">
                    {s.staffId}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest bg-scmd-primary/10 text-scmd-primary px-2 py-1 rounded-md border border-scmd-primary/20">
                  {s.role}
                </span>
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Online</span>
                </div>
              </div>
            </div>
          ))}
          {(!Array.isArray(staff) || staff.length === 0) && (
            <div className="col-span-4 py-16 text-center border-2 border-dashed border-white/5 rounded-[32px] bg-scmd-navy/20 group hover:border-scmd-primary/20 transition-all duration-500">
              <div className="w-20 h-20 bg-scmd-navy rounded-[28px] border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-scmd-primary/10 to-transparent" />
                <Users className="text-scmd-silver/20 group-hover:text-scmd-primary/40 transition-colors duration-500" size={32} />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 border border-scmd-primary/20 rounded-[28px]"
                />
              </div>
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] text-[10px]">Chưa có dữ liệu nhân sự</p>
              <p className="text-scmd-silver/20 text-[10px] font-medium max-w-xs mx-auto mt-2 tracking-normal">Bắt đầu bằng việc thêm nhân viên quản trị hoặc đội ngũ bảo vệ vào hệ thống.</p>
              <button
                onClick={() => setActiveTab('staff')}
                className="mt-6 px-6 py-2.5 bg-scmd-navy border border-scmd-primary/30 text-scmd-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-scmd-primary hover:text-white transition-all active:scale-95"
              >
                Thiết lập ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
