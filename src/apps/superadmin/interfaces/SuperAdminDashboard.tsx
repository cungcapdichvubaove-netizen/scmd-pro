import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  Building2, 
  LogOut,
  Sparkles,
  Loader2,
  Globe,
  Bug,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  Database,
  ShieldCheck,
  RefreshCw,
  Users,
  Phone,
  MapPin,
  ExternalLink,
  User,
  CheckCircle2,
  Menu
} from 'lucide-react';
import { suggestSubdomain } from '../../../services/ai-proxy.service';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';
import { NewsManagement } from './components/NewsManagement';
import { TenantOverview } from './components/TenantOverview';
import { TenantList } from './components/TenantList';
import { BillingManagementTab } from '../billing/BillingManagementTab.js';
import { RolePermissionManagement } from './components/RolePermissionManagement';
import { FeatureFlagManager } from './components/FeatureFlagManager';
import { SuperAdminSidebar } from './components/SuperAdminSidebar';

// Lazy load monitoring components
const SLOMonitorTab = lazy(() => import('./components/SLOMonitorTab').then(m => ({ default: m.SLOMonitorTab })));
const MarketGrowthTab = lazy(() => import('../../security/interfaces/MarketGrowthTab').then(m => ({ default: m.MarketGrowthTab })));
const UsageAnalyticsTab = lazy(() => import('../../security/interfaces/UsageAnalyticsTab').then(m => ({ default: m.UsageAnalyticsTab })));
import { SuperAdminStats } from '../../../server/domain/entities';
import { useAuth } from '../../../context/AuthContext';
import { DashboardPageHeading, DashboardSpinner } from '../../common/interfaces/components/DashboardUI';
import { EmptyState } from './components/EmptyState';

type ConfirmModalState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
} | null;

type ResetPasswordModalState = 'idle' | 'loading' | 'success';
type SuperAdminTab = 'overview' | 'tenants' | 'feature-flags' | 'billing' | 'news' | 'upgrades' | 'permissions' | 'slo' | 'market-growth' | 'usage-analytics';

const SUPER_ADMIN_TABS: SuperAdminTab[] = ['overview', 'tenants', 'feature-flags', 'billing', 'news', 'upgrades', 'permissions', 'slo', 'market-growth', 'usage-analytics'];

const PAGE_META: Record<SuperAdminTab, { title: string; subtitle: string }> = {
  overview:          { title: 'Business Radar', subtitle: 'Toàn cảnh hoạt động hệ thống' },
  tenants:           { title: 'Khách hàng', subtitle: 'Quản lý danh sách tenant' },
  'feature-flags':   { title: 'Feature Flags', subtitle: 'Cấu hình tính năng theo tenant' },
  billing:           { title: 'Billing & Thanh toán', subtitle: 'Quản lý gói cước và giao dịch' },
  news:              { title: 'Quản lý Tin tức', subtitle: 'Xuất bản và chỉnh sửa nội dung' },
  upgrades:          { title: 'Yêu cầu Nâng cấp', subtitle: 'Duyệt các yêu cầu nâng cấp gói' },
  permissions:       { title: 'Phân quyền Vai trò', subtitle: 'Cấu hình quyền truy cập hệ thống' },
  slo:               { title: 'Service SLO Monitor', subtitle: 'Giám sát chỉ số dịch vụ' },
  'market-growth':   { title: 'Tăng trưởng thị trường', subtitle: 'Phân tích xu hướng tăng trưởng' },
  'usage-analytics': { title: 'Phân tích mức độ sử dụng', subtitle: 'Thống kê hoạt động người dùng' },
};

const resolveSuperAdminTab = (tab: string | null): SuperAdminTab => {
  return SUPER_ADMIN_TABS.includes(tab as SuperAdminTab) ? (tab as SuperAdminTab) : 'overview';
};

const generateStrongPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const symbols = '!@#$%^&*';
  const cryptoSource = window.crypto;
  const randomValues = new Uint32Array(18);
  cryptoSource.getRandomValues(randomValues);

  const body = Array.from(randomValues, (value, index) => {
    const source = index % 5 === 0 ? symbols : alphabet;
    return source[value % source.length];
  }).join('');

  return `Scmd-${body}`;
};

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  plan: string;
  subscriptionPlan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  maxEmployees: number;
  status: string;
  expiry_date: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerName?: string;
  features_enabled: Record<string, boolean>;
  provisioning_status?: 'queued' | 'cloning_schema' | 'generating_ssl' | 'running_health_checks' | 'active';
  ssl_enabled?: boolean;
  health_check?: {
    tables_initialized: boolean;
    dns_resolved: boolean;
    ssl_valid: boolean;
    timestamp: string;
  };
}

// ----- PageChrome: sticky header with backdrop -----
const PageChrome: React.FC<{ tab: SuperAdminTab; user: { name?: string; staffId?: string } | null }> = ({ tab, user }) => {
  const meta = PAGE_META[tab];
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-6 py-4 pl-20 backdrop-blur-md md:px-10 md:pl-10">
      <div className="min-w-0 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-400/20 shadow-lg shadow-sky-500/10 shrink-0">
          <User size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-white tracking-tight uppercase truncate">
              {meta.title}
            </p>
            <span className="px-2.5 py-1 bg-sky-500/15 text-sky-300 text-[11px] leading-none font-black uppercase tracking-wider rounded-md border border-sky-400/30 whitespace-nowrap">
              {user?.name || 'Super Admin'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">{meta.subtitle}</p>
        </div>
      </div>
      <div className="hidden md:flex items-center" aria-label="Đang hoạt động">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      </div>
    </header>
  );
};

// ----- Modals -----
const ConfirmModal: React.FC<{
  state: ConfirmModalState;
  onClose: () => void;
}> = ({ state, onClose }) => {
  useEffect(() => {
    if (!state) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/90 p-4" role="presentation">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="superadmin-confirm-title"
        aria-describedby="superadmin-confirm-description"
      >
        <div className="p-6">
          <div className="mb-5 flex items-start gap-4">
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              state.danger ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-sky-500/20 bg-sky-500/10 text-sky-400',
            )}>
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="superadmin-confirm-title" className="text-lg font-black tracking-tight text-white">
                {state.title}
              </h3>
              <p id="superadmin-confirm-description" className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                {state.message}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => { state.onConfirm(); onClose(); }}
              className={cn(
                'flex-1 rounded-xl px-4 py-2.5 text-sm font-black text-white transition-all focus:outline-none focus:ring-2',
                state.danger
                  ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500/30'
                  : 'bg-sky-600 hover:bg-sky-500 focus:ring-sky-500/30',
              )}
            >
              {state.confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ResetPasswordModal: React.FC<{
  isOpen: boolean;
  tenantId: string | null;
  passwordValue: string;
  status: ResetPasswordModalState;
  error: string | null;
  successPassword: string | null;
  onPasswordChange: (value: string) => void;
  onGeneratePassword: () => void;
  onConfirm: () => void;
  onClose: () => void;
}> = ({
  isOpen,
  tenantId,
  passwordValue,
  status,
  error,
  successPassword,
  onPasswordChange,
  onGeneratePassword,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status !== 'loading') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, status]);

  if (!isOpen) return null;

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const displayedPassword = successPassword || passwordValue;

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/90 p-4" role="presentation">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="superadmin-reset-password-title"
        aria-describedby="superadmin-reset-password-description"
      >
        <div className="p-6">
          <div className="mb-5 flex items-start gap-4">
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              isSuccess ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-sky-500/20 bg-sky-500/10 text-sky-400',
            )}>
              {isSuccess ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="superadmin-reset-password-title" className="text-lg font-black tracking-tight text-white">
                Reset mật khẩu Admin
              </h3>
              <p id="superadmin-reset-password-description" className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                {isSuccess
                  ? 'Reset mật khẩu thành công. Hãy copy mật khẩu mới trước khi đóng modal.'
                  : `Tenant ID: ${tenantId || '---'}. Nhập mật khẩu mới hoặc để trống để hệ thống tạo mật khẩu mạnh.`}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                Mật khẩu mới
              </span>
              <input
                type="text"
                value={displayedPassword}
                onChange={(event) => onPasswordChange(event.target.value)}
                disabled={isLoading || isSuccess}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm font-bold text-white outline-none transition-all placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-80"
                placeholder="Để trống để tự tạo mật khẩu mạnh"
              />
            </label>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                {error}
              </div>
            )}
            {isSuccess && successPassword && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Mật khẩu mới</p>
                <p className="mt-2 break-all font-mono text-base font-black text-white">{successPassword}</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSuccess ? 'Đóng' : 'Hủy'}
            </button>
            {!isSuccess && (
              <>
                <button
                  type="button"
                  onClick={onGeneratePassword}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-black text-sky-200 transition-all hover:bg-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tạo ngẫu nhiên
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Đang reset
                    </span>
                  ) : 'Xác nhận reset'}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ----- Main Component -----
export const SuperAdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { role, user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [activeTab, setActiveTabState] = useState<SuperAdminTab>(() => resolveSuperAdminTab(new URLSearchParams(window.location.search).get('tab')));
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [suggestedSubdomain, setSuggestedSubdomain] = useState('');
  const [generatingSubdomain, setGeneratingSubdomain] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerPhone, setNewManagerPhone] = useState('');
  const [contactLead, setContactLead] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [resetPwTenantId, setResetPwTenantId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwStatus, setResetPwStatus] = useState<ResetPasswordModalState>('idle');
  const [resetPwError, setResetPwError] = useState<string | null>(null);
  const [resetPwSuccessPassword, setResetPwSuccessPassword] = useState<string | null>(null);

  // Upgrade Requests State
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [upgradeRequestsCursor, setUpgradeRequestsCursor] = useState<string | null>(null);
  const [upgradeRequestsLoading, setUpgradeRequestsLoading] = useState(false);
  const [upgradeRequestsTotal, setUpgradeRequestsTotal] = useState<number | null>(null);
  const pendingUpgradeCount = upgradeRequests.filter(r => r.status === 'OPEN').length;
  const remainingUpgradeRequests = upgradeRequestsTotal === null ? null : Math.max(upgradeRequestsTotal - upgradeRequests.length, 0);
  const loadMoreUpgradeLabel = upgradeRequestsLoading
    ? 'Đang tải...'
    : `Tải thêm yêu cầu${remainingUpgradeRequests === null ? '' : ` (còn ${remainingUpgradeRequests})`}`;

  useEffect(() => {
    const nextTab = resolveSuperAdminTab(searchParams.get('tab'));
    if (nextTab !== activeTab) {
      setActiveTabState(nextTab);
    }
  }, [activeTab, searchParams]);

  const setActiveTab = (tab: SuperAdminTab) => {
    setActiveTabState(tab);
    setIsMobileSidebarOpen(false);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      if (tab === 'overview') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', tab);
      }
      return nextParams;
    });
  };

  // Bug Report State
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '', severity: 'medium' as 'low' | 'medium' | 'high' });
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Deduplication
  const deduplicateTenants = (newTenants: Tenant[], existingTenants: Tenant[]) => {
    const map = new Map<string, Tenant>();
    existingTenants.forEach(t => map.set(t.id, t));
    newTenants.forEach(t => map.set(t.id, t));
    return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
  };

  const [tenantsCursor, setTenantsCursor] = useState<string | null>(null);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchStats = useCallback(async (force: boolean = false) => {
    try {
      const res = await fetch(`/api/v1/sys-manage/stats${force ? '?refresh=true' : ''}`, { 
        headers: getAuthHeaders() 
      });
      if (res.status === 401) { logout(); window.location.href = '/'; return; }
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      if (data && typeof data === 'object') setStats(data);
    } catch (err: any) {
      console.error("Error fetching stats:", err?.message || err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTenants = useCallback(async (loadMore = false) => {
    if (tenantsLoading) return;
    setTenantsLoading(true);
    setTenantsError(null);
    try {
      const url = new URL('/api/v1/sys-manage/tenants', window.location.origin);
      if (loadMore && tenantsCursor) url.searchParams.set('cursor', tenantsCursor);
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (res.status === 401) { logout(); window.location.href = '/'; return; }
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setTenantsCursor(data.nextCursor || null);
      const items = Array.isArray(data.data) ? data.data : [];
      setTenants(prev => {
        if (!loadMore) return deduplicateTenants(items, []);
        return deduplicateTenants(items, prev);
      });
    } catch (err: any) {
      console.error("Error fetching tenants:", err?.message || err);
      setTenantsError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
    } finally {
      setTenantsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantsCursor, tenantsLoading]);

  const fetchUpgradeRequests = useCallback(async (loadMore = false) => {
    setUpgradeRequestsLoading(true);
    try {
      const url = new URL('/api/v1/sys-manage/upgrade-requests', window.location.origin);
      if (loadMore && upgradeRequestsCursor) url.searchParams.set('cursor', upgradeRequestsCursor);
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (res.ok) {
        const result = await res.json();
        setUpgradeRequestsCursor(result.nextCursor || null);
        setUpgradeRequestsTotal(typeof result.total === 'number' ? result.total : null);
        const items = Array.isArray(result.data) ? result.data : [];
        if (loadMore) {
          setUpgradeRequests(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const newOnes = items.filter((r: any) => {
              if (existingIds.has(r.id)) return false;
              existingIds.add(r.id);
              return true;
            });
            return [...prev, ...newOnes];
          });
        } else {
          const seen = new Set();
          const uniqueItems = items.filter((r: any) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          setUpgradeRequests(uniqueItems);
        }
      }
    } catch { /* non-fatal */ } finally {
      setUpgradeRequestsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeRequestsCursor]);

  useEffect(() => {
    if (role === 'super-admin') {
      void Promise.all([fetchTenants(), fetchStats()]);
      fetchUpgradeRequests();
      const interval = setInterval(() => { void fetchStats(); }, 10000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!contactLead && !showOnboarding && !showBugReport) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showBugReport) { setShowBugReport(false); return; }
      if (showOnboarding) { setShowOnboarding(false); return; }
      if (contactLead) setContactLead(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [contactLead, showOnboarding, showBugReport]);

  const handleUpdateSubscription = async (tenantId: string, newPlan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    setUpdatingSubscriptionId(tenantId);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/subscription`, {
        method: 'PUT',
        headers: { ...getAuthHeaders({ 'x-mock-role': 'super-admin' }), 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Lỗi cập nhật: ${res.status}`);
      }
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, subscriptionPlan: newPlan, plan: newPlan } : t));
    } catch (err) {
      console.error("Error updating subscription:", err);
      toast.error(`Không thể cập nhật gói cước: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingSubscriptionId(null);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { await fetchStats(true); } finally { setIsRefreshing(false); }
  };

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugReport.title || !bugReport.description) return;
    setIsSubmittingBug(true);
    try {
      toast.success("Hệ thống đã ghi nhận báo cáo lỗi. Đội ngũ kỹ thuật sẽ xử lý sớm nhất có thể!");
      setShowBugReport(false);
      setBugReport({ title: '', description: '', severity: 'medium' });
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi gửi báo cáo.");
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    const newStatus = action === 'activate' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/${action}`, {
        method: 'POST', headers: getAuthHeaders()
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${res.status} - ${text}`);
      }
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi thay đổi trạng thái: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateMaxEmployees = async (tenantId: string, count: number) => {
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/max-employees`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_employees: count })
      });
      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, maxEmployees: count } : t));
      } else {
        const text = await res.text();
        throw new Error(text);
      }
    } catch (err) {
      console.error("Error updating max employees:", err);
      toast.error("Lỗi khi cập nhật giới hạn user.");
    }
  };

  const generateSubdomain = async () => {
    if (!newCompanyName) return;
    setGeneratingSubdomain(true);
    try {
      const text = await suggestSubdomain(newCompanyName);
      setSuggestedSubdomain(text);
    } catch (err) {
      console.error(err);
      setSuggestedSubdomain(newCompanyName.toLowerCase().replace(/\s+/g, ''));
    } finally {
      setGeneratingSubdomain(false);
    }
  };

  const handleOnboarding = async () => {
    if (!newCompanyName || !suggestedSubdomain || !newManagerName || !newManagerEmail || !newManagerPhone) {
      toast.error("Vui lòng điền đầy đủ thông tin quản lý.");
      return;
    }
    setOnboardingLoading(true);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/onboarding`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCompanyName, subdomain: suggestedSubdomain, plan: 'TRIAL',
          ownerName: newManagerName, contactEmail: newManagerEmail, contactPhone: newManagerPhone, status: 'active'
        })
      });
      if (res.ok) {
        await Promise.all([fetchTenants(), fetchStats()]);
        setShowOnboarding(false);
        setNewCompanyName(''); setSuggestedSubdomain(''); setNewManagerName(''); setNewManagerEmail(''); setNewManagerPhone('');
      } else {
        const text = await res.text();
        console.error(`API Error (onboarding): ${res.status}`, text.substring(0, 100));
        toast.error(`Lỗi đăng ký: ${text}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleFeatureToggle = async (tenantId: string, feature: string, currentValue: boolean) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;
      const updatedFeatures = { ...tenant.features_enabled, [feature]: !currentValue };
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/features`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ features_enabled: updatedFeatures })
      });
      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, features_enabled: updatedFeatures } : t));
      }
    } catch (err) {
      console.error("Error toggling feature:", err);
    }
  };

  const handleFeatureMatrixUpdate = async (tenantId: string, featuresEnabled: Record<string, boolean>) => {
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/features`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ features_enabled: featuresEnabled })
      });
      if (!res.ok) throw new Error(`Feature update failed: ${res.status}`);
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, features_enabled: featuresEnabled } : t));
    } catch (err) {
      console.error("Error updating feature matrix:", err);
      throw err;
    }
  };

  const resetPasswordModalState = () => {
    setShowResetPwModal(false); setResetPwTenantId(null); setResetPwValue('');
    setResetPwStatus('idle'); setResetPwError(null); setResetPwSuccessPassword(null);
  };

  const handleResetPassword = (tenantId: string) => {
    setResetPwTenantId(tenantId); setResetPwValue(''); setResetPwStatus('idle');
    setResetPwError(null); setResetPwSuccessPassword(null); setShowResetPwModal(true);
  };

  const handleGenerateResetPassword = () => {
    setResetPwValue(generateStrongPassword()); setResetPwError(null);
    setResetPwSuccessPassword(null); setResetPwStatus('idle');
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPwTenantId || resetPwStatus === 'loading') return;
    const finalPassword = resetPwValue.trim() || generateStrongPassword();
    setResetPwStatus('loading'); setResetPwError(null); setResetPwSuccessPassword(null);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${resetPwTenantId}/reset-password`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: finalPassword })
      });
      if (!res.ok) {
        let errorMessage = 'Lỗi khi reset mật khẩu.';
        try { const data = await res.json(); errorMessage = data.error || data.message || errorMessage; } catch { /* keep generic */ }
        throw new Error(errorMessage);
      }
      setResetPwValue(finalPassword); setResetPwSuccessPassword(finalPassword); setResetPwStatus('success');
      toast.success('Đã reset mật khẩu thành công. Hãy copy mật khẩu trong modal.');
    } catch (err) {
      setResetPwStatus('idle');
      setResetPwError(err instanceof Error ? err.message : 'Lỗi khi reset mật khẩu.');
    }
  };

  const executeDeleteTenant = async (tenantId: string) => {
    setIsDeleting(tenantId);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setTenants(prev => prev.filter(t => t.id !== tenantId));
        setStats(prev => prev ? { ...prev, totalTenants: prev.totalTenants - 1 } : null);
        toast.success("Đã xóa dữ liệu khách hàng vĩnh viễn khỏi hệ thống.");
      } else {
        const text = await res.text();
        let errorMsg = 'Vui lòng thử lại sau';
        try { const errData = JSON.parse(text); errorMsg = errData.error || errData.message || errorMsg; } catch { errorMsg = text || errorMsg; }
        toast.error(`Lỗi khi xóa khách hàng: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error deleting tenant:", err);
      toast.error("Lỗi kết nối máy chủ khi xóa khách hàng.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteTenant = (tenantId: string) => {
    if (tenantId === 'system') { toast.error("CẢNH BÁO: Không thể xóa không gian làm việc HỆ THỐNG."); return; }
    setConfirmModal({
      title: 'Xóa vĩnh viễn khách hàng',
      message: 'CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN khách hàng này? Toàn bộ dữ liệu liên quan sẽ bị hủy bỏ và không thể khôi phục.',
      confirmLabel: 'Xóa vĩnh viễn',
      danger: true,
      onConfirm: () => void executeDeleteTenant(tenantId),
    });
  };

  const handleResolveUpgrade = async (feedbackId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/v1/sys-manage/upgrade-requests/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setUpgradeRequests(prev => prev.map(r =>
          r.id === feedbackId ? { ...r, status: action === 'APPROVED' ? 'RESOLVED' : 'CLOSED' } : r
        ));
        if (action === 'APPROVED') void fetchTenants();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-scmd-navy font-sans text-slate-100 selection:bg-scmd-cyber/30">
      <ConfirmModal state={confirmModal} onClose={() => setConfirmModal(null)} />
      <ResetPasswordModal
        isOpen={showResetPwModal}
        tenantId={resetPwTenantId}
        passwordValue={resetPwValue}
        status={resetPwStatus}
        error={resetPwError}
        successPassword={resetPwSuccessPassword}
        onPasswordChange={(value) => { setResetPwValue(value); setResetPwError(null); }}
        onGeneratePassword={handleGenerateResetPassword}
        onConfirm={handleConfirmResetPassword}
        onClose={resetPasswordModalState}
      />

      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng Super Admin"
          className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — extracted component */}
      <SuperAdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingUpgradeCount={pendingUpgradeCount}
      />

      {/* Main Content */}
      <main className="no-scrollbar relative z-10 flex-1 overflow-y-auto">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="ops-focus-ring fixed left-4 top-4 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-scmd-surface/95 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition-all active:scale-95 md:hidden"
          aria-label="Mở menu điều hướng Super Admin"
          aria-expanded={isMobileSidebarOpen}
        >
          <Menu size={20} />
        </button>

        {/* Sticky page chrome */}
        <PageChrome tab={activeTab} user={user} />

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in duration-200">
              <header className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-2 py-0.5 bg-scmd-cyber/10 border border-scmd-cyber/20 rounded text-xs font-semibold text-scmd-cyber uppercase flex items-center gap-1.5">
                      <Database size={10} />
                      {t('dashboard.last_sync')}
                    </div>
                    <div className="px-2 py-0.5 bg-scmd-safety/10 border border-scmd-safety/20 rounded text-xs font-semibold text-scmd-safety uppercase flex items-center gap-1.5">
                      <ShieldCheck size={10} />
                      {t('dashboard.security_masking')}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Đồng bộ cuối: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '---'}
                    </p>
                  </div>
                  <DashboardPageHeading>{t('dashboard.title')}</DashboardPageHeading>
                  <p className="text-slate-400 mt-2 font-medium text-lg">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBugReport(true)}
                    className="p-4 bg-scmd-alert/10 border border-scmd-alert/20 rounded-2xl text-scmd-alert hover:text-white hover:bg-scmd-alert/20 transition-all flex items-center gap-2 group"
                    title="Báo cáo lỗi / Sự cố"
                  >
                    <Bug size={20} />
                    <span className="text-xs font-black uppercase tracking-widest hidden group-hover:inline">Báo lỗi</span>
                  </button>
                  <button 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 group"
                  >
                    <RefreshCw size={20} className={cn("transition-transform duration-700", isRefreshing && "animate-spin")} />
                    <span className="text-xs font-black uppercase tracking-widest hidden group-hover:inline">Làm mới giao diện</span>
                  </button>
                  <button className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Globe size={20} />
                  </button>
                </div>
              </header>
              {stats && <TenantOverview stats={stats} setContactLead={setContactLead} />}
            </div>
          )}

          {activeTab === 'tenants' && (
            <TenantList 
              tenants={tenants}
              onToggleStatus={toggleStatus}
              onUpdateSubscription={handleUpdateSubscription}
              onUpdateMaxEmployees={handleUpdateMaxEmployees}
              onFeatureToggle={handleFeatureToggle}
              onResetPassword={handleResetPassword}
              onDeleteTenant={handleDeleteTenant}
              isDeleting={isDeleting}
              setShowOnboarding={setShowOnboarding}
              updatingSubscriptionId={updatingSubscriptionId}
              hasMore={!!tenantsCursor}
              isLoading={tenantsLoading}
              error={tenantsError}
              onRetry={() => fetchTenants(false)}
              onLoadMore={() => fetchTenants(true)}
            />
          )}

          {activeTab === 'feature-flags' && (
            <FeatureFlagManager tenants={tenants} onUpdateTenantFeatures={handleFeatureMatrixUpdate} />
          )}

          {activeTab === 'billing' && (
            <div className="animate-in fade-in duration-200">
              <BillingManagementTab />
            </div>
          )}

          {activeTab === 'news' && <NewsManagement />}

          {activeTab === 'permissions' && <RolePermissionManagement />}

          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <DashboardPageHeading>Yêu cầu Nâng cấp Gói</DashboardPageHeading>
                <button onClick={() => fetchUpgradeRequests(false)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                  {upgradeRequestsLoading ? 'Đang tải...' : '↻ Làm mới'}
                </button>
              </div>
              {upgradeRequests.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp size={40} />}
                  title="Chưa có yêu cầu nâng cấp nào"
                  description="Các yêu cầu nâng cấp tenant sẽ xuất hiện tại đây để Super Admin xử lý."
                />
              ) : (
                <div className="space-y-3">
                  {upgradeRequests.map((req: any) => (
                    <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            req.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-300' :
                            req.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {req.status === 'OPEN' ? 'Chờ duyệt' : req.status === 'RESOLVED' ? 'Đã duyệt' : 'Từ chối'}
                          </span>
                          <span className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <p className="text-white font-bold text-sm">{req.title}</p>
                        <p className="text-slate-400 text-xs mt-1 truncate">{req.description}</p>
                        <p className="text-slate-600 text-xs mt-1">Tenant ID: {req.tenantId}</p>
                      </div>
                      {req.status === 'OPEN' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleResolveUpgrade(req.id, 'APPROVED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all">
                            ✓ Duyệt & Nâng cấp
                          </button>
                          <button onClick={() => handleResolveUpgrade(req.id, 'REJECTED')} className="px-4 py-2 bg-red-600/60 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all">
                            ✕ Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {upgradeRequestsCursor && (
                    <button
                      onClick={() => fetchUpgradeRequests(true)}
                      disabled={upgradeRequestsLoading}
                      aria-label={loadMoreUpgradeLabel}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all border border-white/5 hover:border-white/20"
                    >
                      {loadMoreUpgradeLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'slo' && (
            <Suspense fallback={<DashboardSpinner message="Đang tải Observability Module..." />}>
              <SLOMonitorTab />
            </Suspense>
          )}

          {activeTab === 'market-growth' && (
            <Suspense fallback={<DashboardSpinner message="Đang tải Market Growth..." />}>
              <MarketGrowthTab />
            </Suspense>
          )}

          {activeTab === 'usage-analytics' && (
            <Suspense fallback={<DashboardSpinner message="Đang tải phân tích mức độ sử dụng..." />}>
              <UsageAnalyticsTab />
            </Suspense>
          )}
        </div>
      </main>

      {/* Contact Lead Modal */}
      {contactLead && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="text-sky-400" size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{contactLead.name}</h3>
                    <p className="text-sky-500 text-xs font-black uppercase tracking-widest mt-1">Phát hiện khách hàng tiềm năng</p>
                  </div>
                </div>
                <button onClick={() => setContactLead(null)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="p-5 bg-white/5 border border-white/5 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-sky-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giám đốc an ninh</p>
                      <p className="text-base font-black text-white">{contactLead.contact?.name ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số điện thoại</p>
                      <p className="text-base font-black text-white">{contactLead.contact?.phone ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vị trí địa lý</p>
                      <p className="text-base font-black text-white">{contactLead.contact?.location ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{contactLead.staffCount}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{t('entities.staff')}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                    <p className="text-2xl font-black text-white">{contactLead.checkpointCount}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{t('entities.checkpoints')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 h-14 bg-sky-500 text-slate-950 rounded-xl text-base font-black shadow-xl shadow-sky-500/20 hover:bg-sky-400 transition-all flex items-center justify-center gap-3">
                    <Phone size={18} /> Gọi Ngay
                  </button>
                  <button className="w-14 h-14 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Thêm {t('entities.tenant')}</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Đăng ký {t('entities.tenant')} mới vào hệ thống.</p>
                </div>
                <button onClick={() => setShowOnboarding(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tên doanh nghiệp</label>
                  <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Ví dụ: Bảo vệ An Bình" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subdomain</label>
                    <button onClick={generateSubdomain} disabled={!newCompanyName || generatingSubdomain} className="text-[10px] font-black text-sky-400 flex items-center gap-1.5 hover:text-sky-300 disabled:opacity-50 transition-colors">
                      {generatingSubdomain ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                      AI GENERATE
                    </button>
                  </div>
                  <div className="relative">
                    <input type="text" value={suggestedSubdomain} onChange={(e) => setSuggestedSubdomain(e.target.value)} placeholder="baoveanbinh" className="w-full pl-4 pr-24 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">.scmd.vn</span>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-sky-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin quản trị viên</span>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Họ tên người quản lý</label>
                    <input type="text" value={newManagerName} onChange={(e) => setNewManagerName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn A" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                      <input type="email" value={newManagerEmail} onChange={(e) => setNewManagerEmail(e.target.value)} placeholder="manager@domain.com" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Số điện thoại</label>
                      <input type="tel" value={newManagerPhone} onChange={(e) => setNewManagerPhone(e.target.value)} placeholder="09xxx..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700" />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Mặc định: Gói <strong className="text-emerald-400">Miễn phí</strong>, giới hạn <strong className="text-emerald-400">3 nhân sự</strong>. Hệ thống sẽ tự động cấp phát tài nguyên DevOps.
                  </p>
                </div>
                <button onClick={handleOnboarding} disabled={!newCompanyName || !suggestedSubdomain || onboardingLoading || !newManagerName || !newManagerEmail || !newManagerPhone} className="w-full h-14 bg-sky-500 text-slate-950 rounded-xl text-base font-black shadow-xl shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                  {onboardingLoading ? <Loader2 className="animate-spin" /> : <><Zap size={18} /> Xác nhận đăng ký</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl border border-red-500/20 overflow-hidden">
            <form onSubmit={handleReportBug} className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Bug className="text-red-500" size={26} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Báo cáo Sự cố</h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Giúp chúng tôi cải thiện hệ thống SCMD Pro.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowBugReport(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tiêu đề lỗi</label>
                  <input required type="text" value={bugReport.title} onChange={(e) => setBugReport(prev => ({ ...prev, title: e.target.value }))} placeholder="Ví dụ: Lỗi không thể xuất PDF báo cáo" className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                  <textarea required rows={4} value={bugReport.description} onChange={(e) => setBugReport(prev => ({ ...prev, description: e.target.value }))} placeholder="Hãy mô tả các bước để tái hiện lỗi này..." className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-white resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map((sev) => (
                      <button key={sev} type="button" onClick={() => setBugReport(prev => ({ ...prev, severity: sev }))} className={cn("py-2.5 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all", bugReport.severity === sev ? "bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/10" : "bg-slate-950/50 border-white/5 text-slate-600 hover:border-white/20")}>
                        {sev === 'low' ? 'Thấp' : sev === 'medium' ? 'Vừa' : 'Nghiêm trọng'}
                      </button>
                    ))}
                  </div>
                </div>
                <button disabled={isSubmittingBug || !bugReport.title || !bugReport.description} type="submit" className="w-full h-14 bg-red-600 text-white rounded-xl text-base font-black shadow-xl shadow-red-600/20 hover:bg-red-500 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-2">
                  {isSubmittingBug ? <Loader2 className="animate-spin" /> : <><AlertTriangle size={18} /> Gửi Báo cáo</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
