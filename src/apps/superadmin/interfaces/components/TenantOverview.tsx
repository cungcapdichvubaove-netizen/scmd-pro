import React from 'react';
import { 
  TrendingUp, 
  Bell, 
  Zap, 
  Target, 
  Server, 
  Database, 
  Activity, 
  DollarSign, 
  ArrowUpRight,
  Building2 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../../lib/utils';

interface TenantOverviewProps {
  stats: any;
  setContactLead: (lead: any) => void;
}

export const TenantOverview: React.FC<TenantOverviewProps> = ({ stats, setContactLead }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Growth Chart */}
          <div className="bg-[#151b2d] border border-white/[0.05] rounded-[32px] p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-2 text-scmd-cyber mb-1">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4285F4]">{t('dashboard.growth_velocity')}</span>
                </div>
                <h3 className="text-2xl font-black text-white">{t('dashboard.growth_velocity')}</h3>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                  <p className="text-3xl font-black text-white">+{stats?.growthVelocity?.daily ?? 0}</p>
                  <p className="text-[10px] font-bold text-[#CCD6F6] uppercase tracking-widest">Hàng ngày</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">+{stats?.growthVelocity?.weekly ?? 0}</p>
                  <p className="text-[10px] font-bold text-[#CCD6F6] uppercase tracking-widest">Hàng tuần</p>
                </div>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.growthVelocity?.chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                    dy={10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 700 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--color-primary)" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#151b2d] border border-white/[0.05] rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#2563EB]/10 rounded-xl flex items-center justify-center">
                <Bell className="text-[#4285F4]" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{t('dashboard.smart_notifications')}</h3>
                <p className="text-xs text-[#CCD6F6] font-medium">Hệ thống tự động nhận diện Lead tiềm năng.</p>
              </div>
            </div>
            <div className="space-y-4">
              {stats?.smartNotifications?.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                  <p className="text-[#CCD6F6] text-sm font-medium">Chưa có thông báo mới.</p>
                </div>
              ) : stats?.smartNotifications?.map((notif: any) => (
                <div key={notif.id} className={cn(
                  "p-4 rounded-2xl border flex items-start gap-4 transition-all hover:scale-[1.01]",
                  notif.priority === 'high' ? "bg-scmd-cyber/5 border-scmd-cyber/20" : "bg-white/5 border-white/10"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    notif.type === 'conversion_ready' ? "bg-scmd-safety/20 text-scmd-safety" : "bg-amber-500/20 text-amber-400"
                  )}>
                    {notif.type === 'conversion_ready' ? <Zap size={18} /> : <Target size={18} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-black text-white">{notif.tenantName}</p>
                      <span className="text-[10px] font-bold text-[#CCD6F6]/80 uppercase">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-[#CCD6F6] leading-relaxed mb-3">{notif.message}</p>
                    <button 
                      onClick={() => setContactLead(notif)}
                      className="px-4 py-2 bg-scmd-cyber text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4285F4] transition-all"
                    >
                      {t('common.contact_now')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-8">
          <div className="bg-[#151b2d] border border-white/[0.05] rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
            <div className="flex items-center gap-2 text-scmd-safety mb-4">
              <Server size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">System Architecture</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-[#4285F4]" />
                  <span className="text-xs font-bold text-slate-300">Redis Cache</span>
                </div>
                <span className="text-[10px] font-black text-scmd-safety uppercase">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-[#4285F4]" />
                  <span className="text-xs font-bold text-slate-300">BullMQ Workers</span>
                </div>
                <span className="text-[10px] font-black text-scmd-safety uppercase">Running</span>
              </div>
            </div>
          </div>

          <div className="bg-[#151b2d] border border-white/[0.05] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <DollarSign size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('dashboard.revenue_stream')}</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-4xl font-black text-white">${stats?.revenueStream?.totalRevenue?.toLocaleString() ?? 0}</p>
                <p className="text-xs font-bold text-[#CCD6F6] uppercase tracking-widest mt-1">Tổng doanh thu</p>
              </div>
              <div className="flex items-center gap-1 text-[#10B981] text-xs font-black">
                <ArrowUpRight size={14} />
                {stats?.revenueStream?.growth}% Tăng trưởng
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Whale Alerts Table */}
      <div className="bg-[#151b2d] border border-white/[0.05] rounded-[32px] p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
              <Target className="text-indigo-400" size={28} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white">{t('dashboard.whale_alerts')}</h3>
              <p className="text-[#CCD6F6] font-medium">Top {t('entities.tenants')} tiềm năng cao dựa trên quy mô nhân sự & mục tiêu.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[#CCD6F6]/80 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                <th className="pb-6 font-black">{t('entities.tenant')}</th>
                <th className="pb-6 font-black">Quy mô ({t('entities.staff')}/{t('entities.checkpoints')})</th>
                <th className="pb-6 font-black">Gói hiện tại</th>
                <th className="pb-6 font-black">Giá trị chiến lược</th>
                <th className="pb-6 font-black text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats?.whaleAlerts?.map((whale: any) => (
                <tr key={whale.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A2133] rounded-xl flex items-center justify-center text-[#CCD6F6] group-hover:scale-110 transition-transform">
                        <Building2 size={20} />
                      </div>
                      <span className="font-black text-white">{whale.name}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-white">{whale.staffCount} nv</span>
                      <span className="text-[10px] font-bold text-[#CCD6F6] uppercase">{whale.checkpointCount} điểm</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {whale.plan}
                    </span>
                  </td>
                  <td className="py-6">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{whale.potentialValue} POTENTIAL</span>
                  </td>
                  <td className="py-6 text-right">
                    <button 
                      onClick={() => setContactLead(whale)}
                      className="px-6 py-2 bg-scmd-cyber text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4285F4] transition-all"
                    >
                      {t('common.contact_now')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
