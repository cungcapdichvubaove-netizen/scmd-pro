import React from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  MapPin,
  Users,
  BarChart3,
  AlertCircle,
  ClipboardList,
  BrainCircuit,
  CreditCard,
  HelpCircle,
  Settings,
  ChevronRight,
  LogOut,
  Zap,
  FileSearch,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ActiveTab } from './types';
import { SCMDLogo } from '../../common/interfaces/components/SCMDLogo';
import { SCMDTooltip } from '../../common/interfaces/components/SCMDTooltip';

// ─── NavItem ─── //
const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
}> = ({ active, onClick, icon, label, badge, collapsed }) => {
  const content = (
    <motion.button
      whileHover={{ x: active ? 4 : 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-scmd-md font-black text-[11px] uppercase tracking-widest transition-colors duration-300 relative',
        active
          ? 'bg-scmd-primary text-white shadow-lg shadow-scmd-primary/20'
          : 'text-scmd-silver/60 hover:bg-white/5 hover:text-white',
      )}
    >
      <span className={cn('transition-transform duration-300', active && 'scale-110')}>{icon}</span>
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {badge && !collapsed && (
        <span
          className={cn(
            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md',
            active ? 'bg-scmd-navy text-scmd-cyber' : 'bg-scmd-cyber text-white',
          )}
        >
          {badge}
        </span>
      )}
    </motion.button>
  );

  if (collapsed) {
    return (
      <SCMDTooltip content={label} position="right">
        {content}
      </SCMDTooltip>
    );
  }

  return content;
};

// ─── Props ─── //
interface DashboardHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (v: boolean) => void;
  tenantInfo: any;
  loading: boolean;
  isPro: boolean;
}

export const DashboardSidebar: React.FC<DashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  tenantInfo,
  // loading, // unused
  isPro,
}) => {
  const navContainerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const navItemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  return (
    <aside
      className={cn(
        'bg-scmd-surface text-white flex flex-col shrink-0 border-r border-white/5 transition-all duration-500 relative z-30 shadow-2xl shadow-black/50',
        isSidebarCollapsed ? 'w-20' : 'w-72',
      )}
    >
      {/* Logo */}
      <div className="p-8 flex items-center justify-between overflow-hidden">
        {!isSidebarCollapsed && (
          <div className="flex flex-col animate-in fade-in duration-500">
            <SCMDLogo variant="dark" size="md" />
            <p className="text-[9px] text-scmd-silver/60 uppercase font-black tracking-[0.2em] mt-2 ml-[48px]">
              Enterprise v2.8
            </p>
          </div>
        )}
        {isSidebarCollapsed && (
          <div className="mx-auto">
            <SCMDLogo variant="icon-only" size="md" />
          </div>
        )}

        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            'absolute -right-3 top-12 w-6 h-6 bg-scmd-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-40 border-2 border-scmd-navy',
            isSidebarCollapsed && 'rotate-180',
          )}
        >
          <ChevronRight size={14} strokeWidth={3} />
        </button>
      </div>

      {/* Nav */}
      <motion.nav
        variants={navContainerVariants}
        initial="initial"
        animate="animate"
        className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar"
      >
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<LayoutDashboard size={20} />}
            label="Tổng quan"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            icon={<ShieldAlert size={20} />}
            label="Kiểm tra đột xuất"
            badge="NEW"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'incidents'}
            onClick={() => setActiveTab('incidents')}
            icon={<AlertCircle size={20} />}
            label="Sự cố"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
            icon={<ClipboardList size={20} />}
            label="Nhiệm vụ"
          />
        </motion.div>

        {!isSidebarCollapsed && (
          <motion.p variants={navItemVariants} className="px-4 pt-6 pb-2 text-[9px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">
            Vận hành
          </motion.p>
        )}
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'sites'}
            onClick={() => setActiveTab('sites')}
            icon={<MapPin size={20} />}
            label="Mục tiêu & Site"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'attendance'}
            onClick={() => setActiveTab('attendance')}
            icon={<BarChart3 size={20} />}
            label="Chấm công"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'attachments'}
            onClick={() => setActiveTab('attachments')}
            icon={<FileSearch size={20} />}
            label="Tài nguyên & Evidence"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'staff'}
            onClick={() => setActiveTab('staff')}
            icon={<Users size={20} />}
            label="Quân số"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'vendors'}
            onClick={() => setActiveTab('vendors')}
            icon={<Zap size={20} />}
            label="Nhà thầu & SLA"
          />
        </motion.div>

        {!isSidebarCollapsed && (
          <motion.p variants={navItemVariants} className="px-4 pt-6 pb-2 text-[9px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">
            Giám sát
          </motion.p>
        )}
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'violations'}
            onClick={() => setActiveTab('violations')}
            icon={<BrainCircuit size={20} />}
            label="AI Watcher"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            icon={<BarChart3 size={20} />}
            label="Báo cáo"
          />
        </motion.div>

        {!isSidebarCollapsed && (
          <motion.p variants={navItemVariants} className="px-4 pt-6 pb-2 text-[9px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">
            Intelligence
          </motion.p>
        )}
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'market-growth'}
            onClick={() => setActiveTab('market-growth')}
            icon={<Zap size={20} />}
            label="Market Growth"
            badge="AI"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'usage-analytics'}
            onClick={() => setActiveTab('usage-analytics')}
            icon={<BarChart3 size={20} />}
            label="Usage Analytics"
          />
        </motion.div>

        {!isSidebarCollapsed && (
          <motion.p variants={navItemVariants} className="px-4 pt-6 pb-2 text-[9px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">
            Tài khoản
          </motion.p>
        )}
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings size={20} />}
            label="Cài đặt hệ thống"
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'subscription'}
            onClick={() => setActiveTab('subscription')}
            icon={<CreditCard size={20} />}
            label="Billing & Plan"
            badge={isPro ? 'PRO' : undefined}
          />
        </motion.div>
        <motion.div variants={navItemVariants}>
          <NavItem
            collapsed={isSidebarCollapsed}
            active={activeTab === 'help'}
            onClick={() => setActiveTab('help')}
            icon={<HelpCircle size={20} />}
            label="Trợ giúp"
          />
        </motion.div>
      </motion.nav>

      {/* Tenant info footer */}
      {!isSidebarCollapsed && tenantInfo && (
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-3 p-4 bg-scmd-navy/50 rounded-2xl border border-white/5">
            <div className="w-10 h-10 bg-scmd-primary/20 rounded-xl flex items-center justify-center text-scmd-primary">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{tenantInfo.name}</p>
              <p className="text-[9px] text-scmd-silver/40 uppercase font-bold tracking-widest">
                {isPro ? 'SCMD PRO' : 'SCMD FREE'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-4 pb-6">
        <NavItem
          collapsed={isSidebarCollapsed}
          active={false}
          onClick={() => {
            localStorage.removeItem('scmd_jwt');
            localStorage.removeItem('scmd_user_role');
            window.location.href = '/';
          }}
          icon={<LogOut size={20} />}
          label="Đăng xuất"
        />
      </div>
    </aside>
  );
};
