import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  BarChart3,
  Activity, 
  AlertCircle, 
  Zap, 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../../lib/utils';
import { apiFetch } from '../../../../lib/api';

interface SLOMetrics {
  healthStatus: Array<{
    tenantId: string;
    errorCount: number;
    status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  }>;
  sloMetrics: Array<{
    key: string;
    avg: number;
    count: number;
    max: number;
  }>;
  systemHealth: {
    memoryHeapUsedMB: number;
    memoryRSSMB: number;
  };
  timestamp: string;
}

export const SLOMonitorTab: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<SLOMetrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        apiFetch('/api/v1/sys-manage/slo/metrics'),
        apiFetch('/api/v1/sys-manage/slo/alerts')
      ]);

      setData(metricsRes);
      setAlerts(alertsRes);
    } catch (error) {
      console.error('Failed to fetch SLO metrics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('common.loading')}</p>
      </div>
    );
  }

  const aiLatency = data?.sloMetrics.find(m => m.key.includes('ai_analysis_duration'))?.avg || 0;
  const sosLatency = data?.sloMetrics.find(m => m.key.includes('sos_zalo_dispatch_duration'))?.avg || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={60} className="text-sky-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('monitoring.ai_latency')}</p>
          <div className="flex items-baseline gap-2">
            <h3 className={cn("text-3xl font-black tracking-tight", aiLatency > 5000 ? "text-amber-400" : "text-white")}>
              {aiLatency.toFixed(0)}<span className="text-sm ml-1 opacity-50">ms</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-600">Threshold: 5s</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", aiLatency > 5000 ? "bg-amber-500" : "bg-sky-500")}
                style={{ width: `${Math.min((aiLatency / 5000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert size={60} className="text-red-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('monitoring.sos_dispatch')}</p>
          <div className="flex items-baseline gap-2">
            <h3 className={cn("text-3xl font-black tracking-tight", sosLatency > 3000 ? "text-red-400" : "text-white")}>
              {sosLatency.toFixed(0)}<span className="text-sm ml-1 opacity-50">ms</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-600">Threshold: 3s</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", sosLatency > 3000 ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${Math.min((sosLatency / 3000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={60} className="text-amber-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('monitoring.critical_tenants')}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {data?.healthStatus.filter(s => s.status !== 'HEALTHY').length || 0}
            </h3>
            <span className="text-[10px] font-bold text-slate-600">Active Warnings</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu size={60} className="text-purple-400" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('monitoring.memory_usage')}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {data?.systemHealth.memoryHeapUsedMB || 0}<span className="text-sm ml-1 opacity-50">MB</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-600">Peak: {data?.systemHealth.memoryRSSMB}MB</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden relative">
             <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-scmd-cyber" size={24} />
                  <h3 className="text-xl font-black text-white">{t('monitoring.slo_title')}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('monitoring.realtime_feedback')}</span>
                </div>
             </div>

             <div className="space-y-4">
                {data?.healthStatus && data.healthStatus.length > 0 ? (
                  data.healthStatus.map((tenant) => (
                    <div key={tenant.tenantId} className="bg-black/20 border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          tenant.status === 'CRITICAL' ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          tenant.status === 'WARNING' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        )}>
                          {tenant.status === 'CRITICAL' ? <AlertTriangle size={24} /> : 
                           tenant.status === 'WARNING' ? <Clock size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div>
                          <p className="text-white font-black">{tenant.tenantId}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                            Status: {tenant.status} | {tenant.errorCount} Errors (24h)
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-white/5 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Trace Logs
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-600 bg-white/2 rounded-2xl border border-dashed border-white/5">
                    <Activity size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t('monitoring.no_deviations')}</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 h-full flex flex-col">
             <div className="flex items-center gap-3 mb-8">
                <ShieldAlert className="text-amber-400" size={24} />
                <h3 className="text-xl font-black text-white">{t('monitoring.proactive_alerts')}</h3>
             </div>

             <div className="flex-1 space-y-4 overflow-y-auto pr-2 no-scrollbar">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <motion.div 
                      key={alert.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 bg-scmd-navy/50 border-l-4 border-amber-500 rounded-r-2xl space-y-2"
                    >
                       <div className="flex justify-between items-start">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">{alert.action}</p>
                          <span className="text-[9px] text-slate-600 font-bold">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-slate-200 text-xs font-medium leading-relaxed">
                          {alert.status === 'ERROR' ? `Spike detected: ${alert.resource}` : alert.payload?.message || alert.resource}
                       </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-30">
                    <CheckCircle2 size={40} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">
                      System running within<br/>nominal parameters
                    </p>
                  </div>
                )}
             </div>

             <button 
               onClick={fetchData} 
               className="mt-6 w-full py-4 bg-scmd-cyber/10 hover:bg-scmd-cyber/20 text-scmd-cyber rounded-2xl text-[10px] font-black uppercase tracking-widest border border-scmd-cyber/20 transition-all flex items-center justify-center gap-2"
              >
               <TrendingUp size={14} />
               {t('monitoring.verify_sli')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
