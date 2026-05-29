import { useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, FileWarning, ShieldCheck, Users } from 'lucide-react';
import { ShiftSchedulerView } from './components/ShiftSchedulerView';
import { StaffTab } from './StaffTab';
import { ViolationsTab } from './ViolationsTab';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { useTenantStaff } from './hooks/useTenantStaff';
import { useTenantDashboard } from './hooks/useTenantDashboard';
import { useDashboardActions } from './hooks/useDashboardActions';
import { useModalStore } from '../store/useModalStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { cn } from '../../../lib/utils';

type VendorCommanderTab = 'overview' | 'guards' | 'shift-scheduler' | 'shortages' | 'violations' | 'disputes';

const VENDOR_COMMANDER_TABS: Array<{
  id: VendorCommanderTab;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  { id: 'overview', label: 'Tổng quan điều phối', description: 'Tình trạng ca, thiếu người và cảnh báo hợp đồng được giao.', icon: ShieldCheck },
  { id: 'guards', label: 'Danh sách guard', description: 'Quản lý guard trong scope nhà thầu/site/hợp đồng.', icon: Users },
  { id: 'shift-scheduler', label: 'Lịch ca / Cắt ca', description: 'Sinh lịch ca và kéo guard vào ca theo ContractShiftRequirement.', icon: CalendarDays },
  { id: 'shortages', label: 'Ca thiếu người', description: 'Theo dõi ca thiếu quân và violation SHIFT_UNDERSTAFFED.', icon: AlertTriangle },
  { id: 'violations', label: 'Vi phạm đang ghi nhận', description: 'Xem vi phạm trong scope để chuẩn bị giải trình.', icon: FileWarning },
  { id: 'disputes', label: 'Giải trình tranh chấp', description: 'Gửi giải trình cho dispute/violation đang mở.', icon: ClipboardList },
];

export function VendorCommanderWorkspace() {
  const [activeTab, setActiveTab] = useState<VendorCommanderTab>('overview');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [staffFilters, setStaffFilters] = useState<{ search: string; role: string; status: string }>({ search: '', role: 'guard', status: '' });
  const dashboardState = useTenantDashboard(setMessage);
  const staffActions = useTenantStaff(
    dashboardState.fetchData,
    setMessage,
    staffFilters,
    setStaffFilters,
  );
  const dashboardActions = useDashboardActions(setMessage);
  const { setShowConfirmModal } = useModalStore();
  const dashboardStoreTenantInfo = useDashboardStore((state) => state.tenantInfo);
  const dashboardStoreIsPro = useDashboardStore((state) => state.isPro);
  const tenantInfo = dashboardStoreTenantInfo ?? dashboardState.tenantInfo;
  const isPro = dashboardStoreIsPro || tenantInfo?.subscriptionPlan === 'PRO' || tenantInfo?.subscriptionPlan === 'ENTERPRISE';

  const renderContent = () => {
    if (activeTab === 'shift-scheduler') {
      return <ShiftSchedulerView apiBasePath="/api/vendor-commander" />;
    }

    if (activeTab === 'guards') {
      return (
        <StaffTab
          staff={dashboardState.staff}
          editingStaff={staffActions.editingStaff}
          selectedStaffDetail={staffActions.selectedStaffDetail}
          staffModalTab={staffActions.staffModalTab}
          newStaff={staffActions.newStaff}
          isSubmitting={staffActions.isSubmittingStaff}
          isLoading={dashboardState.loading}
          error={dashboardState.staffError}
          onRetry={dashboardState.fetchStaff}
          showPrintModal={staffActions.showPrintModal}
          printFields={staffActions.printFields}
          filters={staffFilters}
          onFilterChange={setStaffFilters}
          setNewStaff={staffActions.setNewStaff}
          setStaffModalTab={staffActions.setStaffModalTab}
          setSelectedStaffDetail={staffActions.setSelectedStaffDetail}
          setShowConfirmModal={setShowConfirmModal}
          setShowPrintModal={staffActions.setShowPrintModal}
          setPrintFields={staffActions.setPrintFields}
          startEditingStaff={staffActions.startEditingStaff}
          cancelEditingStaff={staffActions.cancelEditingStaff}
          handleAddStaff={staffActions.handleAddStaff}
          handlePrintStaffProfile={staffActions.handlePrintStaffProfile}
          tenantInfo={tenantInfo}
        />
      );
    }

    if (activeTab === 'violations' || activeTab === 'shortages' || activeTab === 'disputes') {
      return (
        <ViolationsTab
          isPro={isPro}
          setShowUpgradeModal={() => undefined}
          handleExportWatcherReport={dashboardActions.handleExportWatcherReport}
          handleAnomalyFeedback={dashboardActions.handleAnomalyFeedback}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {VENDOR_COMMANDER_TABS.filter((tab) => tab.id !== 'overview').map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="min-h-32 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-[#2563EB]/50 hover:bg-[#2563EB]/10"
            >
              <Icon size={22} className="text-[#93C5FD]" />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-white">{tab.label}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">{tab.description}</p>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-scmd-navy">
      <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-[#0D1324] p-5 lg:block">
        <div className="mb-8 rounded-3xl border border-[#2563EB]/30 bg-[#2563EB]/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#93C5FD]">Vendor Commander</p>
          <p className="mt-2 text-lg font-black uppercase text-white">Workspace nhà thầu</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">
            Scope theo tenant, vendor, site và contract được giao. Không dùng dashboard admin/supervisor.
          </p>
        </div>
        <nav className="space-y-2">
          {VENDOR_COMMANDER_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest transition',
                  activeTab === tab.id ? 'bg-[#2563EB] text-white' : 'text-scmd-silver/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-5 lg:p-8">
        <SCMDCard className="mb-6 border-[#2563EB]/20 bg-[#0D1324]/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#93C5FD]">{VENDOR_COMMANDER_TABS.find((tab) => tab.id === activeTab)?.label}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-secondary)]">
            {VENDOR_COMMANDER_TABS.find((tab) => tab.id === activeTab)?.description}
          </p>
        </SCMDCard>
        {dashboardState.loading && activeTab === 'overview' ? (
          <div className="flex h-64 items-center justify-center text-xs font-black uppercase tracking-widest text-scmd-silver/60">Đang tải workspace...</div>
        ) : renderContent()}
      </main>
      {message && (
        <div className="fixed bottom-8 right-8 z-[500]">
          <div className={cn(
            'rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-widest shadow-2xl',
            message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/10 text-red-400',
          )}>
            {message.text}
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorCommanderWorkspace;
