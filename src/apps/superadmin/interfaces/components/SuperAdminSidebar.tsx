import React from 'react';
import {
  Activity,
  Building2,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { SCMDLogo } from '../../../common/interfaces/components/SCMDLogo';

type SuperAdminTab =
  | 'overview'
  | 'tenants'
  | 'feature-flags'
  | 'billing'
  | 'news'
  | 'upgrades'
  | 'permissions'
  | 'slo'
  | 'market-growth'
  | 'usage-analytics';

interface SuperAdminSidebarProps {
  activeTab: SuperAdminTab;
  setActiveTab: (tab: SuperAdminTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (v: boolean) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  pendingUpgradeCount?: number;
}

type NavItem = {
  tab: SuperAdminTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

function NavSection({
  title,
  items,
  activeTab,
  collapsed,
  onSelect,
}: {
  title: string;
  items: NavItem[];
  activeTab: SuperAdminTab;
  collapsed: boolean;
  onSelect: (tab: SuperAdminTab) => void;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </p>
      )}
      {items.map((item) => {
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
            {active && (
              <span className="absolute left-0 h-5 w-0.5 rounded-full bg-blue-400" />
            )}
            <span
              className={cn(
                'relative shrink-0 transition-colors',
                active ? 'text-blue-300' : 'text-slate-500 group-hover:text-blue-300',
              )}
            >
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                  {item.badge}
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {item.badge}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isMobileOpen = false,
  onCloseMobile,
  pendingUpgradeCount = 0,
}) => {
  const { user, logout } = useAuth();

  const handleSelect = (tab: SuperAdminTab) => {
    setActiveTab(tab);
    onCloseMobile?.();
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const coreItems: NavItem[] = [
    { tab: 'overview', label: 'Business Radar', icon: <LayoutDashboard size={17} /> },
    { tab: 'tenants', label: 'Khách hàng', icon: <Building2 size={17} /> },
    { tab: 'upgrades', label: 'Yêu cầu Nâng cấp', icon: <TrendingUp size={17} />, badge: pendingUpgradeCount },
  ];

  const configItems: NavItem[] = [
    { tab: 'feature-flags', label: 'Feature Flags', icon: <ShieldCheck size={17} /> },
    { tab: 'billing', label: 'Billing & Thanh toán', icon: <Database size={17} /> },
    { tab: 'news', label: 'Quản lý Tin tức', icon: <Newspaper size={17} /> },
    { tab: 'permissions', label: 'Phân quyền Vai trò', icon: <ShieldCheck size={17} /> },
  ];

  const monitorItems: NavItem[] = [
    { tab: 'slo', label: 'Service SLO Monitor', icon: <Activity size={17} /> },
    { tab: 'market-growth', label: 'Tăng trưởng thị trường', icon: <TrendingUp size={17} /> },
    { tab: 'usage-analytics', label: 'Phân tích sử dụng', icon: <Zap size={17} /> },
  ];

  return (
    <aside
      aria-label="Điều hướng Super Admin"
      className={cn(
        'fixed inset-y-0 left-0 z-[80] flex w-[min(18rem,calc(100vw-1.25rem))] shrink-0 flex-col border-r border-slate-200/10 bg-[#080d1b]/92 text-white shadow-[18px_0_44px_rgba(2,6,23,0.20)] backdrop-blur-xl transition-transform duration-200 md:relative md:inset-auto md:z-30 md:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        isSidebarCollapsed ? 'md:w-20' : 'md:w-72',
      )}
    >
      {/* Header */}
      <div className={cn('border-b border-white/8 p-4', isSidebarCollapsed && 'px-3')}>
        <div className={cn('flex items-center gap-3', isSidebarCollapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px]">
            {isSidebarCollapsed ? (
              <SCMDLogo variant="icon-only" size="sidebar" />
            ) : (
              <SCMDLogo variant="dark" size="sidebar" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold tracking-[-0.02em] text-white">SCMD PRO</p>
              <p className="truncate text-[12px] font-medium text-slate-400">Hệ thống Quản trị</p>
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
            <ChevronRight
              size={15}
              className={cn('transition-transform duration-200', !isSidebarCollapsed && 'rotate-180')}
            />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate text-slate-400">
              Super Admin · {user?.name || 'SCMD Operator'}
            </span>
            <span className="shrink-0 rounded-full border border-sky-400/15 bg-sky-400/10 px-2 py-0.5 font-semibold text-sky-300">
              Platform
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <NavSection
          title="Tổng quan"
          items={coreItems}
          activeTab={activeTab}
          collapsed={isSidebarCollapsed}
          onSelect={handleSelect}
        />
        <NavSection
          title="Cấu hình hệ thống"
          items={configItems}
          activeTab={activeTab}
          collapsed={isSidebarCollapsed}
          onSelect={handleSelect}
        />
        <NavSection
          title="Tình báo"
          items={monitorItems}
          activeTab={activeTab}
          collapsed={isSidebarCollapsed}
          onSelect={handleSelect}
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-white/8 p-4">
        {!isSidebarCollapsed && (
          <div className="mb-3 rounded-[10px] bg-white/5 px-4 py-3 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-bold uppercase text-slate-400">Trạng thái hệ thống</span>
            </div>
            <p className="mt-1 font-medium text-slate-300">Tất cả các trạm đang hoạt động</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-[10px] border border-red-400/15 bg-red-400/5 px-3 text-[13px] font-semibold text-red-300 transition-colors hover:bg-red-400/10',
            isSidebarCollapsed && 'justify-center px-0',
          )}
          title="Kết thúc phiên làm việc"
        >
          <LogOut size={17} />
          {!isSidebarCollapsed && <span>Kết thúc phiên làm việc</span>}
        </button>
      </div>
    </aside>
  );
};
