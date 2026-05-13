/**
 * AttendanceTab.tsx — SCMD Pro v2.5
 * Quản lý & Phân tích Dữ liệu Chấm công
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Loader2, Calendar } from 'lucide-react';
import { AttendanceReports } from './components/AttendanceReports';
import { apiFetch } from '../../../lib/api';

export const AttendanceTab: React.FC = () => {
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create default date range: last 30 days
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);
  
  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>(`/api/tenant/attendance?startDate=${startDate}&endDate=${endDate}&limit=1000`);
      // Since backend might return { records, summary }, handle both
      const logs = data?.records ? data.records : (Array.isArray(data) ? data : []);
      setAttendanceLogs(logs);
    } catch (err) {
      console.error('Failed to fetch attendance logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [startDate, endDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-in fade-in duration-500"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase">Phân tích Chấm công</h2>
          <p className="text-scmd-silver/60 mt-2 font-medium">
            Báo cáo chi tiết giờ làm việc, phát hiện bất thường và phân tích AI Strategic.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-scmd-navy/50 p-2 rounded-[24px] border border-white/5 backdrop-blur-md flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1 bg-scmd-navy rounded-xl border border-white/5">
                <Calendar size={16} className="text-scmd-silver/40" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold focus:outline-none w-32 uppercase font-mono"
                />
             </div>
             <span className="text-scmd-silver/40 font-bold">-</span>
             <div className="flex items-center gap-2 px-3 py-1 bg-scmd-navy rounded-xl border border-white/5">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white text-sm font-bold focus:outline-none w-32 uppercase font-mono"
                />
             </div>
          </div>
          
          <div className="bg-scmd-navy/50 p-4 rounded-[24px] border border-white/5 backdrop-blur-md flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <BarChart3 size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Dữ liệu đối soát</p>
                <p className="text-white font-bold text-sm font-mono">
                  {attendanceLogs.length} bản ghi
                </p>
             </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center py-40 bg-scmd-navy/20 rounded-[40px] border border-white/5">
          <Loader2 className="animate-spin h-12 w-12 text-scmd-primary mb-4" />
          <p className="font-black text-scmd-silver/40 uppercase tracking-widest text-xs">Đang phân tích dữ liệu chấm công...</p>
        </div>
      ) : (
        <AttendanceReports logs={attendanceLogs} />
      )}
    </motion.div>
  );
};

export default AttendanceTab;
