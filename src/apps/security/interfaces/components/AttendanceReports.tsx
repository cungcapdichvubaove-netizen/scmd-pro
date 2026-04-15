import React, { useState, useMemo } from 'react';
import { Download, Calendar, Clock, AlertTriangle, CheckCircle2, FileText, Filter, Users, ShieldAlert, LogIn, LogOut } from 'lucide-react';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';

interface AttendanceLog {
  id: string;
  tenantId: string;
  staffId: string;
  lat: number;
  lon: number;
  type: 'check-in' | 'check-out';
  timestamp: string;
  status: string;
}

interface AttendanceReportsProps {
  logs: AttendanceLog[];
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({ logs }) => {
  const [reportType, setReportType] = useState<'shift' | 'daily' | 'weekly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Process logs to calculate anomalies (e.g., missing check-out, overtime, missing guards)
  const processedData = useMemo(() => {
    // Group by staff and date
    const grouped: Record<string, Record<string, AttendanceLog[]>> = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date][log.staffId]) grouped[date][log.staffId] = [];
      grouped[date][log.staffId].push(log);
    });

    const anomalies: any[] = [];
    const reports: any[] = [];
    const dailyCoverage: Record<string, number> = {};

    Object.keys(grouped).forEach(date => {
      let totalDailyHours = 0;
      
      Object.keys(grouped[date]).forEach(staffId => {
        const staffLogs = grouped[date][staffId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        let checkInTime = null;
        let checkOutTime = null;
        let totalHours = 0;

        staffLogs.forEach(log => {
          if (log.type === 'check-in') {
            checkInTime = new Date(log.timestamp);
          } else if (log.type === 'check-out' && checkInTime) {
            checkOutTime = new Date(log.timestamp);
            totalHours += (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            checkInTime = null; // Reset for next shift
          }
        });

        // Check for anomalies
        if (checkInTime && !checkOutTime) {
          anomalies.push({ date, staffId, type: 'Thiếu check-out', details: `Nhân viên chưa check-out sau khi check-in lúc ${checkInTime.toLocaleTimeString('vi-VN')}` });
        }
        
        if (totalHours > 12) {
          anomalies.push({ date, staffId, type: 'Thừa giờ', details: `Làm việc ${totalHours.toFixed(1)} giờ (vượt quá 12h/ca)` });
        } else if (totalHours > 0 && totalHours < 4) {
          anomalies.push({ date, staffId, type: 'Thiếu giờ', details: `Chỉ làm việc ${totalHours.toFixed(1)} giờ` });
        }

        totalDailyHours += totalHours;

        reports.push({
          date,
          staffId,
          totalHours: totalHours.toFixed(1),
          logs: staffLogs
        });
      });
      
      dailyCoverage[date] = totalDailyHours;
      
      // Check for missing coverage (assuming 24/7 post requires 24 hours)
      if (totalDailyHours > 0 && totalDailyHours < 24) {
        anomalies.push({ 
          date, 
          staffId: 'Hệ thống', 
          type: 'Thiếu người trực', 
          details: `Tổng thời gian trực trong ngày chỉ đạt ${totalDailyHours.toFixed(1)}/24 giờ` 
        });
      } else if (totalDailyHours > 24) {
        anomalies.push({ 
          date, 
          staffId: 'Hệ thống', 
          type: 'Thừa giờ trực', 
          details: `Tổng thời gian trực trong ngày là ${totalDailyHours.toFixed(1)} giờ (vượt quá 24h)` 
        });
      }
    });

    return { reports, anomalies, dailyCoverage };
  }, [logs]);

  const handleExportPDF = () => {
    window.print();
  };

  const filteredReports = processedData.reports.filter(r => {
    if (reportType === 'weekly') {
      // Simple weekly filter: within 7 days of selected date
      const rDate = new Date(r.date).getTime();
      const sDate = new Date(selectedDate).getTime();
      return rDate <= sDate && rDate > sDate - 7 * 24 * 60 * 60 * 1000;
    }
    return r.date === selectedDate;
  });
  
  const filteredAnomalies = processedData.anomalies.filter(a => {
    if (reportType === 'weekly') {
      const aDate = new Date(a.date).getTime();
      const sDate = new Date(selectedDate).getTime();
      return aDate <= sDate && aDate > sDate - 7 * 24 * 60 * 60 * 1000;
    }
    return a.date === selectedDate;
  });

  const totalCoverageHours = filteredReports.reduce((sum, r) => sum + Number(r.totalHours), 0);
  const expectedHours = reportType === 'weekly' ? 24 * 7 : 24;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setReportType('shift')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportType === 'shift' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Theo ca
          </button>
          <button 
            onClick={() => setReportType('daily')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportType === 'daily' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Theo ngày
          </button>
          <button 
            onClick={() => setReportType('weekly')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportType === 'weekly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Theo tuần
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              readOnly
              value={selectedDate}
              className="pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 w-48 focus:outline-none"
            />
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          </div>
          <button 
            onClick={handleExportPDF} 
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20"
          >
            <Download size={18} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-6 group">
          <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex items-center justify-center text-emerald-500">
            <Clock size={36} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tổng giờ trực</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{totalCoverageHours.toFixed(1)} <span className="text-sm font-bold text-slate-400">/ {expectedHours}h</span></p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-6 group">
          <div className="w-20 h-20 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-500">
            <Users size={36} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Nhân sự tham gia</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{new Set(filteredReports.map(r => r.staffId)).size} <span className="text-sm font-bold text-slate-400">người</span></p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-6 group">
          <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500">
            <ShieldAlert size={36} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Bất thường</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{filteredAnomalies.length} <span className="text-sm font-bold text-slate-400">vụ</span></p>
          </div>
        </div>
      </div>

      {/* Anomalies Alert */}
      {filteredAnomalies.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-red-500" size={24} />
            <h3 className="text-lg font-bold text-red-900">Cảnh báo bất thường ({filteredAnomalies.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg">{anomaly.type}</span>
                  <span className="text-xs text-slate-500 font-medium">{anomaly.date}</span>
                </div>
                <p className="font-bold text-slate-900 mb-1">NV: {anomaly.staffId}</p>
                <p className="text-sm text-slate-600">{anomaly.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-white">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <FileText size={24} className="text-emerald-500" />
            Chi tiết chấm công {reportType === 'daily' ? 'theo ngày' : reportType === 'shift' ? 'theo ca' : 'theo tuần'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-10 py-8">Ngày</th>
                <th className="px-10 py-8">Nhân viên</th>
                <th className="px-10 py-8">Tổng giờ</th>
                <th className="px-10 py-8">Chi tiết Check-in/out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8 text-sm font-bold text-slate-900">{report.date}</td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-200 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        {report.staffId.slice(-2)}
                      </div>
                      <span className="text-sm font-black text-slate-900">{report.staffId}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`text-sm font-black ${Number(report.totalHours) < 8 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {report.totalHours}h
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-wrap gap-2">
                      {report.logs.map((log: any, i: number) => (
                        <span key={i} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                          log.type === 'check-in' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {log.type === 'check-in' ? <LogIn size={12} /> : <LogOut size={12} />}
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-32 text-center text-slate-400 font-bold text-lg">
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
