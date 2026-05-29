import React, { useCallback, useMemo } from 'react';
import { 
  QrCode, 
  CheckCircle2, 
  MapPin, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Flame, 
  Lock, 
  Camera, 
  Check, 
  X,
  ClipboardCheck,
  Zap,
  AlertCircle,
  Send,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDStatusBadge } from '../../common/interfaces/components/SCMDStatusBadge';
import { SCMDSuspense } from '../../common/interfaces/components/SCMDSuspense';
import { calculateDistance } from '../../../shared/utils/geo';

import { resolveGuardNetworkStatus } from '../../../lib/guard-network-status';

const TacticalMap = React.lazy(() => import('./components/TacticalMap').then(m => ({ default: m.TacticalMap })));

import { usePatrolDashboardState } from './hooks/usePatrolDashboardState';
import { useDashboardStore } from '../store/useDashboardStore';
import { PatrolCard } from './components/PatrolCard';
import { ElapsedTime } from './components/ElapsedTime';

const MapSegment = React.memo(({ checkpoints }: { checkpoints: any[] }) => {
  return (
    <div className="h-[220px] w-full rounded-3xl overflow-hidden border border-white/10 relative z-0 shadow-scmd-deep group bg-scmd-surface">
      <React.Suspense fallback={<SCMDSuspense fullHeight={false} message="Đang nạp bản đồ..." />}>
        <TacticalMap 
          points={Array.isArray(checkpoints) 
            ? checkpoints
                .filter(cp => cp.latitude && cp.longitude)
                .map(cp => ({
                  id: cp.id,
                  name: cp.name,
                  lat: cp.latitude,
                  lon: cp.longitude,
                  status: cp.status === 'completed' ? 'ACTIVE' : 'INACTIVE',
                  type: 'CHECKPOINT'
                })) 
            : []}
          showRouteLine={true}
          onPointClick={(point) => console.log('Clicked', point)}
        />
      </React.Suspense>
      <div className="absolute inset-0 pointer-events-none border-[4px] border-scmd-navy rounded-3xl mix-blend-overlay opacity-50" />
    </div>
  );
});

MapSegment.displayName = 'MapSegment';

export const PatrolDashboard: React.FC = () => {
  const { t } = useTranslation();
  
  const {
    checkpoints,
    loading,
    scanning,
    verifying,
    message, setMessage,
    checklistValues,
    selectedItemInfo, setSelectedItemInfo,
    isCompleting,
    isAnalyzing,
    startTime,
    isSyncing,
    handleScan,
    handleCompleteCheckpoint,
    toggleCheckItem,
    takePhoto,
    handleSendReport,
    isSendDisabled,
    isPatrolDone,
    syncOfflineData,
    setActiveCheckpoint
  } = usePatrolDashboardState();

  // Fine-grained selectors for real-time data
  const isOffline = useDashboardStore((s: any) => s.patrolState.isOffline);
  const pendingCount = useDashboardStore((s: any) => s.patrolState.pendingCount);
  const failedSyncCount = useDashboardStore((s: any) => s.patrolState.failedSyncCount);
  const lastCheckpointTime = useDashboardStore((s: any) => s.patrolState.lastCheckpointTime);
  const activeCheckpoint = useDashboardStore((s: any) => s.patrolState.activeCheckpoint);
  const currentLocation = useDashboardStore((s: any) => s.patrolState.currentLocation);

  const fieldReadiness = useMemo(() => resolveGuardNetworkStatus({
    online: !isOffline,
    pendingCount,
    failedCount: failedSyncCount,
    gpsAvailable: Boolean(currentLocation),
  }), [currentLocation, failedSyncCount, isOffline, pendingCount]);

  const getTaskIcon = useCallback((task: string) => {
    const t = task.toLowerCase();
    if (t.includes('pccc') || t.includes('lửa') || t.includes('cháy')) return <Flame className="text-orange-500" size={32} />;
    if (t.includes('khóa') || t.includes('cửa')) return <Lock className="text-blue-500" size={32} />;
    if (t.includes('điện') || t.includes('trạm')) return <Zap className="text-yellow-500" size={32} />;
    return <ClipboardCheck className="text-emerald-500" size={32} />;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative">
          <Loader2 className="animate-spin text-scmd-cyber" size={48} />
          <div className="absolute inset-0 bg-scmd-cyber/20 blur-xl rounded-full scale-150 animate-pulse" />
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">
          Đang khởi tạo hệ thống tuần tra...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-48"
    >
      <header className="flex justify-between items-center px-2">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">{t('security.patrol_route')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-scmd-silver/60 text-[10px] font-black uppercase tracking-[0.2em]">Ca sáng • Khu vực A</p>
            {isOffline ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-scmd-alert/20 text-scmd-alert rounded-full text-[8px] font-black tracking-widest border border-scmd-alert/30">
                <WifiOff size={10} /> OFFLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-scmd-cyber/20 text-scmd-cyber rounded-full text-[8px] font-black tracking-widest border border-scmd-cyber/30">
                <Wifi size={10} /> ONLINE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={syncOfflineData}>
            <div className={cn(
              "w-12 h-12 rounded-2xl bg-scmd-surface flex items-center justify-center text-scmd-silver border border-white/5 transition-all active:scale-90 shadow-xl",
              isSyncing && "border-scmd-cyber text-scmd-cyber shadow-[0_0_15px_rgba(66,133,244,0.2)]",
              pendingCount > 0 && "border-scmd-cyber/50"
            )}>
              {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </div>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-scmd-cyber text-scmd-navy text-[10px] font-black rounded-full flex items-center justify-center border-2 border-scmd-navy animate-bounce">
                {pendingCount}
              </span>
            )}
          </div>
          <SCMDStatusBadge status="patrolling" />
        </div>
      </header>

      <SCMDCard className={cn(
        'mx-2 border p-4 shadow-xl',
        fieldReadiness.level === 'online' && 'border-emerald-500/20 bg-emerald-500/10',
        fieldReadiness.level === 'degraded' && 'border-amber-500/30 bg-amber-500/10',
        fieldReadiness.level === 'offline' && 'border-red-500/30 bg-red-500/10'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
            fieldReadiness.level === 'online' && 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
            fieldReadiness.level === 'degraded' && 'border-amber-500/30 bg-amber-500/20 text-amber-300',
            fieldReadiness.level === 'offline' && 'border-red-500/30 bg-red-500/20 text-red-300'
          )}>
            {fieldReadiness.level === 'offline' ? <WifiOff size={18} /> : <Wifi size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase text-white">{fieldReadiness.title}</p>
              {fieldReadiness.canSync && (
                <button
                  type="button"
                  onClick={syncOfflineData}
                  className="min-h-12 shrink-0 rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/20 px-4 text-[10px] font-black uppercase tracking-widest text-[#93C5FD] active:scale-95"
                >
                  Đồng bộ
                </button>
              )}
            </div>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-scmd-silver/70">{fieldReadiness.description}</p>
          </div>
        </div>
      </SCMDCard>

      <MapSegment checkpoints={checkpoints} />

      <div className="space-y-4 px-2">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-scmd-silver text-xs font-black uppercase tracking-widest bg-scmd-surface px-3 py-1 rounded-md border border-white/5">
            Lộ trình chi tiết
          </h2>
          <span className="text-[10px] text-scmd-silver/40 font-bold">
            {Array.isArray(checkpoints) ? checkpoints.filter(c => c.status === 'completed').length : 0}/{Array.isArray(checkpoints) ? checkpoints.length : 0} Hoàn tất
          </span>
        </div>
        
        {Array.isArray(checkpoints) && checkpoints.map((checkpoint, index) => {
          const isPendingTarget = index === checkpoints.findIndex(c => c.status === 'pending');
          const distVal = (currentLocation && checkpoint.latitude && checkpoint.longitude)
            ? calculateDistance(currentLocation.lat, currentLocation.lon, checkpoint.latitude, checkpoint.longitude)
            : null;

          return (
            <PatrolCard
              key={checkpoint.id}
              checkpoint={checkpoint}
              index={index}
              isPendingTarget={isPendingTarget}
              distVal={distVal}
              lastCheckpointTime={lastCheckpointTime}
            />
          );
        })}
      </div>

      {/* Optimized Action Bar - Thumb Friendly (Floating above Nav) */}
      <div className="fixed bottom-[84px] left-0 right-0 z-30 pointer-events-none flex justify-center">
        <div className="max-w-md mx-auto w-full px-6 flex items-end justify-between gap-4 pointer-events-auto">
          
          {/* Thumb Zone Secondary: Map/GPS toggle */}
          <button
            onClick={() => {
              const el = document.querySelector('.group');
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="w-12 h-12 rounded-2xl bg-scmd-surface border border-white/5 shadow-xl flex items-center justify-center text-scmd-silver/60 hover:text-white transition-all hover:-translate-y-1"
          >
            <MapPin size={20} />
          </button>

          {/* Primary Action: SCAN QR (Central, Huge Target) */}
          <div className="relative group mb-2">
            <button
              onClick={handleScan}
              disabled={scanning || verifying || isPatrolDone}
              className={cn(
                "w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all relative z-10 border-4",
                scanning || verifying
                  ? "bg-scmd-surface text-scmd-silver/20 border-scmd-navy"
                  : isPatrolDone
                    ? "bg-scmd-primary/20 text-scmd-primary border-scmd-navy cursor-default"
                    : "bg-scmd-primary text-white border-scmd-navy shadow-[0_10px_40px_rgba(37,99,235,0.6)] hover:shadow-[0_15px_50px_rgba(37,99,235,0.8)] active:scale-95"
              )}
            >
              {scanning || verifying ? (
                <Loader2 className="animate-spin" size={28} />
              ) : isPatrolDone ? (
                <CheckCircle2 size={32} />
              ) : (
                <>
                  <QrCode size={30} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-widest mt-0.5">QUÉT</span>
                </>
              )}
            </button>
            {!scanning && !verifying && !isPatrolDone && (
              <div className="absolute inset-0 -m-3 bg-scmd-primary/20 rounded-full animate-pulse blur-xl -z-0" />
            )}
          </div>

          {/* Thumb Zone Secondary: Send/Report */}
          <button
            onClick={handleSendReport}
            disabled={isSendDisabled}
            className={cn(
              "w-12 h-12 rounded-2xl bg-scmd-cyber text-scmd-navy border border-scmd-cyber/30 shadow-xl flex items-center justify-center transition-all hover:-translate-y-1 shadow-scmd-cyber/20",
              isSendDisabled && "opacity-40 grayscale cursor-not-allowed shadow-none"
            )}
            title="Gửi báo cáo"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedItemInfo && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItemInfo(null)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-scmd-surface border border-white/10 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-scmd-cyber/20 rounded-2xl flex items-center justify-center text-scmd-cyber">
                  <HelpCircle size={24} />
                </div>
                <button 
                  onClick={() => setSelectedItemInfo(null)}
                  className="p-2 text-scmd-silver/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <h3 className="text-xl font-black text-white mb-4">{selectedItemInfo.task}</h3>
              
              <div className="space-y-6">
                {selectedItemInfo.description && (
                  <div>
                    <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Mô tả</p>
                    <p className="text-sm text-scmd-silver/80 leading-relaxed font-bold">{selectedItemInfo.description}</p>
                  </div>
                )}
                
                {selectedItemInfo.expected_format && (
                  <div>
                    <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Định dạng yêu cầu</p>
                    <p className="text-sm text-scmd-cyber font-black tracking-tight uppercase">{selectedItemInfo.expected_format}</p>
                  </div>
                )}

                {selectedItemInfo.instructions && (
                  <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Zap size={12} /> Hướng dẫn thực hiện
                    </p>
                    <p className="text-xs text-scmd-silver/60 leading-relaxed font-bold">
                      "{selectedItemInfo.instructions}"
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedItemInfo(null)}
                className="w-full mt-8 py-4 bg-scmd-navy hover:bg-scmd-surface text-white font-black text-[11px] uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
              >
                Đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCheckpoint && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 bg-scmd-navy z-[100] flex flex-col"
          >
            {/* Header - Navy Styled */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-scmd-surface/50 backdrop-blur-xl">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{activeCheckpoint.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] text-scmd-cyber font-black uppercase tracking-[0.2em] opacity-80">Danh mục kiểm tra</p>
                  <span className="text-[10px] font-mono bg-scmd-cyber/10 text-scmd-cyber px-2 rounded-sm border border-scmd-cyber/30">
                    ⏱ {startTime ? <ElapsedTime startTime={startTime} /> : 0}s
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveCheckpoint(null)}
                className="w-12 h-12 bg-scmd-navy rounded-2xl text-scmd-silver flex items-center justify-center border border-white/5 active:scale-90 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Checklist Content - Styled Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 safe-area-bottom pb-40 no-scrollbar">
              <div className="px-2 mb-4">
                <div className="h-1 w-20 bg-scmd-cyber/30 rounded-full mb-2" />
                <p className="text-scmd-silver/50 text-xs font-bold leading-relaxed">Vui lòng hoàn thành tất cả các mục kiểm tra dưới đây để tiếp tục lộ trình.</p>
              </div>

              {(activeCheckpoint.check_items || []).map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <SCMDCard
                    className={cn(
                      "p-6 border transition-all duration-500 flex items-center gap-6 min-h-[120px] card-active rounded-2xl",
                      checklistValues[item.id] 
                        ? "bg-scmd-cyber/10 border-scmd-cyber/40 scmd-glow" 
                        : "bg-scmd-slate/40 border-slate-800/80"
                    )}
                    onClick={() => item.type === 'toggle' && toggleCheckItem(item.id)}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                      checklistValues[item.id] ? "bg-scmd-cyber text-scmd-navy" : "bg-scmd-navy text-slate-600"
                    )}>
                      {checklistValues[item.id] ? <Check size={40} strokeWidth={3} /> : getTaskIcon(item.task)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-black text-xl leading-tight transition-colors duration-500",
                          checklistValues[item.id] ? "text-scmd-cyber" : "text-scmd-silver"
                        )}>{item.task}</p>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setSelectedItemInfo(item);
                          }}
                          className="p-2 text-slate-500 hover:text-scmd-cyber transition-all active:scale-125"
                        >
                          <HelpCircle size={22} />
                        </button>
                      </div>
                      {item.required && !checklistValues[item.id] && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertCircle size={10} className="text-scmd-alert" />
                          <span className="text-[10px] font-black text-scmd-alert uppercase tracking-widest">Bắt buộc</span>
                        </div>
                      )}
                    </div>

                    {item.type === 'photo' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); takePhoto(item.id); }}
                        className={cn(
                          "w-20 h-20 rounded-2xl flex items-center justify-center transition-all shrink-0 border-2 overflow-hidden",
                          checklistValues[item.id] 
                            ? "border-scmd-cyber" 
                            : "bg-scmd-cyber text-scmd-navy border-scmd-cyber/50 shadow-scmd-glow"
                        )}
                      >
                        {checklistValues[item.id] ? (
                          <img 
                            src={checklistValues[item.id]} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.onerror = null;
                            }}
                          />
                        ) : (
                          <Camera size={36} />
                        )}
                      </button>
                    )}
                  </SCMDCard>
                </motion.div>
              ))}

              {(activeCheckpoint.check_items || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-scmd-slate/30 flex items-center justify-center">
                    <ClipboardCheck size={48} className="opacity-40" />
                  </div>
                  <p className="text-center font-bold text-scmd-silver/30 leading-relaxed uppercase tracking-widest text-[10px]">
                    Mục tiêu này không có checklist.<br/>Hết sức đơn giản, bấm hoàn tất ngay.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action - Thumb Friendly (Floating with Blur) */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-scmd-navy via-scmd-navy to-transparent z-50">
              <button
                onClick={handleCompleteCheckpoint}
                disabled={isSendDisabled}
                className={cn(
                  "w-full h-16 rounded-2xl font-black text-xl uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-4 border-b-4 active:border-b-0 active:translate-y-1",
                  !isSendDisabled 
                    ? "bg-scmd-cyber text-scmd-navy border-scmd-cyber/50 shadow-[0_0_60px_rgba(66,133,244,0.3)]" 
                    : "bg-scmd-slate/50 text-slate-700 border-slate-800 opacity-50"
                )}
              >
                {isCompleting || isAnalyzing ? (
                  <div className="flex items-center gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="text-[12px] font-black uppercase tracking-widest animate-pulse">
                      {isAnalyzing ? "AI Analyzing..." : "Uploading..."}
                    </span>
                  </div>
                ) : (
                  <>
                    <Send size={32} />
                    HOÀN THÀNH
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-48 left-4 right-4 p-4 rounded-xl shadow-lg text-center font-medium z-50 flex items-center justify-center gap-2",
              message.type === 'success' ? "bg-emerald-600 text-white" : 
              message.type === 'warning' ? "bg-yellow-500 text-slate-900" : "bg-red-600 text-white"
            )}
          >
            {message.type === 'warning' && <AlertCircle size={18} />}
            {message.text}
            <button 
              onClick={() => setMessage(null)}
              className="absolute top-1 right-2 text-white/50"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
