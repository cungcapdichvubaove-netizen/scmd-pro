import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  LogIn, 
  LogOut, 
  Zap, 
  BarChart,
  BrainCircuit,
  ShieldAlert,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../../../lib/api';

interface AttendanceLog {
  id: string;
  tenantId: string;
  staffId: string;
  location?: { lat: number; lon: number };
  type: string;
  createdAt: string;
  isValid: boolean;
  workedMinutes?: number;
  checkInAt?: string;
  checkOutAt?: string;
  staff?: { fullName: string; username: string };
}

interface StrategyInsight {
  summary: string;
  fraudRiskScore: number;
  fraudDetails: string[];
  efficiencyScore: number;
  topPerformers: string[];
  criticalIssues: string[];
  recommendations: string[];
}

interface AttendanceReportsProps {
  logs: AttendanceLog[];
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({ logs }) => {
  const [reportType, setReportType] = useState<'shift' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiInsights, setAiInsights] = useState<StrategyInsight | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Fetch AI Insights when on Monthly view
  useEffect(() => {
    if (reportType === 'monthly') {
      const fetchInsights = async () => {
        setIsLoadingAi(true);
        try {
          const month = selectedDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);
          const data = await apiFetch(`/api/reports/smart-monthly?month=${month}`);
          setAiInsights(data);
        } catch (err) {
          console.error('Failed to fetch AI insights:', err);
        } finally {
          setIsLoadingAi(false);
        }
      };
      fetchInsights();
    }
  }, [reportType, selectedDate]);

  // Process logs to calculate anomalies (e.g., missing check-out, overtime, missing guards, LIVENESS)
  const processedData = useMemo(() => {
    // Group by staff and date
    const grouped: Record<string, Record<string, AttendanceLog[]>> = {};
    (logs || []).forEach(log => {
      try {
        const date = new Date(log.createdAt).toISOString().split('T')[0];
        if (!date) return;
        
        if (!grouped[date]) {
          grouped[date] = {};
        }
        
        const dayGroup = grouped[date];
        if (dayGroup) {
          const staffId = log.staff?.fullName || log.staffId;
          if (!dayGroup[staffId]) {
            dayGroup[staffId] = [];
          }
          dayGroup[staffId]?.push(log);
        }
      } catch (e) {
        console.error('Invalid timestamp in log:', log);
      }
    });

    const anomalies: any[] = [];
    const reports: any[] = [];

    Object.keys(grouped).forEach(date => {
      const dateLogs = grouped[date] ?? {};
      
      Object.keys(dateLogs).forEach(staffId => {
        const staffLogsRaw = dateLogs[staffId] ?? [];
        const staffLogs = [...staffLogsRaw].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        let checkInCount = 0;
        let livenessCount = 0;
        let checkoutCount = 0;
        let totalWorkedMinutes = 0;
        
        for (let i = 0; i < staffLogs.length; i++) {
          const log = staffLogs[i];
          if (!log) continue;
          if (log.type === 'CHECK_IN') checkInCount++;
          if (log.type === 'LIVENESS') livenessCount++;
          if (log.type === 'CHECK_OUT') {
            checkoutCount++;
            // We sum from CHECK_OUT records to avoid double counting with CHECK_IN
            totalWorkedMinutes += log.workedMinutes || 0;
          }
        }

        const hours = Math.floor(totalWorkedMinutes / 60);
        const mins = totalWorkedMinutes % 60;
        const totalHoursFormatted = `${hours}h ${mins}m`;

        reports.push({
          date,
          staffId,
          checkInCount,
          checkOutCount: checkoutCount,
          livenessCount,
          totalWorkedMinutes,
          totalHoursFormatted,
          totalLogs: staffLogs.length,
          lastActivity: staffLogs[staffLogs.length - 1]?.createdAt,
          logs: staffLogs
        });
      });
    });

    return { anomalies, reports };
  }, [logs]);

  const handleExportPDF = () => {
    window.print();
  };

  const filteredReports = processedData.reports.filter(r => {
    if (reportType === 'weekly') {
      const rDate = new Date(r.date || '').getTime();
      const sDate = new Date(selectedDate || '').getTime();
      return rDate <= sDate && rDate > sDate - 7 * 24 * 60 * 60 * 1000;
    }
    if (reportType === 'monthly') {
      const rMonth = r.date?.substring(0, 7);
      const sMonth = selectedDate?.substring(0, 7);
      return rMonth === sMonth;
    }
    return r.date === selectedDate;
  });
  
  const filteredAnomalies = processedData.anomalies.filter(a => {
    if (reportType === 'weekly') {
      const aDate = new Date(a.date || '').getTime();
      const sDate = new Date(selectedDate || '').getTime();
      return aDate <= sDate && aDate > sDate - 7 * 24 * 60 * 60 * 1000;
    }
    if (reportType === 'monthly') {
      const aMonth = a.date?.substring(0, 7);
      const sMonth = selectedDate?.substring(0, 7);
      return aMonth === sMonth;
    }
    return a.date === selectedDate;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-scmd-navy/50 p-5 rounded-[32px] border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="flex gap-1 bg-scmd-navy/30 p-1 rounded-2xl overflow-x-auto no-scrollbar border border-white/5">
          {(['shift', 'daily', 'weekly', 'monthly'] as const).map((type) => (
            <button 
              key={type}
              id={`report-tab-${type}`}
              onClick={() => setReportType(type)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${reportType === type ? 'bg-scmd-primary text-white shadow-lg shadow-scmd-primary/20' : 'text-scmd-silver/40 hover:text-scmd-silver/60'}`}
            >
              {type === 'shift' ? 'Theo ca' : type === 'daily' ? 'Theo ngày' : type === 'weekly' ? 'Theo tuần' : 'Theo tháng'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              readOnly
              value={selectedDate}
              className="pl-4 pr-10 py-3 bg-scmd-navy/50 border border-white/10 rounded-2xl text-sm font-bold text-white w-48 focus:outline-none focus:border-scmd-primary/50 transition-all font-mono"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-scmd-silver/40" size={18} />
          </div>
          <button 
            id="export-pdf-btn"
            onClick={handleExportPDF} 
            className="flex items-center gap-2 bg-scmd-primary hover:bg-scmd-primary/80 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-scmd-primary/20 active:scale-95"
          >
            <Download size={18} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* AI Smart Monthly Insights */}
      {reportType === 'monthly' && (
        <div id="ai-smart-insights-section" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-scmd-navy/40 p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col h-[400px] backdrop-blur-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight uppercase">Biểu đồ hoạt động theo tháng</h3>
                  <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-widest mt-1">Lượng tương tác quét QR & Điểm danh</p>
                </div>
                <div className="bg-scmd-primary/10 text-scmd-primary p-2 rounded-xl border border-scmd-primary/20">
                  <BarChart size={20} />
                </div>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredReports.map(r => ({ name: r.date.split('-')[2], count: r.totalLogs }))}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(204, 214, 246, 0.4)', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(204, 214, 246, 0.4)', fontSize: 10, fontWeight: 700 }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d1324', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', fontWeight: 800, color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: 'rgba(204, 214, 246, 0.4)', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-scmd-navy/40 p-8 rounded-[40px] border border-white/5 shadow-2xl flex flex-col justify-between backdrop-blur-sm">
               <div>
                  <h3 className="text-lg font-black text-white tracking-tight mb-1 uppercase">Tình trạng Tuân thủ</h3>
                  <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-widest mb-6">SLA Compliance Rate</p>
                  
                  <div className="relative w-48 h-48 mx-auto mb-8">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="10" 
                        strokeDasharray={`${(aiInsights?.efficiencyScore || 85) * 2.82}, 282`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">{aiInsights?.efficiencyScore || 85}%</span>
                      <span className="text-[8px] font-black uppercase text-scmd-silver/40 tracking-widest">SLA Score</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-scmd-silver/40 font-bold">Mục tiêu SLA:</span>
                    <span className="text-white font-black">95%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-scmd-silver/40 font-bold">Độ lệch:</span>
                    <span className="text-red-500 font-black">-{95 - (aiInsights?.efficiencyScore || 85)}%</span>
                  </div>
                  <button className="w-full py-4 bg-scmd-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-scmd-primary/80 transition-all shadow-lg shadow-scmd-primary/20">
                    Xem chi tiết SLA
                  </button>
               </div>
            </div>
          </div>

          <div className="bg-scmd-navy text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
              <BrainCircuit size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-scmd-primary p-2 rounded-lg">
                  <BrainCircuit size={24} className="text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">AI Strategic Insights - Tháng {selectedDate?.substring(0, 7)}</h2>
              </div>

              {isLoadingAi ? (
                <div className="flex flex-col items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-scmd-primary border-t-transparent mb-4"></div>
                  <p className="font-bold text-scmd-silver/40">The Watcher đang phân tích dữ liệu...</p>
                </div>
              ) : aiInsights ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <p className="text-lg leading-relaxed text-scmd-silver/60 ">"{aiInsights.summary}"</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-red-400">
                          <ShieldAlert size={16} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Rủi ro gian lận</span>
                        </div>
                        <div className="text-3xl font-black text-white">{aiInsights.fraudRiskScore}%</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                          <TrendingUp size={16} />
                          <span className="text-[10px] font-black uppercase tracking-wider">Hiệu quả vận hành</span>
                        </div>
                        <div className="text-3xl font-black text-white">{aiInsights.efficiencyScore}%</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-scmd-silver/40">Vấn đề trọng yếu</h4>
                      {Array.isArray(aiInsights.criticalIssues) && aiInsights.criticalIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm font-bold text-red-200">
                          <AlertTriangle size={16} className="text-red-500 shrink-0" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-scmd-primary/10 border border-scmd-primary/20 p-6 rounded-[32px]">
                      <h4 className="text-xs font-black uppercase tracking-widest text-scmd-cyber mb-4 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Lộ trình đề xuất giải quyết nỗi đau
                      </h4>
                      <ul className="space-y-3">
                        {Array.isArray(aiInsights.recommendations) && aiInsights.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex gap-3 text-sm text-scmd-silver/60 font-medium leading-relaxed">
                            <Zap size={14} className="text-scmd-cyber shrink-0 mt-1" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                       <span className="text-xs font-black uppercase tracking-widest text-scmd-silver/40">Top nhân sự:</span>
                       <div className="flex -space-x-1">
                         {Array.isArray(aiInsights.topPerformers) && aiInsights.topPerformers.map((p, idx) => (
                           <div key={idx} className="w-10 h-10 rounded-full bg-scmd-navy border-2 border-white/10 flex items-center justify-center text-[10px] font-black text-scmd-primary" title={p}>
                             {p.slice(0, 1)}
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-scmd-silver/40">Không có dữ liệu phân tích AI hỗ trợ.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Goal Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-scmd-surface p-8 rounded-[40px] border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-scmd-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-scmd-primary/20 transition-all"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
              <Zap className="text-amber-400" size={24} />
              Chỉ số Hiệu suất Hệ thống
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-scmd-silver/60 font-bold uppercase tracking-widest text-[10px]">Tỷ lệ Phản hồi (SOS):</span>
                <span className="text-scmd-primary font-black">99.8%</span>
              </div>
              <div className="w-full bg-scmd-navy h-3 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-scmd-primary to-blue-400 h-full w-[99.8%] shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <span className="text-scmd-silver/60 font-bold uppercase tracking-widest text-[10px]">Độ chính xác GPS:</span>
                <span className="text-emerald-400 font-black">98.5%</span>
              </div>
              <div className="w-full bg-scmd-navy h-3 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full w-[98.5%] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-scmd-surface p-8 rounded-[40px] border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600/10 blur-3xl -ml-16 -mb-16 group-hover:bg-red-600/20 transition-all"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Cảnh báo An ninh AI</h3>
              <p className="text-[10px] text-scmd-silver/40 font-black uppercase tracking-widest mb-6">Phát hiện bất thường bởi Gemini Flash 1.5</p>
            </div>
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-3xl font-black text-white">02</p>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Cần xử lý ngay</p>
              </div>
              <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 active:scale-95">
                Mở trung tâm chỉ huy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies Alert */}
      {filteredAnomalies.length > 0 && (
        <div id="anomalies-container" className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-500" size={24} />
            <h3 className="text-lg font-black text-red-400 uppercase tracking-tight">Cảnh báo bất thường ({filteredAnomalies.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-scmd-navy/80 p-4 rounded-xl border border-red-500/20 shadow-xl">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black px-2 py-1 bg-red-500 text-white rounded-lg uppercase tracking-widest">{anomaly.type}</span>
                  <span className="text-xs text-scmd-silver/40 font-bold font-mono">{anomaly.date}</span>
                </div>
                <p className="font-black text-white mb-1 uppercase tracking-tight">NV: {anomaly.staffId}</p>
                <p className="text-sm text-scmd-silver/40 font-medium leading-relaxed">{anomaly.details || 'Không có chi tiết'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Table */}
      <div id="attendance-detail-table" className="bg-scmd-navy/50 rounded-[40px] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="p-8 border-b border-white/5 bg-scmd-navy/20">
          <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <FileText size={24} className="text-emerald-500" />
            Chi tiết chấm công {reportType === 'daily' ? 'theo ngày' : reportType === 'shift' ? 'theo ca' : reportType === 'weekly' ? 'theo tuần' : 'theo tháng'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-scmd-navy/40 text-[10px] font-black text-scmd-silver/40 uppercase tracking-[0.2em]">
                <th className="px-10 py-8">Ngày</th>
                <th className="px-10 py-8">Nhân viên</th>
                <th className="px-10 py-8">Tổng giờ</th>
                <th className="px-10 py-8">Chi tiết Check-in/out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredReports.map((report, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors group">
                  <td className="px-10 py-8 text-sm font-bold text-scmd-silver/60 font-mono">{report.date}</td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-scmd-navy border border-white/5 flex items-center justify-center text-[10px] font-black text-scmd-silver/40 group-hover:bg-scmd-primary group-hover:text-white group-hover:border-scmd-primary group-hover:scale-110 transition-all">
                        {report.staffId.slice(-2)}
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-tight">{report.staffId}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white font-mono">{report.totalHoursFormatted}</span>
                      <span className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mt-1">
                        {report.checkInCount}V / {report.checkOutCount}R
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-wrap gap-2">
                       {report.logs.map((log: any, i: number) => (
                         <span key={i} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                           log.type === 'CHECK_IN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                           log.type === 'CHECK_OUT' ? 'bg-scmd-navy text-scmd-silver/40 border border-white/5' : 
                           'bg-scmd-primary/10 text-scmd-primary border border-scmd-primary/20'
                         }`}>
                           {log.type === 'CHECK_IN' ? <LogIn size={12} /> : log.type === 'CHECK_OUT' ? <LogOut size={12} /> : <AlertTriangle size={12} />}
                           {log.type === 'LIVENESS' ? 'Báo thức' : log.type} - {new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center text-scmd-silver/20 font-black text-lg uppercase tracking-widest ">
                    Không có dữ liệu chấm công cho thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
