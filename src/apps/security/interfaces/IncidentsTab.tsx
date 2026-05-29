import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clock3, RefreshCcw, ShieldAlert, X, MessageSquare, Activity, CheckCircle2, Send, Plus, Search, Filter } from "lucide-react";
import { IncidentReport } from "./IncidentReport";
import { IncidentsMainTable } from "./components/OperationsTables";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";
import { apiFetch } from "../../../lib/api";
import {
  DashboardFilterGroup,
} from "../../common/interfaces/components/DashboardUI";
import { cn } from "../../../lib/utils";

export const IncidentsTab: React.FC = () => {
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const [metrics, setMetrics] = useState({ processing: 0, critical: 0, resolved: 0, mttr: '---' });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTimeFilterActive, setIsTimeFilterActive] = useState(false);

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      // Lấy danh sách sự cố gần nhất để tính toán metrics (Single Source of Truth)
      const params = new URLSearchParams({ limit: "100" });
      if (isTimeFilterActive) params.set("period", "24h");
      const data = await apiFetch<any>(`/api/tenant/incidents?${params.toString()}`);
      const list = Array.isArray(data) ? data : data?.items || [];
      
      const processing = list.filter((i: any) => ['reported', 'investigating'].includes(i.status?.toLowerCase())).length;
      const critical = list.filter((i: any) => i.severity === 'CRITICAL' && i.status !== 'closed').length;
      const resolved = list.filter((i: any) => ['resolved', 'closed'].includes(i.status?.toLowerCase())).length;
      
      setMetrics({ processing, critical, resolved, mttr: '---' });
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load incident metrics", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [isTimeFilterActive]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics, refreshKey]);

  const handleCloseDrawers = () => {
    setIsDrawerOpen(false);
    setIsReportDrawerOpen(false);
  };

  const handleReportSuccess = () => {
    setIsReportDrawerOpen(false);
    setRefreshKey((prev) => prev + 1);
  };
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const incidentMetricsList = useMemo(() => [
    { label: "MTTR", value: metrics.mttr, tone: "primary", icon: Clock3 },
    { label: "Đang xử lý", value: metrics.processing.toString().padStart(2, '0'), tone: "warning", icon: Activity },
    { label: "Khẩn cấp", value: metrics.critical.toString().padStart(2, '0'), tone: "danger", icon: ShieldAlert },
    { label: "Hoàn thành", value: metrics.resolved.toString().padStart(2, '0'), tone: "success", icon: CheckCircle2 },
  ], [metrics]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleCloseDrawers();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] gap-4 animate-in fade-in duration-500">
      
      {/* KHU VỰC 1: TOP BAR - Hợp nhất Điều hướng & Lọc */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
              searchQuery ? "text-blue-400" : "text-slate-500"
            )} size={14} />
            <input 
              placeholder="Tìm sự cố, site, nhân sự..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full h-9 bg-white/5 border rounded-lg pl-9 pr-4 text-xs text-white outline-none transition-all duration-200",
                searchQuery ? "border-blue-500/50 ring-1 ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]" : "border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              )}
            />
          </div>
          <DashboardFilterGroup>
            <button 
              onClick={() => setIsTimeFilterActive(!isTimeFilterActive)}
              className={cn(
                "h-9 px-3 flex items-center gap-2 rounded-lg text-[11px] font-bold transition-all duration-200 border",
                isTimeFilterActive 
                  ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <Filter size={14} className={cn(isTimeFilterActive && "animate-pulse")} /> 24h qua
            </button>
          </DashboardFilterGroup>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            className={cn("h-9 w-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all", loadingMetrics && "opacity-50")}
            title="Làm mới"
            disabled={loadingMetrics}
          >
            <RefreshCcw size={16} className={loadingMetrics ? "animate-spin" : ""} />
          </button>
          <SCMDButton
            onClick={() => setIsReportDrawerOpen(true)}
            className="h-9 bg-blue-600 px-4 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} /> Tạo sự cố
          </SCMDButton>
        </div>
      </div>

      {/* KHU VỰC 2: MICRO-KPIS - Tổng quan tinh gọn */}
      <div className="flex flex-wrap items-center gap-4 md:gap-8 px-1 py-1 border-y border-white/5 bg-white/[0.01]">
        {incidentMetricsList.map(m => (
          <div key={m.label} className="flex items-center gap-3 py-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              m.tone === 'danger' ? "bg-red-500/10 text-red-500" : 
              m.tone === 'warning' ? "bg-amber-500/10 text-amber-500" : 
              m.tone === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
            )}>
              <m.icon size={14} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider leading-none">{m.label}</p>
              <p className="text-sm font-black text-white mt-1 leading-none">{m.value}</p>
            </div>
          </div>
        ))}
        <div className="ml-auto text-[10px] font-bold text-slate-600">
          Cập nhật: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* KHU VỰC 3: MAIN WORKSPACE - Bảng dữ liệu Full-height */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/5 bg-slate-900/20">
        <IncidentsMainTable
          key={refreshKey}
          {...({
            onRowClick: (incident: any) => {
              setSelectedIncident(incident);
              setIsDrawerOpen(true);
            },
          } as any)}
        />
      </div>

      {/* KHU VỰC 4: RIGHT DRAWERS - Xử lý Details & Form */}
      <AnimatePresence>
        {(isDrawerOpen || isReportDrawerOpen) && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseDrawers}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            {/* Drawer Content */}
            <motion.div
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) handleCloseDrawers();
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex h-full w-full sm:max-w-xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={isReportDrawerOpen ? "Tạo sự cố mới" : "Phòng tác chiến sự cố"}
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6 shrink-0">
                {isReportDrawerOpen ? (
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Tạo sự cố mới</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ghi nhận thông tin thực địa cấp tốc</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center">
                      <ShieldAlert size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-white">Phòng tác chiến</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mã: #{selectedIncident?.id?.slice(0,8) || 'INC-8291'}</p>
                    </div>
                  </div>
                )}
                <button onClick={handleCloseDrawers} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors" aria-label="Đóng">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {isReportDrawerOpen ? (
                  <IncidentReport isModal onSuccess={handleReportSuccess} />
                ) : (
                  <>
                {/* Thông tin SLA - Chỉ hiển thị nếu có dữ liệu thật từ backend */}
                {(selectedIncident?.responseDueAt || selectedIncident?.resolutionDueAt) && (
                <section className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Thời gian phản hồi (SLA)</span>
                    <span className="text-sm font-mono font-black text-blue-400">
                      Hạn chốt: {new Date(selectedIncident.responseDueAt || selectedIncident.resolutionDueAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </section>
                )}

                {/* Mô tả sự cố thực tế */}
                <section className="space-y-2">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Chi tiết diễn biến</p>
                   <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 leading-relaxed">
                      {selectedIncident?.description || "Không có mô tả chi tiết."}
                   </div>
                </section>

                {/* Chat/Coordination Box */}
                <section className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <MessageSquare size={14} /> Nhật ký phối hợp & Chat
                  </h3>
                  <div className="min-h-[100px] rounded-2xl border border-white/5 bg-slate-950/20 p-6 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                      <MessageSquare size={20} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Phòng điều hành</p>
                    <p className="text-xs text-slate-600 italic max-w-[200px]">Sử dụng khung chat bên dưới để gửi chỉ thị hoặc cập nhật tình hình thực địa.</p>
                  </div>
                </section>
                  </>
                )}
              </div>

              {!isReportDrawerOpen && (
              <div className="border-t border-white/10 bg-slate-900/50 p-6 flex gap-3">
                  <input className="flex-1 h-12 bg-slate-950 border border-white/10 rounded-xl px-4 text-sm text-white focus:border-blue-500 outline-none" placeholder="Nhập chỉ thị tác chiến..." />
                <button className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-all">
                  <Send size={18} />
                </button>
              </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
