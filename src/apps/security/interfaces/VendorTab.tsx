import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { Building2, ShieldAlert, BarChart3, ClipboardCheck, ChevronRight, Search, Filter, Download, MoreHorizontal, User, Plus, X, MapPin, FileText, CalendarDays } from "lucide-react";
import { FeatureLock } from "../../common/interfaces/components/FeatureLock";
import { 
  DashboardPageHeader, DashboardMetricGrid, DashboardMetricCard, DashboardToolbarRow, dashboardInputClass, DashboardSpinner 
} from "../../common/interfaces/components/DashboardUI";
import { useDashboardStore } from "../store/useDashboardStore";
import { opsTableClass, opsThClass, opsTdClass, opsRowClass, OpsStatusBadge, OpsIconButton } from "./components/OpsTableSystem";
import { cn } from "../../../lib/utils";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";

interface VendorTabProps {
  embedded?: boolean;
}

export const VendorTab: React.FC<VendorTabProps> = ({ embedded = false }) => {
  const { isPro, tenantInfo, setShowUpgradeModal, anomalies } = useDashboardStore(
    useShallow((state) => ({
      isPro: state.isPro,
      tenantInfo: state.tenantInfo,
      setShowUpgradeModal: state.setShowUpgradeModal,
      anomalies: state.anomalies,
    })),
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'view'>('view');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('info');

  const vendorManagementEnabled = tenantInfo?.resolvedFeatures?.vendor_management !== false;
  const contractComplianceEnabled = tenantInfo?.resolvedFeatures?.contract_compliance !== false;
  const isAccessible = isPro && vendorManagementEnabled && contractComplianceEnabled;

  const vendorPerformance = React.useMemo(() => [
    { id: 'v1', name: 'KTC Security', code: 'VND-KTC-01', status: 'ACTIVE', risk: 'LOW', sla: 98.5, activeContracts: 3, pendingViolations: 2, pic: 'Tùng (KTC)' },
    { id: 'v2', name: 'Yuki Sepre 24', code: 'VND-YUKI-24', status: 'ACTIVE', risk: 'MEDIUM', sla: 85.2, activeContracts: 1, pendingViolations: 5, pic: 'Hùng (Yuki)' },
    { id: 'v3', name: 'Thanh Binh Corp', code: 'VND-TBC-09', status: 'SUSPENDED', risk: 'HIGH', sla: 62.0, activeContracts: 0, pendingViolations: 12, pic: 'Lan (TBC)' },
  ], []);

  const toggleSelectAll = () => {
    if (selectedIds.length === vendorPerformance.length) setSelectedIds([]);
    else setSelectedIds(vendorPerformance.map(v => v.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setSelectedVendor(null);
    setIsDrawerOpen(true);
  };

  const openViewDrawer = (vendor: any) => {
    setDrawerMode('view');
    setSelectedVendor(vendor);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative min-h-[calc(100vh-200px)] flex flex-col">
      {!embedded ? (
        <DashboardPageHeader
          title="Nhà thầu & SLA"
          description="Trung tâm điều hành và đối soát chất lượng dịch vụ nhà thầu bảo vệ thuê ngoài hằng ngày."
          eyebrow="Contract compliance"
        />
      ) : null}

      {!isAccessible ? (
        <FeatureLock
          title="Quản lý Nhà thầu & SLA"
          description={
            !isPro
              ? undefined
              : "Tenant này đang tắt tính năng quản lý nhà thầu hoặc tuân thủ hợp đồng trong ma trận tính năng."
          }
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      ) : (
        <>
          {/* 1. KPI Surface: Dữ liệu nén cấp cao */}
          <DashboardMetricGrid className="md:grid-cols-4">
            <DashboardMetricCard label="Tổng nhà thầu" value={vendorPerformance.length} icon={<Building2 size={18} />} />
            <DashboardMetricCard label="Hợp đồng hiệu lực" value={vendorPerformance.reduce((sum, v) => sum + v.activeContracts, 0)} tone="primary" icon={<ClipboardCheck size={18} />} />
            <DashboardMetricCard label="SLA trung bình" value="91.4%" tone="success" icon={<BarChart3 size={18} />} />
            <DashboardMetricCard label="Vi phạm chưa chốt" value={vendorPerformance.reduce((sum, v) => sum + v.pendingViolations, 0)} tone="danger" icon={<ShieldAlert size={18} />} />
          </DashboardMetricGrid>

          {/* 2. Command Toolbar: Tìm kiếm & Hành động hàng loạt */}
          <DashboardToolbarRow>
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  placeholder="Tìm tên, mã nhà thầu hoặc PIC..." 
                  className={cn(dashboardInputClass, "pl-9")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 hover:bg-white/10">
                <Filter size={14} /> Bộ lọc
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <div className="mr-2 flex items-center gap-2 border-r border-white/10 pr-4 animate-in fade-in slide-in-from-right-2">
                  <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">{selectedIds.length} đã chọn</span>
                  <button className="h-8 rounded-md bg-blue-600 px-3 text-[11px] font-bold text-white hover:bg-blue-500">Giao việc</button>
                  <button className="h-8 rounded-md border border-white/10 px-3 text-[11px] font-bold text-slate-300 hover:bg-white/5">Tạm dừng</button>
                </div>
              )}
              <button className="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500">
                <Download size={14} /> Xuất báo cáo
              </button>
            </div>
          </DashboardToolbarRow>

          {/* 3. Performance Data Table: Mật độ thông tin cao */}
          <section className="rounded-[14px] border border-white/8 bg-slate-900/45 p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className={cn(opsTableClass, "min-w-[1100px]")}>
                <thead>
                  <tr>
                    <th className={cn(opsThClass, "w-10")}>
                      <input type="checkbox" checked={selectedIds.length === vendorPerformance.length} onChange={toggleSelectAll} className="rounded border-slate-700 bg-slate-800" />
                    </th>
                    <th className={opsThClass}>Nhà thầu</th>
                    <th className={opsThClass}>Status</th>
                    <th className={opsThClass}>SLA Score</th>
                    <th className={opsThClass}>Mức độ rủi ro</th>
                    <th className={opsThClass}>Hợp đồng</th>
                    <th className={opsThClass}>Vi phạm mở</th>
                    <th className={opsThClass}>PIC</th>
                    <th className={cn(opsThClass, "text-right")}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorPerformance.map((v) => (
                    <tr key={v.id} className={cn(opsRowClass, selectedIds.includes(v.id) && "bg-blue-500/[0.04]")}>
                      <td className={opsTdClass}>
                        <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} className="rounded border-slate-700 bg-slate-800" />
                      </td>
                      <td className={opsTdClass}>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{v.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{v.code}</span>
                        </div>
                      </td>
                      <td className={opsTdClass}><OpsStatusBadge value={v.status} /></td>
                      <td className={opsTdClass}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                            {/* SLA Progress Bar Color logic based on value */}
                            <div className={cn("h-full rounded-full transition-all duration-500", v.sla >= 90 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : v.sla >= 70 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${v.sla}%` }} />
                          </div>
                          <span className={cn("font-mono text-[11px] font-black", v.sla >= 90 ? "text-emerald-400" : v.sla >= 70 ? "text-amber-400" : "text-red-400")}>{v.sla}%</span>
                        </div>
                      </td>
                      <td className={opsTdClass}>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border", 
                          v.risk === 'LOW' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : 
                          v.risk === 'MEDIUM' ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : 
                          "border-red-500/20 bg-red-500/10 text-red-400" )}>
                          {v.risk}
                        </span>
                      </td>
                      <td className={opsTdClass}><span className="font-semibold text-slate-300">{v.activeContracts} active</span></td>
                      <td className={opsTdClass}>
                        <span className={cn("font-bold", v.pendingViolations > 0 ? "text-red-400" : "text-slate-500")}>
                          {v.pendingViolations} vụ việc
                        </span>
                      </td>
                      <td className={opsTdClass}>
                        <div className="flex items-center gap-2 text-slate-400">
                          <User size={12} /> <span className="text-xs">{v.pic}</span>
                        </div>
                      </td>
                      <td className={cn(opsTdClass, "text-right")} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <OpsIconButton label="Chi tiết" onClick={() => openViewDrawer(v)}><ChevronRight size={14} /></OpsIconButton>
                          <OpsIconButton label="Menu" onClick={() => {}}><MoreHorizontal size={14} /></OpsIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Right-side Detail/Form Drawer (Master-Detail Flow) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative flex h-full w-full max-w-2xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6 shrink-0">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    {drawerMode === 'create' ? 'Tạo Nhà thầu mới' : selectedVendor?.name}
                  </h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                    {drawerMode === 'create' ? 'Cấu hình định danh đối tác' : `Mã đối soát: ${selectedVendor?.code}`}
                  </p>
                </div>
                <button onClick={() => setIsDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {drawerMode === 'create' ? (
                   <div className="p-8 space-y-6">
                      {/* Form được dời từ góc màn hình vào đây */}
                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tên nhà thầu</label><input className={dashboardInputClass} placeholder="VD: KTC Security" /></div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Mã đối tác</label><input className={dashboardInputClass} placeholder="VND-XXX-01" /></div>
                         </div>
                         <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Người phụ trách (PIC)</label><input className={dashboardInputClass} placeholder="Tên và số điện thoại..." /></div>
                         <div className="pt-6">
                           <SCMDButton className="w-full h-12 bg-blue-600 text-white font-black uppercase tracking-widest text-[11px]">Xác nhận lưu thông tin</SCMDButton>
                         </div>
                      </div>
                   </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Tabs chi tiết được dời từ giữa trang vào đây */}
                    <div className="flex gap-4 px-6 pt-4 border-b border-white/5">
                       {[
                         { id: 'info', label: 'Hồ sơ & PIC', icon: User },
                         { id: 'sites', label: 'Mục tiêu/Chốt', icon: MapPin },
                         { id: 'contracts', label: 'Hợp đồng/SLA', icon: FileText },
                         { id: 'shift', label: 'Điều phối ca', icon: CalendarDays },
                       ].map(tab => (
                         <button
                           key={tab.id}
                           onClick={() => setActiveDrawerTab(tab.id)}
                           className={cn(
                             "flex items-center gap-2 pb-3 text-[11px] font-black uppercase tracking-tighter border-b-2 transition-all",
                             activeDrawerTab === tab.id ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"
                           )}
                         >
                           <tab.icon size={14} /> {tab.label}
                         </button>
                       ))}
                    </div>
                    <div className="p-8 flex-1">
                        {/* Content Area for Detail Tabs */}
                        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
                           <p className="text-sm text-slate-500 italic">Dữ liệu chi tiết của tab [{activeDrawerTab}] đang được đồng bộ...</p>
                        </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-900/50 border-t border-white/10 shrink-0">
                 <p className="text-[10px] text-slate-500 italic text-center uppercase tracking-widest">SCMD PRO • Vendor Control Module v2.5</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorTab;
