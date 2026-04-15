import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Map, 
  TrendingUp, 
  Download, 
  Eye,
  Clock
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
  onExportReport: () => void;
}

export const WatcherInsights: React.FC<WatcherInsightsProps> = ({ 
  trustScore, 
  anomalies, 
  anomalyStats,
  onExportReport 
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">The Watcher <span className="text-scmd-cyber">AI</span></h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Hệ thống giám định tin cậy & Chống gian lận</p>
        </div>
        <SCMDButton onClick={onExportReport} className="bg-scmd-cyber text-slate-950 h-12 px-6 shadow-lg shadow-scmd-cyber/20">
          <Download size={18} className="mr-2" /> Báo cáo giám định tin cậy
        </SCMDButton>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Trust Score & Pie Chart */}
        <div className="col-span-4">
          <SCMDCard className="p-8 h-full flex flex-col items-center justify-center bg-scmd-slate/30 border-slate-800">
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#EF4444"
                  strokeWidth="20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="20"
                  strokeDasharray={`${trustScore.averageScore * 2.51327} 251.327`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{trustScore.averageScore}%</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tin cậy</span>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className={cn(
                "text-lg font-black uppercase tracking-widest mb-2",
                trustScore.status === 'EXCELLENT' ? "text-scmd-safety" : "text-scmd-alert"
              )}>
                {trustScore.status === 'EXCELLENT' ? 'TỐT' : 'CẢNH BÁO'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dựa trên phân tích <strong>Anti-cheat Engine</strong> về tọa độ, tốc độ di chuyển và tính toàn vẹn thiết bị.
              </p>
            </div>
          </SCMDCard>
        </div>

        {/* Trust Score Trend Chart */}
        <div className="col-span-8">
          <SCMDCard className="p-8 h-full bg-scmd-slate/30 border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-scmd-cyber/20 flex items-center justify-center text-scmd-cyber">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Xu hướng tin cậy (7 ngày)</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-scmd-cyber" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chỉ số Trust</span>
                </div>
              </div>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trustScore.trend || []}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FFF2" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00FFF2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold"
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      border: '1px solid #1E293B',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    itemStyle={{ color: '#00FFF2' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00FFF2" 
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
          <SCMDCard className="p-6 bg-scmd-alert/5 border-scmd-alert/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-scmd-alert uppercase tracking-widest mb-1">Cảnh báo nghiêm trọng</p>
                <p className="text-3xl font-black text-white">{anomalyStats?.criticalCount || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-scmd-alert/20 flex items-center justify-center text-scmd-alert">
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
          <div className="bg-scmd-slate/30 rounded-[32px] border border-slate-800/50 p-8 h-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-scmd-alert/20 flex items-center justify-center text-scmd-alert">
                <Eye size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Danh sách bất thường thời gian thực</h3>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
              {anomalies.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <ShieldCheck size={48} className="mx-auto text-scmd-safety/20 mb-4" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Không phát hiện bất thường</p>
                </div>
              ) : (
                anomalies.map((anomaly) => (
                  <motion.div
                    key={anomaly.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-5 rounded-2xl border flex items-start gap-5 transition-all hover:translate-x-1",
                      anomaly.severity === 'CRITICAL' 
                        ? "bg-scmd-alert/5 border-scmd-alert/20" 
                        : "bg-amber-500/5 border-amber-500/20"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      anomaly.severity === 'CRITICAL' ? "bg-scmd-alert/20 text-scmd-alert" : "bg-amber-500/20 text-amber-500"
                    )}>
                      <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-slate-200 uppercase tracking-tight">{anomaly.title}</h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(anomaly.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{anomaly.description}</p>
                      <div className="flex gap-4 mt-4">
                        <button className="text-[10px] font-black uppercase tracking-widest text-scmd-cyber hover:underline">Xem vị trí</button>
                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Bỏ qua</button>
                      </div>
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
        <SCMDCard className="p-8 bg-scmd-slate/30 border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-scmd-cyber/20 flex items-center justify-center text-scmd-cyber">
              <Map size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Bản đồ nhiệt sự cố (Heatmap)</h3>
          </div>
          <div className="aspect-video bg-scmd-navy/50 rounded-2xl border border-slate-800 flex items-center justify-center">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Đang tải dữ liệu không gian...</p>
          </div>
        </SCMDCard>

        <SCMDCard className="p-8 bg-scmd-slate/30 border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-scmd-safety/20 flex items-center justify-center text-scmd-safety">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Nhật ký an ninh bất biến</h3>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-scmd-safety" />
                  <span className="text-[10px] font-bold text-slate-300">PATROL_VERIFIED_{i}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">SHA256: 8f3a...</span>
              </div>
            ))}
          </div>
        </SCMDCard>
      </div>
    </div>
  );
};
