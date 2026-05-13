import React from 'react';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  DollarSign,
  ArrowUpRight,
  Target,
  Globe,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';

const data = [
  { month: 'Jan', tenants: 12, revenue: 45000 },
  { month: 'Feb', tenants: 15, revenue: 52000 },
  { month: 'Mar', tenants: 18, revenue: 61000 },
  { month: 'Apr', tenants: 24, revenue: 85000 },
  { month: 'May', tenants: 32, revenue: 110000 },
];

const sectorData = [
  { name: 'Industrial', value: 40, color: '#2563EB' },
  { name: 'Retail', value: 30, color: '#10B981' },
  { name: 'Residential', value: 20, color: '#F59E0B' },
  { name: 'Office', value: 10, color: '#EF4444' },
];

export const MarketGrowthTab: React.FC = () => {
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-scmd-primary/10 rounded-xl text-scmd-primary">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Market Growth</h1>
            <p className="text-scmd-silver/60 text-sm">Phân tích xu hướng và quy mô mở rộng thị trường của hệ thống SCMD Pro.</p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SCMDCard glass className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Tổng Tenants</p>
              <h3 className="text-3xl font-black text-white">42</h3>
            </div>
            <div className="p-2 bg-scmd-primary/20 rounded-lg text-scmd-primary">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-scmd-safety text-xs font-bold">
            <ArrowUpRight size={14} />
            <span>+12% vs tháng trước</span>
          </div>
        </SCMDCard>

        <SCMDCard glass className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Độ phủ Site</p>
              <h3 className="text-3xl font-black text-white">128</h3>
            </div>
            <div className="p-2 bg-scmd-safety/20 rounded-lg text-scmd-safety">
              <MapPin size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-scmd-safety text-xs font-bold">
            <ArrowUpRight size={14} />
            <span>Mới: VSIP 2, Landmark 81</span>
          </div>
        </SCMDCard>

        <SCMDCard glass className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Ước tính MRR</p>
              <h3 className="text-3xl font-black text-white">$12.4k</h3>
            </div>
            <div className="p-2 bg-scmd-cyber/20 rounded-lg text-scmd-cyber">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-scmd-safety text-xs font-bold">
            <ArrowUpRight size={14} />
            <span>+8.4% growth rate</span>
          </div>
        </SCMDCard>

        <SCMDCard glass className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Tỉ lệ Retention</p>
              <h3 className="text-3xl font-black text-white">98.2%</h3>
            </div>
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Globe size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-scmd-safety text-xs font-bold">
            <ArrowUpRight size={14} />
            <span>Health score: Excellent</span>
          </div>
        </SCMDCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <SCMDCard glass className="lg:col-span-2 p-8 overflow-hidden h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">Growth Velocity</h3>
              <p className="text-xs text-scmd-silver/40">Tốc độ tăng trưởng khách hàng và doanh thu theo tháng.</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0D1324', 
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tenants" 
                  stroke="#2563EB" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTenants)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SCMDCard>

        {/* Sector Analytics */}
        <SCMDCard glass className="p-8 h-[400px]">
          <div className="space-y-1 mb-8">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Sector Distribution</h3>
            <p className="text-xs text-scmd-silver/40">Phân bổ khách hàng theo lĩnh vực kinh doanh.</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#8892B0" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0D1324', border: '1px solid #1E293B' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-3">
            {sectorData.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] font-bold text-scmd-silver/60 uppercase tracking-widest">{s.name}</span>
                </div>
                <span className="text-xs font-black text-white">{s.value}%</span>
              </div>
            ))}
          </div>
        </SCMDCard>
      </div>

      {/* Strategic Initiatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SCMDCard glass className="p-8 border-l-4 border-scmd-cyber">
          <div className="flex gap-4">
            <div className="p-3 bg-scmd-cyber/10 rounded-2xl text-scmd-cyber shrink-0">
              <Target size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-white uppercase text-sm tracking-widest">Q3 Strategy: Industrial Expansion</h4>
              <p className="text-xs text-scmd-silver/60 leading-relaxed">
                Tập trung mở rộng dịch vụ tại các khu công nghiệp VSIP và SHTP. 
                Mục tiêu ký kết thêm 5 nhà thầu an ninh chiến lược trong tháng 7.
              </p>
            </div>
          </div>
        </SCMDCard>

        <SCMDCard glass className="p-8 border-l-4 border-scmd-safety">
          <div className="flex gap-4">
            <div className="p-3 bg-scmd-safety/10 rounded-2xl text-scmd-safety shrink-0">
              <Zap size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="font-black text-white uppercase text-sm tracking-widest">Feature Focus: Predictive Analytics</h4>
              <p className="text-xs text-scmd-silver/60 leading-relaxed">
                Nâng cấp bộ AI Watcher tích hợp trực tiếp vào báo cáo SLA để tăng tỉ lệ up-sell gói PRO thêm 15%.
              </p>
            </div>
          </div>
        </SCMDCard>
      </div>
    </div>
  );
};
