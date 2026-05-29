import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileText,
  Menu,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { DashboardModals } from './DashboardModals';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTabManager } from './DashboardTabManager';
import { ContextFilterBar } from './filters/ContextFilterBar';
import { getTabFilterConfig } from './filters/tabFilterConfigs';
import { useTabFilters } from './filters/useTabFilters';
import { useTenantCheckpoints } from './hooks/useTenantCheckpoints';
import { useDashboardActions } from './hooks/useDashboardActions';
import { useTenantDashboard } from './hooks/useTenantDashboard';
import { useTenantStaff } from './hooks/useTenantStaff';
import { useDashboardStore } from '../store/useDashboardStore';
import { useModalStore } from '../store/useModalStore';
import { DashboardSpinner } from '../../common/interfaces/components/DashboardUI';
import { ActiveTab } from './types';
import type { DashboardActions, DashboardState } from './DashboardTabManager';

type DashboardMessage = { text: string; type: 'success' | 'error' };
type PageMeta = { zone: string; title: string; subtitle: string; icon: React.ReactNode; actionLabel?: string };

const PAGE_META: Record<ActiveTab, PageMeta> = {
  overview: {
    zone: 'Việc cần xử lý',
    title: 'Việc cần xử lý',
    subtitle: 'Ưu tiên các thiếu sót cấu hình và ngoại lệ vận hành cần xử lý ngay, thay vì dàn trải nhiều module ngang hàng.',
    icon: <ShieldCheck size={22} />,
    actionLabel: 'Mở đối soát SLA',
  },
  sites: {
    zone: 'Thiết lập vận hành',
    title: 'Điểm & tuyến tuần tra',
    subtitle: 'Thiết lập site, chốt, checkpoint và route theo hợp đồng, nhưng vẫn ưu tiên nhìn thấy tín hiệu rủi ro site trước.',
    icon: <Search size={22} />,
  },
  vendors: {
    zone: 'Thiết lập vận hành',
    title: 'Nhà thầu & hợp đồng',
    subtitle: 'Quản lý nhà thầu, phạm vi hợp đồng, SLA và rule nghiệm thu trong một luồng quản trị gọn.',
    icon: <FileText size={22} />,
    actionLabel: 'Tạo contract',
  },
  violations: {
    zone: 'Giám sát tuân thủ',
    title: 'Tuân thủ dịch vụ',
    subtitle: 'Tập trung các thiếu quân, bỏ tuần tra, sai GPS và ngoại lệ cần review để đưa vào đối soát.',
    icon: <AlertTriangle size={22} />,
    actionLabel: 'Review vi phạm',
  },
  reports: {
    zone: 'Giám sát tuân thủ',
    title: 'Báo cáo nghiệm thu',
    subtitle: 'Tổng hợp scorecard, đề xuất phạt, bằng chứng và báo cáo nghiệm thu theo kỳ.',
    icon: <Download size={22} />,
    actionLabel: 'Xuất báo cáo',
  },
  staff: {
    zone: 'Thiết lập vận hành',
    title: 'Nhân sự bảo vệ',
    subtitle: 'Theo dõi nhân sự đang phục vụ phân ca, vendor, site và hợp đồng, tránh biến trang thành hồ sơ HR nặng.',
    icon: <ShieldCheck size={22} />,
    actionLabel: 'Thêm nhân sự',
  },
  tasks: {
    zone: 'Giám sát tuân thủ',
    title: 'Nhiệm vụ xử lý',
    subtitle: 'Theo dõi đầu việc phát sinh từ ngoại lệ vận hành, sự cố và đối soát cần đóng việc.',
    icon: <FileText size={22} />,
    actionLabel: 'Tạo nhiệm vụ',
  },
  incidents: {
    zone: 'Giám sát tuân thủ',
    title: 'Sự cố & SLA',
    subtitle: 'Ghi nhận, phân công và theo dõi sự cố cùng SLA xử lý, bằng chứng và trạng thái đóng việc.',
    icon: <AlertTriangle size={22} />,
    actionLabel: 'Tạo sự cố',
  },
  attendance: {
    zone: 'Thiết lập vận hành',
    title: 'Quân số & ca trực',
    subtitle: 'Kiểm soát đủ người, đúng giờ, đúng vị trí và các ngoại lệ theo ca/hợp đồng mà không làm mất ngữ cảnh đang xem.',
    icon: <CalendarDays size={22} />,
    actionLabel: 'Xuất ca',
  },
  audit: {
    zone: 'Giám sát tuân thủ',
    title: 'Kiểm tra đột xuất',
    subtitle: 'Tổ chức audit tại hiện trường, ghi nhận bằng chứng và đánh giá tuân thủ.',
    icon: <ShieldCheck size={22} />,
    actionLabel: 'Tạo audit',
  },
  attachments: {
    zone: 'Giám sát tuân thủ',
    title: 'Bằng chứng',
    subtitle: 'Tra cứu ảnh, video, tài liệu, biên bản và metadata phục vụ đối soát.',
    icon: <FileText size={22} />,
    actionLabel: 'Tải lên',
  },
  'market-growth': {
    zone: 'Hệ thống',
    title: 'Market Growth',
    subtitle: 'Theo dõi tín hiệu tăng trưởng và hiệu quả sử dụng nền tảng ở cấp hệ thống.',
    icon: <Search size={22} />,
  },
  'usage-analytics': {
    zone: 'Hệ thống',
    title: 'Phân tích sử dụng',
    subtitle: 'Đo adoption, tần suất thao tác và mức khai thác các module trọng yếu ở lớp hệ thống.',
    icon: <Search size={22} />,
  },
  subscription: {
    zone: 'Cấu hình',
    title: 'Gói dịch vụ',
    subtitle: 'Quản lý plan, entitlement và trạng thái dịch vụ của tenant.',
    icon: <FileText size={22} />,
  },
  settings: {
    zone: 'Cấu hình',
    title: 'Cài đặt',
    subtitle: 'Thiết lập tenant, phân quyền, cấu hình SLA và chính sách nền tảng.',
    icon: <ShieldCheck size={22} />,
  },
  help: {
    zone: 'Cấu hình',
    title: 'Hỗ trợ',
    subtitle: 'Tài liệu hướng dẫn, phản hồi sản phẩm và quy trình hỗ trợ vận hành.',
    icon: <FileText size={22} />,
  },
};

const ALLOWED_TABS: ActiveTab[] = [
  'overview',
  'sites',
  'vendors',
  'violations',
  'reports',
  'staff',
  'tasks',
  'incidents',
  'attendance',
  'audit',
  'attachments',
  'market-growth',
  'usage-analytics',
  'subscription',
  'settings',
  'help',
];

const LEGACY_ROUTE_MAP: Record<string, ActiveTab> = {
  dashboard: 'overview',
  overview: 'overview',
  vendors: 'vendors',
  vendor: 'vendors',
  contracts: 'vendors',
  attendance: 'attendance',
  shifts: 'attendance',
  staffing: 'attendance',
  staff: 'staff',
  guards: 'staff',
  sites: 'sites',
  patrols: 'sites',
  routes: 'sites',
  checkpoints: 'sites',
  violations: 'violations',
  compliance: 'violations',
  incidents: 'incidents',
  sla: 'incidents',
  reports: 'reports',
  scorecards: 'reports',
  audit: 'audit',
  attachments: 'attachments',
  evidence: 'attachments',
  files: 'attachments',
  tasks: 'tasks',
  settings: 'settings',
  subscription: 'subscription',
  billing: 'subscription',
  help: 'help',
  'market-growth': 'market-growth',
  'usage-analytics': 'usage-analytics',
};

function resolveTab(value: string | null | undefined): ActiveTab {
  if (!value) return 'overview';
  return LEGACY_ROUTE_MAP[value] ?? (ALLOWED_TABS.includes(value as ActiveTab) ? (value as ActiveTab) : 'overview');
}

function buildAdminTabPath(tab: ActiveTab): string {
  return tab === 'overview' ? '/admin/dashboard' : `/admin/${tab}`;
}

function getAdminRouteSegment(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'admin') return null;
  return segments[1] ?? null;
}

function getTabFromPath(pathname: string): ActiveTab {
  const segment = getAdminRouteSegment(pathname);
  return resolveTab(!segment ? 'overview' : segment);
}

function EnterprisePageChrome({
  activeTab,
  tenantName,
  isPro,
  isRefreshing,
  onRefresh,
  onPrimaryAction,
}: {
  activeTab: ActiveTab;
  tenantName: string;
  isPro: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void> | void;
  onPrimaryAction: () => void;
}) {
  const meta = PAGE_META[activeTab] ?? PAGE_META.overview;

  return (
    <div className="scmd-enterprise-header -mx-4 border-b border-slate-200/10 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="truncate">{tenantName}</span>
              <span>{isPro ? 'Enterprise SLA' : 'Free workspace'}</span>
              <span>{meta.zone}</span>
            </div>
            <h1 className="truncate text-[24px] font-bold tracking-[-0.02em] text-white">{meta.title}</h1>
            <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-slate-400">{meta.subtitle}</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {meta.actionLabel && (
              <button type="button" onClick={onPrimaryAction} className="ops-primary-action">
                <Plus size={15} /> {meta.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ops-filter-control disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Làm mới dữ liệu"
              title="Làm mới dữ liệu"
            >
              <RefreshCcw size={15} className={isRefreshing ? 'animate-spin' : undefined} />
              Làm mới
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}

export function TenantAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const legacyTabParam = searchParams.get('tab');
  const [message, setMessage] = useState<DashboardMessage | null>(null);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => resolveTab(getTabFromPath(location.pathname) ?? legacyTabParam));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [siteSubTab, setSiteSubTab] = useState<'manage' | 'benchmark' | 'field'>('manage');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dashboardState = useTenantDashboard(setMessage);
  const { tenantInfo, loading, fetchData } = dashboardState;
  const checkpointActions = useTenantCheckpoints(fetchData, setMessage);
  const staffActions = useTenantStaff(
    fetchData,
    setMessage,
    dashboardState.staffFilters,
    dashboardState.setStaffFilters,
  );
  const dashboardActions = useDashboardActions(setMessage);

  const {
    setShowConfirmModal,
    setSelectedMapPoint,
    setSelectedLog,
    setShowQRModal,
  } = useModalStore();

  const dashboardStoreTenantInfo = useDashboardStore((state) => state.tenantInfo);
  const dashboardStoreIsPro = useDashboardStore((state) => state.isPro);
  const setDashboardHandleUpgrade = useDashboardStore((state) => state.setHandleUpgrade);
  const setDashboardSubmitting = useDashboardStore((state) => state.setIsSubmitting);
  const setShowUpgradeModal = useDashboardStore((state) => state.setShowUpgradeModal);

  const resolvedTenantInfo = dashboardStoreTenantInfo ?? tenantInfo;
  const tenantName = resolvedTenantInfo?.name || 'SCMD PRO Workspace';
  const isPro = dashboardStoreIsPro || resolvedTenantInfo?.subscriptionPlan === 'PRO' || resolvedTenantInfo?.subscriptionPlan === 'ENTERPRISE';
  const pathTab = getTabFromPath(location.pathname);
  const routedActiveTab = resolveTab(pathTab === 'overview' && legacyTabParam ? legacyTabParam : pathTab);
  const filterSources = useMemo(() => {
    const toOption = (value: unknown, label: unknown) => {
      const id = String(value ?? '').trim();
      const text = String(label ?? '').trim();
      return id && text ? { value: id, label: text } : null;
    };

    const siteMap = new Map<string, string>();
    const vendorMap = new Map<string, string>();
    const contractMap = new Map<string, string>();
    const staffMap = new Map<string, string>();

    const register = (map: Map<string, string>, value: unknown, label: unknown) => {
      const option = toOption(value, label);
      if (option && !map.has(option.value)) map.set(option.value, option.label);
    };

    (dashboardState.staff ?? []).forEach((member: any) => {
      register(staffMap, member?.id ?? member?.staffId, member?.fullName ?? member?.name ?? member?.email);
      register(siteMap, member?.assignedSiteId, member?.assignedSiteName ?? member?.siteName);
      register(vendorMap, member?.assignedVendorId, member?.assignedVendorName ?? member?.vendorName);
      register(contractMap, member?.assignedContractId, member?.assignedContractCode ?? member?.contractCode);
    });

    (dashboardState.checkpoints ?? []).forEach((checkpoint: any) => {
      register(siteMap, checkpoint?.siteId ?? checkpoint?.site?.id, checkpoint?.siteName ?? checkpoint?.site?.siteName ?? checkpoint?.site?.name);
      register(contractMap, checkpoint?.contractId ?? checkpoint?.contract?.id, checkpoint?.contractCode ?? checkpoint?.contract?.contractCode);
      register(vendorMap, checkpoint?.vendorId ?? checkpoint?.vendor?.id, checkpoint?.vendorName ?? checkpoint?.vendor?.name);
    });

    (dashboardState.routes ?? []).forEach((route: any) => {
      register(siteMap, route?.siteId ?? route?.site?.id, route?.siteName ?? route?.site?.siteName ?? route?.site?.name);
      register(contractMap, route?.contractId ?? route?.contract?.id, route?.contractCode ?? route?.contract?.contractCode);
      register(vendorMap, route?.vendorId ?? route?.vendor?.id, route?.vendorName ?? route?.vendor?.name);
    });

    return {
      sites: Array.from(siteMap, ([value, label]) => ({ value, label })),
      vendors: Array.from(vendorMap, ([value, label]) => ({ value, label })),
      contracts: Array.from(contractMap, ([value, label]) => ({ value, label })),
      staff: Array.from(staffMap, ([value, label]) => ({ value, label })),
    };
  }, [dashboardState.staff, dashboardState.checkpoints, dashboardState.routes]);
  const filterConfig = useMemo(() => getTabFilterConfig(routedActiveTab, filterSources), [routedActiveTab, filterSources]);
  const filterState = useTabFilters(routedActiveTab, filterConfig);
  const contextualFilters = filterState.debouncedValues;
  const suppressPageChrome = routedActiveTab === 'vendors';

  const allowedTabs = useMemo(() => new Set(ALLOWED_TABS), []);

  useEffect(() => {
    const routeSegment = getAdminRouteSegment(location.pathname);
    const pathTab = getTabFromPath(location.pathname);

    if (routeSegment && routeSegment !== 'dashboard' && !allowedTabs.has(routeSegment as ActiveTab)) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }

    const nextTab = resolveTab(pathTab === 'overview' && legacyTabParam ? legacyTabParam : pathTab);
    if (pathTab === 'overview' && legacyTabParam && nextTab !== 'overview') {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('tab');
      const queryString = nextParams.toString();
      navigate(`${buildAdminTabPath(nextTab)}${queryString ? `?${queryString}` : ''}`, { replace: true });
      return;
    }

    if (nextTab !== activeTab) setActiveTabState(nextTab);
  }, [activeTab, allowedTabs, legacyTabParam, location.pathname, location.search, navigate]);

  const setActiveTab = (tab: ActiveTab, options?: { priorityOnly?: boolean; focusId?: string; focusType?: string }) => {
    if (!allowedTabs.has(tab)) return;

    const nextParams = new URLSearchParams();

    if (tab === 'incidents' && options?.priorityOnly) nextParams.set('priorityOnly', 'true');
    else nextParams.delete('priorityOnly');

    if (options?.focusId) {
      nextParams.set('focusId', options.focusId);
      if (options.focusType) nextParams.set('focusType', options.focusType);
      else nextParams.delete('focusType');
    } else {
      nextParams.delete('focusId');
      nextParams.delete('focusType');
    }

    const queryString = nextParams.toString();
    navigate(`${buildAdminTabPath(tab)}${queryString ? `?${queryString}` : ''}`, { replace: false });
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const autoRefreshEnabled = routedActiveTab === 'overview';

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(async () => {
      await refreshData();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, refreshData]);

  const handlePrimaryAction = () => {
    if (routedActiveTab === 'incidents') {
      setActiveTab('incidents', { priorityOnly: true });
    } else if (routedActiveTab === 'reports') {
      dashboardActions.handleExportWatcherReport?.();
    } else if (routedActiveTab === 'overview') {
      setActiveTab('reports');
    } else if (routedActiveTab === 'staff') {
      // Action 1: Gửi tín hiệu mở drawer cho StaffTab thông qua URL
      const nextParams = new URLSearchParams(location.search);
      nextParams.set('action', 'add-staff');
      navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
    }
  };

  const combinedState = {
    ...dashboardState,
    ...checkpointActions,
    ...staffActions,
    ...dashboardActions,
    siteSubTab,
    isPro,
  } as unknown as DashboardState;

  const combinedActions = {
    ...checkpointActions,
    ...staffActions,
    ...dashboardActions,
    setActiveTab,
    setSiteSubTab,
    setSelectedMapPoint,
    setSelectedLog,
    onViewStaff: staffActions.setSelectedStaffDetail,
    setShowConfirmModal,
    setShowQRModal,
    setMessage,
    refreshData,
  } as unknown as DashboardActions;

  useEffect(() => {
    setDashboardHandleUpgrade(async (plan: string) => {
      setDashboardSubmitting(true);
      try {
        await apiFetch('/api/tenant/upgrade-request', {
          method: 'POST',
          body: JSON.stringify({ plan }),
        });
        await refreshData();
        setShowUpgradeModal(false);
        setMessage({ text: 'Đã gửi yêu cầu nâng cấp. Hệ thống đang chờ phê duyệt.', type: 'success' });
      } catch (err: any) {
        setMessage({ text: err?.message || 'Gửi yêu cầu nâng cấp thất bại.', type: 'error' });
      } finally {
        setDashboardSubmitting(false);
      }
    });

    return () => {
      setDashboardHandleUpgrade(() => {});
      setDashboardSubmitting(false);
    };
  }, [fetchData, setDashboardHandleUpgrade, setDashboardSubmitting, setShowUpgradeModal]);

  return (
    <>
      <DashboardModals
        handleDeleteCheckpoint={checkpointActions.handleDeleteCheckpoint}
        handleDeleteStaff={staffActions.handleDeleteStaff}
        handleDeleteRoute={checkpointActions.handleDeleteRoute}
        setActiveTab={setActiveTab}
        handleAnalyzeLog={async (id: string) => { console.log('Analyze log:', id); }}
      />

      <div className="scmd-enterprise-shell relative flex h-screen overflow-hidden bg-slate-950">
        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Đóng menu điều hướng"
            className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <DashboardSidebar
          activeTab={routedActiveTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          tenantInfo={resolvedTenantInfo}
          loading={loading}
          isPro={isPro}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="relative flex-1 overflow-y-auto bg-transparent p-4 pt-20 no-scrollbar sm:p-6 lg:p-8 lg:pt-0">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/10 bg-slate-900/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-all active:scale-95 md:hidden"
            aria-label="Mở menu điều hướng dashboard"
            aria-expanded={isMobileSidebarOpen}
          >
            <Menu size={20} />
          </button>

          {loading ? (
            <DashboardSpinner message="Đang tải command center..." fullHeight />
          ) : (
            <>
              {!suppressPageChrome ? (
                <div className="sticky top-0 z-40">
                  <EnterprisePageChrome
                    activeTab={routedActiveTab}
                    tenantName={tenantName}
                    isPro={isPro}
                    isRefreshing={isRefreshing}
                    onRefresh={refreshData}
                    onPrimaryAction={handlePrimaryAction}
                  />
                  {filterConfig ? (
                  <div className="-mx-4 border-b border-slate-200/10 bg-slate-950/82 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="mx-auto max-w-[1500px]">
                      <ContextFilterBar
                        config={filterConfig}
                        state={filterState}
                        onRefresh={refreshData}
                      />
                    </div>
                  </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mx-auto max-w-[1500px] animate-in fade-in duration-200 py-5 pb-20">
                <DashboardTabManager
                  activeTab={routedActiveTab}
                  isPro={isPro}
                  state={combinedState}
                  actions={combinedActions}
                  contextualFilters={contextualFilters}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {message && (
        <div className="fixed bottom-8 right-8 z-[500] animate-in slide-in-from-right-10">
          <div className={cn(
            'flex items-center gap-3 rounded-[14px] border px-5 py-3 text-xs font-semibold shadow-2xl backdrop-blur-xl',
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300',
          )}>
            <div className={cn('h-2 w-2 rounded-full', message.type === 'success' ? 'bg-emerald-400' : 'bg-red-400')} />
            {message.text}
          </div>
        </div>
      )}
    </>
  );
}

export default TenantAdminDashboard;
