import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCcw, Zap } from 'lucide-react';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { apiFetch } from '../../../lib/api';

type UsageSnapshot = {
  activeUsers?: number;
  patrols?: number;
  incidents?: number;
  evidenceUploads?: number;
  performance?: {
    attendanceAccuracy?: number;
    evidenceQuality?: number;
    syncLatencyMs?: number;
    batteryOptimization?: number;
  };
  featureUsage?: Array<{ name: string; value: number }>;
  hourly?: Array<{ hour: string; patrols?: number; incidents?: number }>;
};

export const UsageAnalyticsTab: React.FC = () => {
  const [data, setData] = useState<UsageSnapshot>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<UsageSnapshot>('/api/tenant/usage-analytics');
      setData(result ?? {});
    } catch (err) {
      setData({});
      setError(err instanceof Error ? err.message : 'Chưa kết nối được API usage-analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const hasHourly = useMemo(() => Array.isArray(data.hourly) && data.hourly.length > 0, [data.hourly]);
  const hasFeatureUsage = useMemo(() => Array.isArray(data.featureUsage) && data.featureUsage.length > 0, [data.featureUsage]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-scmd-primary/10 rounded-xl text-scmd-primary"><Activity size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Usage Analytics</h1>
            <p className="text-scmd-silver/60 text-sm">Theo dõi mức độ sử dụng thật của tenant, ca trực, tuần tra, sự cố và bằng chứng.</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-scmd-silver hover:bg-white/[0.05]">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : undefined} /> Làm mới
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm font-semibold text-amber-100">
          {error} Màn hình không dùng số demo; khi API có dữ liệu sẽ tự hiển thị.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Người dùng hoạt động', value: String(data.activeUsers ?? 0), icon: <Activity size={20} /> },
          { label: 'Lượt tuần tra', value: String(data.patrols ?? 0), icon: <Zap size={20} /> },
          { label: 'Sự cố ghi nhận', value: String(data.incidents ?? 0), icon: <AlertTriangle size={20} /> },
          { label: 'Bằng chứng tải lên', value: String(data.evidenceUploads ?? 0), icon: <CheckCircle2 size={20} /> },
        ].map((item) => (
          <SCMDCard key={item.label} glass className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">{item.label}</p>
                <h3 className="text-3xl font-black text-white">{item.value}</h3>
              </div>
              <div className="p-2 bg-scmd-primary/15 rounded-lg text-scmd-primary">{item.icon}</div>
            </div>
          </SCMDCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SCMDCard glass className="lg:col-span-2 p-8 min-h-[320px]">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Hoạt động theo giờ</h3>
          <p className="mt-1 text-xs text-scmd-silver/40">Tuần tra và sự cố phát sinh theo khung giờ.</p>
          {hasHourly ? (
            <div className="mt-6 space-y-3">
              {data.hourly!.map((item) => (
                <div key={item.hour} className="grid grid-cols-[80px_1fr_90px] items-center gap-3 text-xs">
                  <span className="font-bold text-scmd-silver/60">{item.hour}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-scmd-primary" style={{ width: `${Math.min(100, Number(item.patrols ?? 0))}%` }} /></div>
                  <span className="text-right font-black text-white">{item.patrols ?? 0}</span>
                </div>
              ))}
            </div>
          ) : <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-scmd-silver/55">Chưa có dữ liệu hoạt động thật từ API.</div>}
        </SCMDCard>

        <SCMDCard glass className="p-8 min-h-[320px]">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Feature Usage</h3>
          <p className="mt-1 text-xs text-scmd-silver/40">Mức độ sử dụng tính năng.</p>
          {hasFeatureUsage ? (
            <div className="mt-6 space-y-3">
              {data.featureUsage!.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-scmd-silver/60">{feature.name}</span>
                  <span className="text-sm font-black text-white">{feature.value}</span>
                </div>
              ))}
            </div>
          ) : <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-scmd-silver/55">Chưa có dữ liệu sử dụng tính năng thật.</div>}
        </SCMDCard>
      </div>

      <SCMDCard glass className="p-8">
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6">Chỉ số hiệu suất chuẩn</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Độ chính xác chấm công', value: `${data.performance?.attendanceAccuracy ?? 0}%`, icon: <CheckCircle2 className="text-scmd-safety" /> },
            { label: 'Chất lượng bằng chứng', value: `${data.performance?.evidenceQuality ?? 0}%`, icon: <Zap className="text-scmd-cyber" /> },
            { label: 'Độ trễ đồng bộ', value: `${data.performance?.syncLatencyMs ?? 0}ms`, icon: <Activity className="text-scmd-primary" /> },
            { label: 'Tối ưu pin', value: `${data.performance?.batteryOptimization ?? 0}%`, icon: <Clock className="text-purple-400" /> },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl">{item.icon}</div>
              <div>
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">{item.label}</p>
                <span className="text-xl font-black text-white">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </SCMDCard>
    </div>
  );
};
