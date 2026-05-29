import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileBarChart2,
  FolderArchive,
  HelpCircle,
  LogOut,
  MapPinned,
  Menu,
  ReceiptText,
  Route,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../common/store/useAuthStore';
import { ActiveTab } from './types';

interface DashboardSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (v: boolean) => void;
  tenantInfo: { name: string; plan?: string; subscriptionPlan?: string; resolvedFeatures?: Record<string, boolean> } | null;
  loading: boolean;
  isPro: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

type NavItem = {
  tab: ActiveTab;
  label: string;
  icon: React.ReactNode;
  visible?: boolean;
};

const roleLabelMap: Record<string, string> = {
  'super-admin': 'Super Admin',
  'tenant-admin': 'Quản trị dịch vụ',
  supervisor: 'Giám sát',
  guard: 'Bảo vệ',
  technician: 'Kỹ thuật',
  'vendor-commander': 'Chỉ huy nhà thầu',
};

function SidebarSection({
  title,
  items,
  activeTab,
  collapsed,
  onSelect,
}: {
  title: string;
  items: NavItem[];
  activeTab: ActiveTab;
  collapsed: boolean;
  onSelect: (tab: ActiveTab) => void;
}) {
  const visibleItems = items.filter((item) => item.visible !== false);
  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </p>
      )}
      {visibleItems.map((item) => {
        const active = activeTab === item.tab;
        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => onSelect(item.tab)}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              'group relative flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors',
              collapsed && 'justify-center px-0',
              active
                ? 'border border-blue-500/20 bg-blue-500/10 text-white'
                : 'text-slate-400 hover:bg-white/[0.045] hover:text-slate-100',
            )}
          >
            {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-blue-400" />}
            <span className={cn('shrink-0 transition-colors', active ? 'text-blue-300' : 'text-slate-500 group-hover:text-blue-300')}>
              {item.icon}
            </span>
            {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  tenantInfo,
  isPro,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, clearAuth, user } = useAuthStore();

  const tenantName = tenantInfo?.name || 'SCMD PRO';
  const planLabel = isPro ? 'Enterprise SLA' : 'Free';
  const roleLabel = roleLabelMap[role || ''] || 'Người quản trị';
  const userName = user?.name || user?.staffId || 'SCMD Operator';

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/';
  };

  const actionItems: NavItem[] = [
    { tab: 'overview', label: 'Việc cần xử lý', icon: <ClipboardCheck size={17} /> },
  ];

  const setupItems: NavItem[] = [
    { tab: 'vendors', label: 'Nhà thầu & hợp đồng', icon: <Building2 size={17} /> },
    { tab: 'attendance', label: 'Quân số & ca trực', icon: <CalendarClock size={17} /> },
    { tab: 'staff', label: 'Nhân sự bảo vệ', icon: <Users size={17} /> },
    { tab: 'sites', label: 'Điểm & tuyến tuần tra', icon: <Route size={17} /> },
  ];

  const complianceItems: NavItem[] = [
    { tab: 'violations', label: 'Tuân thủ dịch vụ', icon: <ShieldCheck size={17} /> },
    { tab: 'incidents', label: 'Sự cố & SLA', icon: <AlertTriangle size={17} /> },
    { tab: 'reports', label: 'Báo cáo nghiệm thu', icon: <FileBarChart2 size={17} /> },
    { tab: 'audit', label: 'Kiểm tra đột xuất', icon: <UserRoundCheck size={17} /> },
    { tab: 'attachments', label: 'Bằng chứng', icon: <FolderArchive size={17} /> },
    { tab: 'tasks', label: 'Nhiệm vụ xử lý', icon: <ClipboardCheck size={17} /> },
  ];

  const configItems: NavItem[] = [
    { tab: 'settings', label: 'Cài đặt', icon: <Settings size={17} /> },
    { tab: 'subscription', label: 'Gói dịch vụ', icon: <ReceiptText size={17} /> },
    { tab: 'help', label: 'Hỗ trợ', icon: <HelpCircle size={17} /> },
  ];

  return (
    <aside
      aria-label="Điều hướng SCMD PRO"
      className={cn(
        'fixed inset-y-0 left-0 z-[80] flex w-[min(18rem,calc(100vw-1.25rem))] shrink-0 flex-col border-r border-slate-200/10 bg-[#080d1b]/88 text-white shadow-[18px_0_44px_rgba(2,6,23,0.20)] backdrop-blur-xl transition-transform duration-200 md:relative md:inset-auto md:z-30 md:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        isSidebarCollapsed ? 'md:w-20' : 'md:w-72',
      )}
    >
      <div className={cn('border-b border-white/8 p-4', isSidebarCollapsed && 'px-3')}>
        <div className={cn('flex items-center gap-3', isSidebarCollapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)]">
            <MapPinned size={21} />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-[17px] font-bold tracking-[-0.02em] text-white">SCMD PRO</p>
              <p className="truncate text-[12px] font-medium text-slate-400">{tenantName}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              'ml-auto hidden h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white md:flex',
              isSidebarCollapsed && 'ml-0',
            )}
            aria-label={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <Menu size={15} />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-slate-400">{roleLabel} · {userName}</span>
            <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-300">
              {planLabel}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
        <SidebarSection title="Việc cần xử lý" items={actionItems} activeTab={activeTab} collapsed={isSidebarCollapsed} onSelect={handleSelect} />
        <SidebarSection title="Thiết lập vận hành" items={setupItems} activeTab={activeTab} collapsed={isSidebarCollapsed} onSelect={handleSelect} />
        <SidebarSection title="Giám sát tuân thủ" items={complianceItems} activeTab={activeTab} collapsed={isSidebarCollapsed} onSelect={handleSelect} />
        <SidebarSection title="Cấu hình" items={configItems} activeTab={activeTab} collapsed={isSidebarCollapsed} onSelect={handleSelect} />

        {role === 'super-admin' && (
          <SidebarSection
            title="Hệ thống"
            items={[
              { tab: 'market-growth', label: 'Tăng trưởng', icon: <BarChart3 size={17} /> },
              { tab: 'usage-analytics', label: 'Phân tích sử dụng', icon: <BarChart3 size={17} /> },
            ]}
            activeTab={activeTab}
            collapsed={isSidebarCollapsed}
            onSelect={handleSelect}
          />
        )}
      </nav>

      <div className="border-t border-white/8 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-[10px] border border-red-400/15 bg-red-400/5 px-3 text-[13px] font-semibold text-red-300 transition-colors hover:bg-red-400/10',
            isSidebarCollapsed && 'justify-center px-0',
          )}
          title="Đăng xuất"
        >
          <LogOut size={17} />
          {!isSidebarCollapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

