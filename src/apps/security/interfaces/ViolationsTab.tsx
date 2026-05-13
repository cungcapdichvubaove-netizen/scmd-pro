import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { FeatureLock } from '../../common/interfaces/components/FeatureLock';
import { WatcherInsights } from './components/WatcherInsights';
import { useDashboardStore } from '../store/useDashboardStore';

interface ViolationsTabProps {
  isPro: boolean;
  setShowUpgradeModal: (val: boolean) => void;
  handleExportWatcherReport: () => void;
  handleAnomalyFeedback: (alertId: string, verdict: any, notes?: string) => void;
}

export const ViolationsTab: React.FC<ViolationsTabProps> = ({
  isPro,
  setShowUpgradeModal,
  handleExportWatcherReport,
  handleAnomalyFeedback
}) => {
  const { activeSOS, anomalies, anomalyStats, nocFeed, trustScore } = useDashboardStore(useShallow(state => ({
    activeSOS: state.activeSOS,
    anomalies: state.anomalies,
    anomalyStats: state.anomalyStats,
    nocFeed: state.nocFeed,
    trustScore: state.trustScore
  })));

  const sortedAnomalies = useMemo(() => {
    const p: Record<string, number> = { CRITICAL: 0, WARNING: 1 };
    return [...(anomalies || [])].sort((a, b) => {
      const diff = (p[a.severity] ?? 2) - (p[b.severity] ?? 2);
      return diff !== 0 ? diff : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [anomalies]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-4xl font-black tracking-tight text-white uppercase">
          Sự cố & Vi phạm
        </h2>
        <p className="text-slate-400 mt-2 font-medium">
          Trung tâm xử lý tập trung mọi bất thường: SOS, Gian lận, và Vi phạm SLA.
        </p>
      </header>
      {!isPro ? (
        <FeatureLock
          title="An ninh tập trung & AI"
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SCMDCard className="bg-scmd-surface border-red-500/20 p-6">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">
                SOS Khẩn cấp
              </p>
              <p className="text-3xl font-black text-red-500">{activeSOS ? '1' : '0'}</p>
            </SCMDCard>
            <SCMDCard className="bg-scmd-surface border-amber-500/20 p-6">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">
                Cảnh báo Watcher
              </p>
              <p className="text-3xl font-black text-amber-500">{anomalies.length}</p>
            </SCMDCard>
            <SCMDCard className="bg-scmd-surface border-scmd-primary/20 p-6">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">
                Bỏ điểm/Đi trễ
              </p>
              <p className="text-3xl font-black text-scmd-primary">
                {nocFeed.filter((f: any) => f.status === 'WARNING').length}
              </p>
            </SCMDCard>
          </div>
          <WatcherInsights
            trustScore={trustScore}
            anomalies={sortedAnomalies}
            anomalyStats={anomalyStats}
            onFeedback={handleAnomalyFeedback}
            onExportReport={handleExportWatcherReport}
          />
        </>
      )}
    </div>
  );
};
