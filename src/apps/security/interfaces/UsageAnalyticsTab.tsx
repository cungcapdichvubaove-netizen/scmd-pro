import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Fingerprint
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';

const usageData = [
  { hour: '00:00', patrols: 45, incidents: 2 },
  { hour: '04:00', patrols: 30, incidents: 1 },
  { hour: '08:00', patrols: 85, incidents: 5 },
  { hour: '12:00', patrols: 120, incidents: 3 },
  { hour: '16:00', patrols: 110, incidents: 4 },
  { hour: '20:00', patrols: 95, incidents: 8 },
  { hour: '23:59', patrols: 60, incidents: 3 },
];

const featureUsage = [
  { name: 'QR Scan', value: 65, color: '#2563EB' },
  { name: 'SOS Alert', value: 5, color: '#EF4444' },
  { name: 'Incident Report', value: 15, color: '#F59E0B' },
  { name: 'Audit', value: 15, color: '#10B981' },
];

export const UsageAnalyticsTab: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-scmd-cyber/10 rounded-xl text-scmd-cyber">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Usage Analytics</h1>
            <p className="text-scmd-silver/60 text-sm">Giám sát hoạt động vận hành thời gian thực và hiệu suất sử dụng tính năng hệ thống.</p>
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SCMDCard glass className="p-6 relative overflow-hidden border-scmd-safety/30 bg-scmd-safety/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-scmd-safety/20 rounded-2xl text-scmd-safety animate-pulse">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Active Patrols</p>
              <h3 className="text-3xl font-black text-white">48</h3>
            </div>
          </div>
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-1/3 h-full bg-scmd-safety shadow-[0_0_10px_#10B981]"
            />
          </div>
        </SCMDCard>

        <SCMDCard glass className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-scmd-primary/20 rounded-2xl text-scmd-primary">
              <Fingerprint size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Total Scans (24h)</p>
              <h3 className="text-3xl font-black text-white">2,410</h3>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-scmd-silver/40">Avg 100 scans per site</p>
        </SCMDCard>

        <SCMDCard glass className="p-6 border-scmd-danger/30 bg-scmd-danger/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-scmd-danger/20 rounded-2xl text-scmd-danger">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Response Latency</p>
              <h3 className="text-3xl font-black text-white">4.2<span className="text-sm font-bold ml-1">min</span></h3>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-scmd-danger/60">Target SLA: 5.0 min</p>
        </SCMDCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Activity Heatmap */}
        <SCMDCard glass className="xl:col-span-2 p-8 h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic-none text-none">Activity Pulse</h3>
              <p className="text-xs text-scmd-silver/40">Mật độ tuần tra và sự cố theo khung giờ trong ngày.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-scmd-silver/40 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-scmd-primary" /> <span>Patrols</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-scmd-danger" /> <span>Incidents</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="hour" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0D1324', border: '1px solid #1E293B' }} />
                <Line type="monotone" dataKey="patrols" stroke="#2563EB" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="incidents" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCMDCard>

        {/* Feature Sticky Rate */}
        <SCMDCard glass className="p-8 h-[450px] flex flex-col">
          <div className="space-y-1 mb-8">
            <h3 className="text-lg font-black text-white uppercase tracking-tight italic-none text-none">Feature Sticky Rate</h3>
            <p className="text-xs text-scmd-silver/40">Tỉ lệ sử dụng các nhóm tính năng chính tải App.</p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-56 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {featureUsage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {featureUsage.map((f) => (
              <div key={f.name} className="flex flex-col gap-1 p-3 bg-white/2 outline outline-1 outline-white/5 rounded-xl">
                <span className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest">{f.name}</span>
                <span className="text-sm font-black text-white">{f.value}%</span>
              </div>
            ))}
          </div>
        </SCMDCard>
      </div>

      {/* Operational Efficiency */}
      <SCMDCard glass className="p-8">
        <h3 className="text-lg font-black text-white uppercase tracking-tight italic-none text-none mb-6">Efficiency Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Check-in Accuracy', value: '99.2%', trend: '+0.5%', icon: <CheckCircle2 className="text-scmd-safety" /> },
            { label: 'Evidence Quality', value: '85.5%', trend: '+2.1%', icon: <Zap className="text-scmd-cyber" /> },
            { label: 'Sync Latency', value: '1.2s', trend: '-0.3s', icon: <Activity className="text-scmd-primary" /> },
            { label: 'Battery Optimization', value: 'High', trend: 'Stable', icon: <Clock className="text-purple-400" /> },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl">{item.icon}</div>
              <div>
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">{item.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">{item.value}</span>
                  <span className="text-[10px] font-bold text-scmd-safety">{item.trend}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SCMDCard>

    </div>
  );
};
