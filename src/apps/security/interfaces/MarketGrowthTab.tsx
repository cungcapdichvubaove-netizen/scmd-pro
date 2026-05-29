import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Building2, RefreshCcw, TrendingUp } from 'lucide-react';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { apiFetch } from '../../../lib/api';

type GrowthSnapshot = {
  tenants?: number;
  sites?: number;
  mrr?: number;
  retentionRate?: number;
  trends?: Array<{ label: string; tenants?: number; revenue?: number }>;
  sectors?: Array<{ name: string; value: number }>;
};

const formatMoney = (value?: number) => {
  if (typeof value !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
};

export const MarketGrowthTab: React.FC = () => {
  const [data, setData] = useState<GrowthSnapshot>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<GrowthSnapshot>('/api/superadmin/market-growth');
      setData(result ?? {});
    } catch (err) {
      setData({});
      setError(err instanceof Error ? err.message : 'Chưa kết nối được API market-growth.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const hasTrendData = useMemo(() => Array.isArray(data.trends) && data.trends.length > 0, [data.trends]);
  const hasSectorData = useMemo(() => Array.isArray(data.sectors) && data.sectors.length > 0, [data.sectors]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-scmd-primary/10 rounded-xl text-scmd-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Market Growth</h1>
            <p className="text-scmd-silver/60 text-sm">Phân tích tăng trưởng thị trường từ dữ liệu tenant, site và doanh thu thật.</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-scmd-silver hover:bg-white/[0.05]">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : undefined} /> Làm mới
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm font-semibold text-amber-100">
          {error} Màn hình giữ nguyên cấu trúc vận hành nhưng không hiển thị số demo.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tổng tenant', value: String(data.tenants ?? 0), icon: <Building2 size={20} /> },
          { label: 'Site đang quản lý', value: String(data.sites ?? 0), icon: <Activity size={20} /> },
          { label: 'MRR ghi nhận', value: formatMoney(data.mrr), icon: <BarChart3 size={20} /> },
          { label: 'Retention', value: typeof data.retentionRate === 'number' ? `${data.retentionRate}%` : '0%', icon: <TrendingUp size={20} /> },
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
        <SCMDCard glass className="lg:col-span-2 p-8 overflow-hidden min-h-[320px]">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Growth Velocity</h3>
          <p className="mt-1 text-xs text-scmd-silver/40">Xu hướng tenant/doanh thu theo kỳ từ API.</p>
          {hasTrendData ? (
            <div className="mt-6 space-y-3">
              {data.trends!.map((item) => (
                <div key={item.label} className="grid grid-cols-[120px_1fr_120px] items-center gap-3 text-xs">
                  <span className="font-bold text-scmd-silver/60">{item.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-scmd-primary" style={{ width: `${Math.min(100, Number(item.tenants ?? 0))}%` }} /></div>
                  <span className="text-right font-black text-white">{item.tenants ?? 0} tenant</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-scmd-silver/55">
              Chưa có dữ liệu trend thật từ API. Không hiển thị dữ liệu demo.
            </div>
          )}
        </SCMDCard>

        <SCMDCard glass className="p-8 min-h-[320px]">
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Sector Distribution</h3>
          <p className="mt-1 text-xs text-scmd-silver/40">Phân bổ tenant theo lĩnh vực.</p>
          {hasSectorData ? (
            <div className="mt-6 space-y-3">
              {data.sectors!.map((sector) => (
                <div key={sector.name} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-scmd-silver/60">{sector.name}</span>
                  <span className="text-sm font-black text-white">{sector.value}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-scmd-silver/55">
              Chưa có dữ liệu phân bổ lĩnh vực thật từ API.
            </div>
          )}
        </SCMDCard>
      </div>
    </div>
  );
};
