import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Map, 
  TrendingUp, 
  Download, 
  Eye,
  Clock,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../../../../lib/utils';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { useDebounce } from '../../../common/hooks/useDebounce';

interface WatcherAnomalies {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'CRITICAL' | 'WARNING';
}

interface WatcherInsightsProps {
  trustScore: { 
    averageScore: number; 
    status: string;
    trend?: { date: string; score: number }[];
  };
  anomalies: WatcherAnomalies[];
  anomalyStats?: {
    stationaryCount: number;
    missedCount: number;
    totalCount: number;
    criticalCount: number;
  };
  onFeedback?: (alertId: string, verdict: 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'INCONCLUSIVE', notes?: string) => void;
  onExportReport?: () => void;
  isPrintMode?: boolean;
}

export const WatcherInsights: React.FC<WatcherInsightsProps> = ({
  trustScore,
  anomalies,
  anomalyStats,
  onFeedback,
  onExportReport,
  isPrintMode = false
}) => {
  const searchParams = new URLSearchParams(window.location.search);
  const focusId = searchParams.get('focusId');
  const focusType = searchParams.get('focusType');
  const [feedbackNotes, setFeedbackNotes] = React.useState<Record<string, string>>({});
  const [activeFeedback, setActiveFeedback] = React.useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = React.useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  // removed showExportLock state

  const filteredAnomalies = React.useMemo(() => {
    return anomalies.filter(a => {
      const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
      const matchesSearch = !debouncedSearchTerm || 
        a.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        a.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        a.type.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [anomalies, severityFilter, debouncedSearchTerm]);

  const [highlightedAnomalyId, setHighlightedAnomalyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!focusId || focusType !== 'violation') return;

    const target = filteredAnomalies.find((anomaly) => anomaly.id === focusId);
    if (!target) return;

    setHighlightedAnomalyId(focusId);
    const element = document.querySelector(`[data-violation-id="${CSS.escape(focusId)}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timer = window.setTimeout(() => {
      setHighlightedAnomalyId((current) => current === focusId ? null : current);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [filteredAnomalies, focusId, focusType]);

  const handleFeedback = (alertId: string, verdict: 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'INCONCLUSIVE') => {
    if (onFeedback) {
      onFeedback(alertId, verdict, feedbackNotes[alertId] || '');
      setActiveFeedback(null);
      // Cleanup notes cho alert này sau khi đã submit
      setFeedbackNotes(prev => {
        const updated = { ...prev };
        delete updated[alertId];
        return updated;
      });
    }
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">The Watcher <span className="text-scmd-cyber">AI</span></h2>
          <p className="text-scmd-silver/40 font-bold uppercase tracking-widest text-[10px] mt-2">Hệ thống giám định tin cậy & Chống gian lận</p>
        </div>
        {!isPrintMode && (
          <SCMDButton onClick={onExportReport} className="bg-scmd-cyber text-slate-950 h-10 px-6 shadow-lg shadow-scmd-cyber/20 font-black text-[10px] uppercase tracking-widest">
            <Download size={16} className="mr-2" /> Báo cáo giám định
          </SCMDButton>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Trust Score & Pie Chart */}
        <div className="col-span-4">
          <SCMDCard className="p-8 h-full flex flex-col items-center justify-center bg-scmd-surface border-white/5">
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="rgba(239, 68, 68, 0.1)"
                  strokeWidth="16"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray={`${trustScore.averageScore * 2.51327} 251.327`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white tracking-tighter">{trustScore.averageScore}%</span>
                <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Tin cậy</span>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className={cn(
                "text-lg font-black uppercase tracking-widest mb-2",
                trustScore.status === 'EXCELLENT' ? "text-emerald-500" : "text-red-500"
              )}>
                {trustScore.status === 'EXCELLENT' ? 'TỐT' : 'CẢNH BÁO'}
              </h3>
              <p className="text-xs text-scmd-silver/60 leading-relaxed font-bold">
                Dựa trên phân tích <strong className="text-scmd-cyber">Anti-cheat Engine</strong> về tọa độ, tốc độ di chuyển và tính toàn vẹn.
              </p>
            </div>
          </SCMDCard>
        </div>

        {/* Trust Score Trend Chart */}
        <div className="col-span-8">
          <SCMDCard className="p-8 h-full bg-scmd-surface border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-scmd-cyber/10 flex items-center justify-center text-scmd-cyber border border-scmd-cyber/20">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Xu hướng tin cậy (7 ngày)</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-scmd-cyber shadow-[0_0_8px_rgba(0,255,153,0.5)]" />
                  <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Chỉ số Trust</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trustScore.trend || []}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(204, 214, 246, 0.2)" 
                    fontSize={10} 
                    fontWeight="900"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="rgba(204, 214, 246, 0.2)" 
                    fontSize={10} 
                    fontWeight="900"
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-bg)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    itemStyle={{ color: 'var(--color-primary)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SCMDCard>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Anomaly Statistics */}
        <div className="col-span-4 space-y-4">
          <SCMDCard className="p-6 bg-red-500/5 border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Cảnh báo nghiêm trọng</p>
                <p className="text-3xl font-black text-white">{anomalyStats?.criticalCount || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                <AlertTriangle size={24} />
              </div>
            </div>
          </SCMDCard>

          <SCMDCard className="p-6 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Đứng yên quá lâu</p>
                <p className="text-3xl font-black text-white">{anomalyStats?.stationaryCount || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Clock size={24} />
              </div>
            </div>
          </SCMDCard>

          <SCMDCard className="p-6 bg-scmd-cyber/5 border-scmd-cyber/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest mb-1">Bỏ sót nhiệm vụ</p>
                <p className="text-3xl font-black text-white">{anomalyStats?.missedCount || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-scmd-cyber/20 flex items-center justify-center text-scmd-cyber">
                <ShieldCheck size={24} />
              </div>
            </div>
          </SCMDCard>
        </div>

        {/* Anomalies Feed */}
        <div className="col-span-8">
          <div className="bg-scmd-surface rounded-[32px] border border-white/5 p-8 h-full shadow-2xl">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20 shadow-lg shadow-red-500/10">
                    <Eye size={20} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Danh sách bất thường thời gian thực</h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex bg-scmd-navy/50 p-1 rounded-xl border border-white/5 shadow-inner">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'CRITICAL', label: 'Nghiêm trọng' },
                    { id: 'WARNING', label: 'Cảnh báo' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeverityFilter(s.id as any)}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all',
                        severityFilter === s.id
                          ? 'bg-scmd-primary text-white shadow-lg'
                          : 'text-scmd-silver/40 hover:text-scmd-silver/60',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-w-[200px] relative">
                   <input 
                    type="text"
                    placeholder="Tìm kiếm bất thường AI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-scmd-navy/50 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-white outline-none focus:border-scmd-cyber transition-all placeholder:text-scmd-silver/20 uppercase shadow-inner"
                   />
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
              {filteredAnomalies.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-2xl bg-scmd-navy/20">
                  <ShieldCheck size={48} className="mx-auto text-scmd-cyber/20 mb-4" />
                  <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Không phát hiện bất thường</p>
                </div>
              ) : (
                filteredAnomalies.map((anomaly) => (
                  <motion.div
                    key={anomaly.id}
                    data-violation-id={anomaly.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-5 rounded-2xl border flex items-start gap-5 transition-all hover:translate-x-1 shadow-lg",
                      anomaly.severity === 'CRITICAL'
                        ? "bg-red-500/5 border-red-500/10"
                        : "bg-amber-500/5 border-amber-500/10",
                      highlightedAnomalyId === anomaly.id && "border-scmd-primary/70 bg-scmd-primary/10 ring-2 ring-scmd-primary/40 shadow-scmd-primary/15"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-white/5",
                      anomaly.severity === 'CRITICAL' ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{anomaly.title}</h4>
                        <span className="text-[10px] font-black text-scmd-silver/40">
                          {new Date(anomaly.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-xs text-scmd-silver/60 mt-1 leading-relaxed font-bold">{anomaly.description}</p>
                      
                      {activeFeedback === anomaly.id ? (
                        <div className="mt-4 space-y-3 bg-scmd-navy/50 p-3 rounded-xl border border-white/5 shadow-inner">
                          <input
                            type="text"
                            placeholder="Ghi chú (vd: Đang test hệ thống)..."
                            className="w-full bg-scmd-surface border border-white/5 rounded-lg px-3 py-2 text-xs text-scmd-silver/80 focus:outline-none focus:border-scmd-cyber font-bold"
                            value={feedbackNotes[anomaly.id] || ''}
                            onChange={(e) => setFeedbackNotes(prev => ({ ...prev, [anomaly.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleFeedback(anomaly.id, 'TRUE_POSITIVE')} className="flex-1 bg-red-500/20 text-red-400 px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-tight border border-red-500/20">Gian lận thật</button>
                            <button onClick={() => handleFeedback(anomaly.id, 'FALSE_POSITIVE')} className="flex-1 bg-scmd-cyber/20 text-scmd-cyber px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-tight border border-scmd-cyber/20">Sai lầm AI</button>
                            <button onClick={() => handleFeedback(anomaly.id, 'INCONCLUSIVE')} className="flex-1 bg-scmd-surface text-scmd-silver/40 px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-tight border border-white/5">Chưa rõ</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 mt-4">
                          <button className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/40 hover:text-white flex items-center gap-1.5 transition-colors">
                            <MapPin size={12} /> Vị trí
                          </button>
                          <button 
                            onClick={() => setActiveFeedback(anomaly.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-scmd-cyber hover:text-scmd-cyber/80 flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 size={12} /> Gửi Feedback AI
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap & Audit Trail Placeholder */}
      <div className="grid grid-cols-2 gap-8">
        <SCMDCard className="p-8 bg-scmd-surface border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-scmd-cyber/10 flex items-center justify-center text-scmd-cyber border border-scmd-cyber/20">
              <Map size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Bản đồ nhiệt sự cố (Heatmap)</h3>
          </div>
          <div className="aspect-video bg-scmd-navy/50 rounded-2xl border border-white/5 flex items-center justify-center shadow-inner">
            <p className="text-[10px] font-black text-scmd-silver/20 uppercase tracking-widest">Đang tải dữ liệu không gian...</p>
          </div>
        </SCMDCard>

        <SCMDCard className="p-8 bg-scmd-surface border-white/5 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Nhật ký an ninh bất biến</h3>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-scmd-navy/30 rounded-xl border border-white/5 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black text-scmd-silver/60 uppercase tracking-widest">PATROL_VERIFIED_{i}</span>
                </div>
                <span className="text-[10px] font-mono text-scmd-silver/20">SHA256: 8f3a...</span>
              </div>
            ))}
          </div>
        </SCMDCard>
      </div>
    </div>
  );
};
