import React, { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { motion, AnimatePresence } from "motion/react";
import { X, LayoutDashboard, ClipboardCheck, Camera } from "lucide-react";
import { FeatureLock } from "../../common/interfaces/components/FeatureLock";
import {
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
} from "../../common/interfaces/components/DashboardUI";
import { WatcherInsights } from "./components/WatcherInsights";
import { ViolationsMainTable } from "./components/OperationsTables";
import { useDashboardStore } from "../store/useDashboardStore";
import { cn } from "../../../lib/utils";

interface ViolationsTabProps {
  isPro: boolean;
  embedded?: boolean;
  setShowUpgradeModal: (val: boolean) => void;
  handleExportWatcherReport: () => void;
  handleAnomalyFeedback: (
    alertId: string,
    verdict: any,
    notes?: string,
  ) => void;
}

export const ViolationsTab: React.FC<ViolationsTabProps> = ({
  isPro,
  embedded = false,
  setShowUpgradeModal,
  handleExportWatcherReport,
  handleAnomalyFeedback,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'violations' | 'watcher'>('violations');
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { activeSOS, anomalies, anomalyStats, nocFeed, trustScore } =
    useDashboardStore(
      useShallow((state) => ({
        activeSOS: state.activeSOS,
        anomalies: state.anomalies,
        anomalyStats: state.anomalyStats,
        nocFeed: state.nocFeed,
        trustScore: state.trustScore,
      })),
    );

  const sortedAnomalies = useMemo(() => {
    const p: Record<string, number> = { CRITICAL: 0, WARNING: 1 };
    return [...(anomalies || [])].sort((a, b) => {
      const diff = (p[a.severity] ?? 2) - (p[b.severity] ?? 2);
      return diff !== 0
        ? diff
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [anomalies]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {!embedded ? (
        <DashboardPageHeader
          title="Sự cố & Vi phạm"
          eyebrow="Watcher center"
          description="Trung tâm xử lý tập trung mọi bất thường: SOS, gian lận, vi phạm SLA và cảnh báo vận hành."
        />
      ) : null}
      {!isPro ? (
        <FeatureLock
          title="An ninh tập trung & AI"
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tab Navigation - Tinh gọn luồng nhận thức */}
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <div className="flex gap-6">
              {[
                { id: 'violations', label: 'Xử lý Vi phạm', icon: ClipboardCheck },
                { id: 'watcher', label: 'The Watcher AI', icon: LayoutDashboard },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 pb-3 text-[13px] font-bold transition-all border-b-2",
                    activeSubTab === tab.id 
                      ? "border-blue-500 text-white" 
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'violations' ? (
              <motion.div
                key="violations-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* 1. KPIs chỉ hiển thị tại Tab 1 để tập trung xử lý */}
                <DashboardMetricGrid className="md:grid-cols-4">
                  <DashboardMetricCard
                    label="SOS khẩn cấp"
                    value={activeSOS ? "1" : "0"}
                    tone={activeSOS ? "danger" : "success"}
                    description="Cảnh báo thực địa cần ứng cứu"
                  />
                  <DashboardMetricCard
                    label="Chờ Review"
                    value={anomalies.length}
                    tone="warning"
                    description="Vi phạm chưa chốt kỷ luật"
                  />
                  <DashboardMetricCard
                    label="NOC Warning"
                    value={nocFeed.filter((f: any) => f.status === "WARNING").length}
                    tone="primary"
                    description="Tín hiệu NOC Feed rủi ro"
                  />
                  <DashboardMetricCard
                    label="SLA Tuân thủ"
                    value={`${trustScore?.averageScore || 0}%`}
                    tone={trustScore?.averageScore > 90 ? "success" : "warning"}
                    description="Chỉ số tin cậy toàn hệ thống"
                  />
                </DashboardMetricGrid>

                {/* 2. Bảng Vi phạm: Tràn lề, full-height, tối ưu diện tích */}
                <div className="overflow-hidden">
                  <ViolationsMainTable
                    onFeedback={(id) => {
                      setSelectedViolation({ id });
                      setIsDrawerOpen(true);
                    }}
                    onExportReport={handleExportWatcherReport}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="watcher-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Tab 2: Gom toàn bộ Dashboard AI vào đây */}
                <WatcherInsights
                  trustScore={trustScore}
                  anomalies={sortedAnomalies}
                  anomalyStats={anomalyStats}
                  onFeedback={handleAnomalyFeedback}
                  onExportReport={handleExportWatcherReport}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Review Drawer: Luồng xử lý chi tiết không cản tầm nhìn */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) setIsDrawerOpen(false);
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex h-full w-full sm:max-w-xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Thẩm định vi phạm</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mã vụ việc: #{selectedViolation?.id?.slice(0,8)}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <section className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Bằng chứng hiện trường</h3>
                  <div className="aspect-video rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-700">
                    <Camera size={48} className="opacity-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Tọa độ GPS</p>
                      <p className="text-xs font-mono text-white mt-1">10.76262, 106.66017</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Thiết bị</p>
                      <p className="text-xs text-white mt-1">iPhone 15 Pro (SCMD-092)</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Kết luận & Xử lý</h3>
                  <textarea 
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-blue-500 outline-none h-32"
                    placeholder="Nhập ghi chú thẩm định hoặc lý do miễn trừ..."
                  />
                </section>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 bg-slate-900/50 p-6">
                <button className="h-12 rounded-xl bg-white/5 text-xs font-black uppercase text-slate-300 hover:bg-white/10">
                  Miễn trừ (Waive)
                </button>
                <button className="h-12 rounded-xl bg-red-600 text-xs font-black uppercase text-white shadow-lg shadow-red-600/20 hover:bg-red-500">
                  Xác nhận phạt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
