import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  RefreshCcw, 
  ShieldCheck, 
  Search, 
  Calendar, 
  X, 
  ChevronRight, 
  Database, 
  AlertCircle, 
  History,
  Monitor
} from "lucide-react";
import { apiFetch } from "../../../lib/api";
import {
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
  DashboardToolbarRow,
  dashboardInputClass,
} from "../../common/interfaces/components/DashboardUI";
import {
  OpsIconButton,
  opsRowClass,
  opsTableClass,
  opsTdClass,
  opsThClass,
} from "./components/OpsTableSystem";
import { cn } from "../../../lib/utils";

type SystemAuditLog = {
  id: string;
  timestamp: string;
  user: string;
  ip: string;
  module: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  description: string;
  beforeData: any;
  afterData: any;
};

export const AuditTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Thực tế sẽ dùng filter query params
      const data = await apiFetch<any>("/api/tenant/audit-logs?limit=50");
      setLogs(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLogs(); }, []);

  const openDetail = (log: SystemAuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const actionBadge = (action: string) => {
    const map: Record<string, string> = {
      CREATE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      UPDATE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
      LOGIN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
    return <span className={cn("px-2 py-0.5 rounded text-[10px] font-black border uppercase", map[action] || "border-slate-700 bg-slate-800")}>{action}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Khu vực 1: Top Bar - Unified Filter */}
      <DashboardPageHeader
        title="Kiểm soát hệ thống"
        eyebrow="Security auditing"
        description="Truy vết toàn bộ thao tác người dùng, thay đổi dữ liệu và lịch sử đăng nhập vào hệ thống SCMD PRO."
      />

      <DashboardToolbarRow>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input placeholder="Tìm người dùng, IP hoặc mô tả..." className={cn(dashboardInputClass, "pl-9")} />
          </div>
          <select className={cn(dashboardInputClass, "w-40")}>
            <option value="all">Mọi Module</option>
            <option value="staff">Staff</option>
            <option value="sites">Sites</option>
            <option value="contracts">Contracts</option>
          </select>
          <select className={cn(dashboardInputClass, "w-40")}>
            <option value="all">Mọi hành động</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="DELETE">Xóa</option>
          </select>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
             <input type="date" className={cn(dashboardInputClass, "pl-9 w-40")} />
          </div>
        </div>
        <OpsIconButton label="Làm mới" onClick={() => void loadLogs()}>
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
        </OpsIconButton>
      </DashboardToolbarRow>

      {/* Khu vực 2: Micro-KPIs */}
      <DashboardMetricGrid className="md:grid-cols-4">
        <DashboardMetricCard label="Tổng nhật ký" value={logs.length} icon={<Database size={18} />} />
        <DashboardMetricCard label="Thay đổi dữ liệu" value="128" tone="primary" icon={<History size={18} />} />
        <DashboardMetricCard label="Cảnh báo bảo mật" value="0" tone="success" icon={<ShieldCheck size={18} />} />
        <DashboardMetricCard label="Truy cập IP lạ" value="2" tone="warning" icon={<Monitor size={18} />} />
      </DashboardMetricGrid>

      {/* Khu vực 3: Main Data Table */}
      <section className="rounded-2xl border border-white/5 bg-slate-900/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={cn(opsTableClass, "w-full")}>
            <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md shadow-sm">
              <tr>
                <th className={opsThClass}>Thời gian</th>
                <th className={opsThClass}>Người thao tác & IP</th>
                <th className={opsThClass}>Module</th>
                <th className={opsThClass}>Hành động</th>
                <th className={opsThClass}>Mô tả chi tiết</th>
                <th className={cn(opsThClass, "text-right")}>Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 italic text-sm">Không có dữ liệu nhật ký phù hợp bộ lọc.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={cn(opsRowClass, "cursor-pointer group")} onClick={() => openDetail(log)}>
                    <td className={opsTdClass}>
                      <p className="text-white font-mono text-[11px]">{new Date(log.timestamp).toLocaleString('vi-VN')}</p>
                    </td>
                    <td className={opsTdClass}>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{log.user}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{log.ip}</span>
                      </div>
                    </td>
                    <td className={opsTdClass}><span className="text-[11px] font-bold text-slate-400 uppercase">{log.module}</span></td>
                    <td className={opsTdClass}>{actionBadge(log.action)}</td>
                    <td className={cn(opsTdClass, "max-w-md truncate")}>{log.description}</td>
                    <td className={cn(opsTdClass, "text-right")}>
                      <OpsIconButton label="Xem Diff" onClick={() => openDetail(log)} className="group-hover:bg-blue-600 group-hover:text-white">
                        <ChevronRight size={14} />
                      </OpsIconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right-side Detail Drawer (Master-Detail Flow) */}
      <AnimatePresence>
        {isDrawerOpen && selectedLog && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) setIsDrawerOpen(false);
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative flex h-full w-full sm:max-w-3xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <AlertCircle className="text-blue-400" /> Chi tiết biến động
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mã log: #{selectedLog.id.slice(0,12)}</p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <section className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Dữ liệu trước (Before)</p>
                      <pre className="mt-3 text-[10px] font-mono text-red-300 bg-red-500/5 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.beforeData, null, 2)}
                      </pre>
                   </div>
                   <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Dữ liệu sau (After)</p>
                      <pre className="mt-3 text-[10px] font-mono text-emerald-300 bg-emerald-500/5 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.afterData, null, 2)}
                      </pre>
                   </div>
                </section>
                
                <section className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase text-slate-500">Bối cảnh hệ thống</h3>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[9px] font-bold text-slate-600 uppercase">Người dùng</p>
                        <p className="text-xs text-white mt-1">{selectedLog.user}</p>
                     </div>
                     <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[9px] font-bold text-slate-600 uppercase">Địa chỉ IP</p>
                        <p className="text-xs text-white mt-1 font-mono">{selectedLog.ip}</p>
                     </div>
                     <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
                        <p className="text-[9px] font-bold text-slate-600 uppercase">Thời gian</p>
                        <p className="text-xs text-white mt-1">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                     </div>
                  </div>
                </section>
              </div>

              <div className="p-6 bg-slate-900/50 border-t border-white/10">
                 <p className="text-[10px] text-slate-500 italic">Dữ liệu kiểm toán không thể bị sửa đổi bởi người dùng (Immutable Audit Trail).</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
