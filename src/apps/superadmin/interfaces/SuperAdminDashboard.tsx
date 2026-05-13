import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Building2, 
  LayoutDashboard,
  LogOut,
  Sparkles,
  Loader2,
  ChevronRight,
  Globe,
  Newspaper,
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
  Activity
} from 'lucide-react';
import { suggestSubdomain } from '../../../services/ai-proxy.service';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Suspense, lazy } from 'react';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';
import { NewsManagement } from './components/NewsManagement';
import { TenantOverview } from './components/TenantOverview';
import { TenantList } from './components/TenantList';
import { BillingManagementTab } from '../billing/BillingManagementTab.js';
import { RolePermissionManagement } from './components/RolePermissionManagement';

// Lazy load monitoring components
const SLOMonitorTab = lazy(() => import('./components/SLOMonitorTab').then(m => ({ default: m.SLOMonitorTab })));
import { SuperAdminStats } from '../../../server/domain/entities';
import { useAuth } from '../../../context/AuthContext';
import { SCMDLogo } from '../../common/interfaces/components/SCMDLogo';

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
  features_enabled: {
    patrol: boolean;
    attendance: boolean;
    ai_analytics: boolean;
  };
  provisioning_status?: 'queued' | 'cloning_schema' | 'generating_ssl' | 'running_health_checks' | 'active';
  ssl_enabled?: boolean;
  health_check?: {
    tables_initialized: boolean;
    dns_resolved: boolean;
    ssl_valid: boolean;
    timestamp: string;
  };
}

export const SuperAdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { role, user, logout } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'billing' | 'news' | 'upgrades' | 'permissions' | 'slo'>('overview');
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
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null);

  // Upgrade Requests State
  const [upgradeRequests, setUpgradeRequests] = useState<any[]>([]);
  const [upgradeRequestsCursor, setUpgradeRequestsCursor] = useState<string | null>(null);
  const [upgradeRequestsLoading, setUpgradeRequestsLoading] = useState(false);
  const pendingUpgradeCount = upgradeRequests.filter(r => r.status === 'OPEN').length;

  const fetchUpgradeRequests = async (loadMore = false) => {
    setUpgradeRequestsLoading(true);
    try {
      const url = new URL('/api/v1/sys-manage/upgrade-requests', window.location.origin);
      if (loadMore && upgradeRequestsCursor) url.searchParams.set('cursor', upgradeRequestsCursor);
      const res = await fetch(url.toString(), { 
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const result = await res.json();
        setUpgradeRequestsCursor(result.nextCursor || null);
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
  };

  const handleResolveUpgrade = async (feedbackId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/v1/sys-manage/upgrade-requests/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: { 
          ...getAuthHeaders(),
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setUpgradeRequests(prev => prev.map(r =>
          r.id === feedbackId ? { ...r, status: action === 'APPROVED' ? 'RESOLVED' : 'CLOSED' } : r
        ));
        if (action === 'APPROVED') {
          // Refresh tenant list để cập nhật plan mới
          fetchTenants();
        }
      }
    } catch (err) { console.error(err); }
  };

  // Bug Report State
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReport, setBugReport] = useState({ title: '', description: '', severity: 'medium' as 'low' | 'medium' | 'high' });
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Robust deduplication based on ID
  const deduplicateTenants = (newTenants: Tenant[], existingTenants: Tenant[]) => {
    const map = new Map<string, Tenant>();
    existingTenants.forEach(t => map.set(t.id, t));
    newTenants.forEach(t => map.set(t.id, t));
    return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
  };

  useEffect(() => {
    if (role === 'super-admin') {
      loadInitialData();
      fetchUpgradeRequests();
      const interval = setInterval(() => { fetchStats(); }, 10000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [role]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const loadInitialData = async () => {
    await Promise.all([fetchTenants(), fetchStats()]);
  };

  const [tenantsCursor, setTenantsCursor] = useState<string | null>(null);

  const fetchTenants = async (loadMore = false) => {
    try {
      const url = new URL('/api/v1/sys-manage/tenants', window.location.origin);
      if (loadMore && tenantsCursor) url.searchParams.set('cursor', tenantsCursor);
      const res = await fetch(url.toString(), { 
        headers: getAuthHeaders() 
      });
      if (res.status === 401) {
        logout();
        window.location.href = '/';
        return;
      }
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setTenantsCursor(data.nextCursor || null);
      const items = Array.isArray(data.data) ? data.data : [];
      
      setTenants(prev => {
        if (!loadMore) return deduplicateTenants(items, []);
        return deduplicateTenants(items, prev);
      });
    } catch (err: any) {
      console.error("Error fetching tenants:", err?.message || err);
    }
  };

  const handleUpdateSubscription = async (tenantId: string, newPlan: 'FREE' | 'PRO' | 'ENTERPRISE') => {
    setUpdatingSubscriptionId(tenantId);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/subscription`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders({ 'x-mock-role': 'super-admin' }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: newPlan })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Lỗi cập nhật: ${res.status}`);
      }

      setTenants(prev => prev.map(t => 
        t.id === tenantId 
          ? { ...t, subscriptionPlan: newPlan, plan: newPlan } 
          : t
      ));
    } catch (err) {
      console.error("Error updating subscription:", err);
      alert(`Không thể cập nhật gói cước: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingSubscriptionId(null);
    }
  };

  const fetchStats = async (force: boolean = false) => {
    try {
      // Dùng /sys-manage thay vì /admin để tránh filter hạ tầng
      const res = await fetch(`/api/v1/sys-manage/stats${force ? '?refresh=true' : ''}`, { 
        headers: getAuthHeaders() 
      });
      if (res.status === 401) {
        logout();
        window.location.href = '/';
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (/api/v1/sys-manage/stats): ${res.status}`, text.substring(0, 100));
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      if (data && typeof data === 'object') {
        setStats(data);
      } else {
        console.warn("Received invalid stats format", data);
      }
    } catch (err: any) {
      console.error("Error fetching stats:", err?.message || err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStats(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugReport.title || !bugReport.description) return;
    setIsSubmittingBug(true);
    try {
      // API integration point: /api/v1/support/report-bug
      // Resolved UX Debt: Replacing blocking alert with polished toast notification
      toast.success("Hệ thống đã ghi nhận báo cáo lỗi. Đội ngũ kỹ thuật sẽ xử lý sớm nhất có thể!");
      setShowBugReport(false);
      setBugReport({ title: '', description: '', severity: 'medium' });
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi gửi báo cáo.");
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    const newStatus = action === 'activate' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error: ${res.status} - ${text}`);
      }
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi thay đổi trạng thái: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateMaxEmployees = async (tenantId: string, count: number) => {
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/max-employees`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
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
      alert("Lỗi khi cập nhật giới hạn user.");
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
      alert("Vui lòng điền đầy đủ thông tin quản lý.");
      return;
    }
    setOnboardingLoading(true);
    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/onboarding`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: newCompanyName, 
          subdomain: suggestedSubdomain,
          plan: 'TRIAL',
          ownerName: newManagerName,
          contactEmail: newManagerEmail,
          contactPhone: newManagerPhone,
          status: 'active'
        })
      });
      if (res.ok) {
        await loadInitialData();
        setShowOnboarding(false);
        setNewCompanyName('');
        setSuggestedSubdomain('');
        setNewManagerName('');
        setNewManagerEmail('');
        setNewManagerPhone('');
      } else {
        const text = await res.text();
        console.error(`API Error (onboarding): ${res.status}`, text.substring(0, 100));
        alert(`Lỗi đăng ký: ${text}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleFeatureToggle = async (tenantId: string, feature: 'patrol' | 'attendance' | 'ai_analytics', currentValue: boolean) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;
      
      const updatedFeatures = {
        ...tenant.features_enabled,
        [feature]: !currentValue
      };

      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/features`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ features_enabled: updatedFeatures })
      });

      if (res.ok) {
        setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, features_enabled: updatedFeatures } : t));
      }
    } catch (err) {
      console.error("Error toggling feature:", err);
    }
  };

  const handleResetPassword = async (tenantId: string) => {
    const newPassword = prompt("Nhập mật khẩu mới cho Admin (hoặc để trống để tạo ngẫu nhiên):");
    if (newPassword === null) return; // Cancelled

    const finalPassword = newPassword.trim() || Math.random().toString(36).slice(-8);

    try {
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}/reset-password`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: finalPassword })
      });

      if (res.ok) {
        alert(`Đã reset mật khẩu thành công!\nMật khẩu mới: ${finalPassword}`);
      } else {
        alert("Lỗi khi reset mật khẩu.");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      alert("Lỗi khi reset mật khẩu.");
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDeleteTenant = async (tenantId: string) => {
    if (tenantId === 'system') {
      alert("CẢNH BÁO: Không thể xóa không gian làm việc HỆ THỐNG.");
      return;
    }

    if (!window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN khách hàng này? Toàn bộ dữ liệu liên quan sẽ bị hủy bỏ và không thể khôi phục.")) {
      return;
    }

    setIsDeleting(tenantId);
    try {
      console.log(`[SuperAdmin] Initializing deletion for tenant: ${tenantId}`);
      const res = await fetch(`/api/v1/sys-manage/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        setTenants(prev => prev.filter(t => t.id !== tenantId));
        // Update stats if needed
        setStats(prev => prev ? { ...prev, totalTenants: prev.totalTenants - 1 } : null);
        alert("Đã xóa dữ liệu khách hàng vĩnh viễn khỏi hệ thống.");
      } else {
        const text = await res.text();
        let errorMsg = 'Vui lòng thử lại sau';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.error || errData.message || errorMsg;
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        alert(`Lỗi khi xóa khách hàng: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error deleting tenant:", err);
      alert("Lỗi kết nối máy chủ khi xóa khách hàng. Kiểm tra log console để biết chi tiết.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="flex h-screen bg-scmd-navy text-slate-100 font-sans selection:bg-scmd-cyber/30 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#1A2133] text-white border-r border-[#1A2133] flex flex-col shrink-0 z-20 transition-all duration-500 relative shadow-2xl shadow-black/50",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-8 flex items-center justify-between overflow-hidden">
          {!isSidebarCollapsed && (
            <div className="flex flex-col animate-in fade-in duration-500">
              <SCMDLogo variant="dark" size="md" />
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2 ml-[48px]">Strategic Command</p>
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
              "absolute -right-3 top-12 w-6 h-6 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-40",
              isSidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'overview' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <LayoutDashboard size={20} className={activeTab === 'overview' ? "text-sky-400" : ""} />
            {!isSidebarCollapsed && "Business Radar"}
          </button>
          <button 
            onClick={() => setActiveTab('tenants')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'tenants' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Building2 size={20} className={activeTab === 'tenants' ? "text-emerald-400" : ""} />
            {!isSidebarCollapsed && t('entities.tenants')}
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'billing' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Database size={20} className={activeTab === 'billing' ? "text-purple-400" : ""} />
            {!isSidebarCollapsed && "Billing & Thanh toán"}
          </button>
          <button 
            onClick={() => setActiveTab('news')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'news' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Newspaper size={20} className={activeTab === 'news' ? "text-blue-400" : ""} />
            {!isSidebarCollapsed && "Quản lý Tin tức"}
          </button>
          <button 
            onClick={() => setActiveTab('upgrades')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 relative",
              activeTab === 'upgrades' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <span className="relative">
              <TrendingUp size={20} className={activeTab === 'upgrades' ? "text-yellow-400" : ""} />
              {pendingUpgradeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingUpgradeCount}
                </span>
              )}
            </span>
            {!isSidebarCollapsed && (
              <span className="flex items-center gap-2">
                Yêu cầu Nâng cấp
                {pendingUpgradeCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingUpgradeCount}</span>
                )}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('permissions')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'permissions' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <ShieldCheck size={20} className={activeTab === 'permissions' ? "text-emerald-400" : ""} />
            {!isSidebarCollapsed && "Phân quyền Vai trò"}
          </button>
          <button 
            onClick={() => setActiveTab('slo')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'slo' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Activity size={20} className={activeTab === 'slo' ? "text-scmd-cyber" : ""} />
            {!isSidebarCollapsed && "Service SLO Monitor"}
          </button>

          {!isSidebarCollapsed && (
            <div className="pt-6 pb-2 px-4 animate-in fade-in duration-500">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Intelligence</p>
            </div>
          )}
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl font-bold text-sm transition-all",
            isSidebarCollapsed && "justify-center px-0"
          )}>
            <TrendingUp size={20} />
            {!isSidebarCollapsed && "Market Growth"}
          </button>
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl font-bold text-sm transition-all",
            isSidebarCollapsed && "justify-center px-0"
          )}>
            <Zap size={20} />
            {!isSidebarCollapsed && "Usage Analytics"}
          </button>
        </nav>

        <div className="p-6 border-t border-white/5">
          {!isSidebarCollapsed && (
            <div className="bg-white/5 rounded-2xl p-4 mb-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t('common.status')} hệ thống</p>
              </div>
              <p className="text-xs font-medium text-slate-300">Tất cả các trạm đang hoạt động</p>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-2xl font-bold text-sm transition-all",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && "Kết thúc phiên làm việc"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Top Header - User Identity */}
        <header className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/30 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-400/20 shadow-lg shadow-sky-500/10">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white tracking-tight uppercase">
                  {user?.name || 'Super Admin'}
                </p>
                <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 text-[8px] font-black uppercase tracking-widest rounded border border-sky-400/20">
                  Hệ thống Quản trị
                </span>
              </div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Session ID: {user?.staffId?.substring(0, 8) || 'PLATFORM'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Control
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Global Access</p>
            </div>
          </div>
        </header>

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -z-10" />

        <div className="p-10 max-w-7xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <header className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-2 py-0.5 bg-scmd-cyber/10 border border-scmd-cyber/20 rounded text-[10px] font-black text-scmd-cyber uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={10} />
                      {t('dashboard.last_sync')}
                    </div>
                    <div className="px-2 py-0.5 bg-scmd-safety/10 border border-scmd-safety/20 rounded text-[10px] font-black text-scmd-safety uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck size={10} />
                      {t('dashboard.security_masking')}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Đồng bộ cuối: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '---'}
                    </p>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter text-white">{t('dashboard.title')}</h2>
                  <p className="text-slate-400 mt-2 font-medium text-lg">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBugReport(true)}
                    className="p-4 bg-scmd-alert/10 border border-scmd-alert/20 rounded-2xl text-scmd-alert hover:text-white hover:bg-scmd-alert/20 transition-all flex items-center gap-2 group"
                    title="Báo cáo lỗi / Sự cố"
                  >
                    <Bug size={20} />
                    <span className="text-xs font-black uppercase tracking-widest hidden group-hover:inline">Report Issue</span>
                  </button>
                  <button 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 group"
                  >
                    <RefreshCw size={20} className={cn("transition-transform duration-700", isRefreshing && "animate-spin")} />
                    <span className="text-xs font-black uppercase tracking-widest hidden group-hover:inline">Refresh View</span>
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
              onLoadMore={() => fetchTenants(true)}
            />
          )}

          {activeTab === 'billing' && (
            <div className="animate-in fade-in duration-500">
              <BillingManagementTab />
            </div>
          )}

          {activeTab === 'news' && (
            <NewsManagement />
          )}

          {activeTab === 'permissions' && (
            <RolePermissionManagement />
          )}

          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Yêu cầu Nâng cấp Gói</h2>
                <button onClick={() => fetchUpgradeRequests(false)} className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                  {upgradeRequestsLoading ? 'Đang tải...' : '↻ Làm mới'}
                </button>
              </div>
              {upgradeRequests.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Chưa có yêu cầu nâng cấp nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upgradeRequests.map((req: any) => (
                    <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between gap-4">
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
                          <button
                            onClick={() => handleResolveUpgrade(req.id, 'APPROVED')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all"
                          >
                            ✓ Duyệt & Nâng cấp
                          </button>
                          <button
                            onClick={() => handleResolveUpgrade(req.id, 'REJECTED')}
                            className="px-4 py-2 bg-red-600/60 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                          >
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
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-2xl transition-all border border-white/5 hover:border-white/20"
                    >
                      {upgradeRequestsLoading ? 'Đang tải...' : 'Tải thêm yêu cầu'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'slo' && (
            <Suspense fallback={
               <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                  <div className="w-10 h-10 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Loading Observability Module...</p>
               </div>
            }>
               <SLOMonitorTab />
            </Suspense>
          )}
        </div>
      </main>

      {contactLead && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 rounded-3xl flex items-center justify-center">
                    <Building2 className="text-sky-400" size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{contactLead.name}</h3>
                    <p className="text-sky-500 text-xs font-black uppercase tracking-widest mt-1">Phát hiện khách hàng tiềm năng</p>
                  </div>
                </div>
                <button 
                  onClick={() => setContactLead(null)}
                  className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-sky-400">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Giám đốc an ninh</p>
                        <p className="text-lg font-black text-white">{contactLead.contact?.name ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400">
                        <Phone size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Số điện thoại</p>
                        <p className="text-lg font-black text-white">{contactLead.contact?.phone ?? 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-amber-400">
                        <MapPin size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vị trí địa lý</p>
                        <p className="text-lg font-black text-white">{contactLead.contact?.location ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] text-center">
                      <p className="text-2xl font-black text-white">{contactLead.staffCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t('entities.staff')}</p>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] text-center">
                      <p className="text-2xl font-black text-white">{contactLead.checkpointCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t('entities.checkpoints')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 h-16 bg-sky-500 text-slate-950 rounded-2xl text-lg font-black shadow-2xl shadow-sky-500/20 hover:bg-sky-400 transition-all flex items-center justify-center gap-3">
                    <Phone size={20} />
                    Gọi Ngay
                  </button>
                  <button className="w-16 h-16 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                    <ExternalLink size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Thêm {t('entities.tenant')}</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Đăng ký {t('entities.tenant')} mới vào hệ thống.</p>
                </div>
                <button 
                  onClick={() => setShowOnboarding(false)}
                  className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tên doanh nghiệp</label>
                  <input 
                    type="text" 
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Ví dụ: Bảo vệ An Bình"
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subdomain</label>
                    <button 
                      onClick={generateSubdomain}
                      disabled={!newCompanyName || generatingSubdomain}
                      className="text-[10px] font-black text-sky-400 flex items-center gap-1.5 hover:text-sky-300 disabled:opacity-50 transition-colors"
                    >
                      {generatingSubdomain ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                      AI GENERATE
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={suggestedSubdomain}
                      onChange={(e) => setSuggestedSubdomain(e.target.value)}
                      placeholder="baoveanbinh"
                      className="w-full pl-6 pr-28 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-xs">.scmd.vn</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-sky-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin quản trị viên</span>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Họ tên người quản lý</label>
                    <input 
                      type="text" 
                      value={newManagerName}
                      onChange={(e) => setNewManagerName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                      <input 
                        type="email" 
                        value={newManagerEmail}
                        onChange={(e) => setNewManagerEmail(e.target.value)}
                        placeholder="manager@domain.com"
                        className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Số điện thoại</label>
                      <input 
                        type="tel" 
                        value={newManagerPhone}
                        onChange={(e) => setNewManagerPhone(e.target.value)}
                        placeholder="09xxx..."
                        className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all text-white placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex gap-4">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Mặc định: Gói <strong className="text-emerald-400">Miễn phí</strong>, giới hạn <strong className="text-emerald-400">3 nhân sự</strong>. Hệ thống sẽ tự động cấp phát tài nguyên DevOps.
                  </p>
                </div>

                <button 
                  onClick={handleOnboarding}
                  disabled={!newCompanyName || !suggestedSubdomain || onboardingLoading || !newManagerName || !newManagerEmail || !newManagerPhone}
                  className="w-full h-16 bg-sky-500 text-slate-950 rounded-2xl text-lg font-black shadow-2xl shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  {onboardingLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Zap size={20} />
                      Xác nhận đăng ký
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-red-500/20 overflow-hidden"
          >
            <form onSubmit={handleReportBug} className="p-10">
              <div className="flex justify-between items-start mb-8">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Bug className="text-red-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Báo cáo Sự cố</h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Giúp chúng tôi cải thiện hệ thống SCMD Pro.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowBugReport(false)}
                  className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tiêu đề lỗi</label>
                  <input 
                    required
                    type="text" 
                    value={bugReport.title}
                    onChange={(e) => setBugReport(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ví dụ: Lỗi không thể xuất PDF báo cáo"
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mô tả chi tiết</label>
                  <textarea 
                    required
                    rows={4}
                    value={bugReport.description}
                    onChange={(e) => setBugReport(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Hãy mô tả các bước để tái hiện lỗi này..."
                    className="w-full px-6 py-4 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all text-white resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mức độ ưu tiên</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['low', 'medium', 'high'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setBugReport(prev => ({ ...prev, severity: sev }))}
                        className={cn(
                          "py-3 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all",
                          bugReport.severity === sev 
                            ? "bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/10" 
                            : "bg-slate-950/50 border-white/5 text-slate-600 hover:border-white/20"
                        )}
                      >
                        {sev === 'low' ? 'Thấp' : sev === 'medium' ? 'Vừa' : 'Nghiêm trọng'}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  disabled={isSubmittingBug || !bugReport.title || !bugReport.description}
                  type="submit"
                  className="w-full h-16 bg-red-600 text-white rounded-2xl text-lg font-black shadow-2xl shadow-red-600/20 hover:bg-red-500 disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-4"
                >
                  {isSubmittingBug ? <Loader2 className="animate-spin" /> : (
                    <>
                      <AlertTriangle size={20} />
                      Gửi Báo cáo
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};