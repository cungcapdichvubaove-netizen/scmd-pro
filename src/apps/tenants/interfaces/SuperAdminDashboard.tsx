import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Shield, 
  Settings, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  LayoutDashboard,
  LogOut,
  Sparkles,
  Loader2,
  ChevronRight,
  Lock,
  Unlock,
  Activity,
  Server,
  TrendingUp,
  Zap,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Target,
  Globe,
  Heart,
  Calendar,
  Clock,
  ChevronLeft,
  History,
  Phone,
  MapPin,
  Bell,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Database,
  Newspaper,
  Edit,
  Trash2,
  Eye,
  Type,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { SuperAdminStats } from '../../core/application/services/SuperAdminService';
import translations from '../../common/constants/translations.json';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  plan: string;
  max_employees: number;
  is_active: boolean;
  expiry_date: string;
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'news'>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [suggestedSubdomain, setSuggestedSubdomain] = useState('');
  const [generatingSubdomain, setGeneratingSubdomain] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [contactLead, setContactLead] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // News Management State
  const [news, setNews] = useState<any[]>([]);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsForm, setNewsForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: 'Công nghệ',
    status: 'draft',
    thumbnail: '',
    seo_title: '',
    seo_description: '',
    tags: ''
  });

  useEffect(() => {
    const role = localStorage.getItem('scmd_user_role');
    if (role !== 'super_admin') {
      window.location.href = '/';
      return;
    }
    loadInitialData();
    const interval = setInterval(() => fetchStats(), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('scmd_user_role');
    localStorage.removeItem('scmd_jwt');
    window.location.href = '/';
  };

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchTenants(), fetchStats(), fetchNews()]);
    setLoading(false);
  };

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/admin/news', {
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' })
      });
      if (res.ok) {
        const data = await res.json();
        setNews(data);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingNews ? 'PUT' : 'POST';
    const url = editingNews ? `/api/admin/news/${editingNews.id}` : '/api/admin/news';
    
    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }),
        body: JSON.stringify({
          ...newsForm,
          tags: newsForm.tags.split(',').map(t => t.trim()).filter(t => t),
          author: 'Super Admin',
          updated_at: new Date().toISOString(),
          published_at: newsForm.status === 'published' ? new Date().toISOString() : null
        })
      });

      if (res.ok) {
        await fetchNews();
        setIsNewsModalOpen(false);
        setEditingNews(null);
        setNewsForm({
          title: '', slug: '', content: '', excerpt: '', category: 'Công nghệ',
          status: 'draft', thumbnail: '', seo_title: '', seo_description: '', tags: ''
        });
      }
    } catch (err) {
      console.error("Error saving news:", err);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' })
      });
      if (res.ok) {
        await fetchNews();
      }
    } catch (err) {
      console.error("Error deleting news:", err);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants', { 
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }) 
      });
      if (res.status === 401) {
        localStorage.removeItem('scmd_user_role');
        localStorage.removeItem('scmd_jwt');
        window.location.href = '/';
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (/api/admin/tenants): ${res.status}`, text.substring(0, 100));
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tenants:", err);
    }
  };

  const fetchStats = async (force: boolean = false) => {
    try {
      const res = await fetch(`/api/admin/stats${force ? '?refresh=true' : ''}`, { 
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }) 
      });
      if (res.status === 401) {
        localStorage.removeItem('scmd_user_role');
        localStorage.removeItem('scmd_jwt');
        window.location.href = '/';
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (/api/admin/stats): ${res.status}`, text.substring(0, 100));
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const toggleStatus = async (tenantId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'suspend' : 'activate';
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (${action}): ${res.status}`, text.substring(0, 100));
        throw new Error(`API Error: ${res.status}`);
      }
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, is_active: !currentStatus } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const generateSubdomain = async () => {
    if (!newCompanyName) return;
    setGeneratingSubdomain(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setSuggestedSubdomain(newCompanyName.toLowerCase().replace(/\s+/g, ''));
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Bạn là chuyên gia hệ thống SaaS. Hãy tạo một subdomain duy nhất, ngắn gọn, chuyên nghiệp (chỉ dùng chữ thường, không dấu, không khoảng trắng, không ký tự đặc biệt) cho công ty bảo vệ có tên: "${newCompanyName}". Trả về duy nhất chuỗi subdomain (ví dụ: baoveanbinh).`
      });
      const aiText = response.text;
      if (aiText) {
        setSuggestedSubdomain(aiText.trim().toLowerCase());
      } else {
        setSuggestedSubdomain(newCompanyName.toLowerCase().replace(/\s+/g, ''));
      }
    } catch (err) {
      console.error(err);
      setSuggestedSubdomain(newCompanyName.toLowerCase().replace(/\s+/g, ''));
    } finally {
      setGeneratingSubdomain(false);
    }
  };

  const handleOnboarding = async () => {
    if (!newCompanyName || !suggestedSubdomain) return;
    setOnboardingLoading(true);
    try {
      const res = await fetch('/api/admin/tenants/onboarding', {
        method: 'POST',
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }),
        body: JSON.stringify({ name: newCompanyName, subdomain: `${suggestedSubdomain}.scmd.vn` })
      });
      if (res.ok) {
        await loadInitialData();
        setShowOnboarding(false);
        setNewCompanyName('');
        setSuggestedSubdomain('');
      } else {
        const text = await res.text();
        console.error(`API Error (onboarding): ${res.status}`, text.substring(0, 100));
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

      const res = await fetch(`/api/admin/tenants/${tenantId}/features`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }),
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
      const res = await fetch(`/api/admin/tenants/${tenantId}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders({ 'x-mock-role': 'super_admin' }),
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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col shrink-0 z-20 transition-all duration-500 relative",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-8 flex items-center justify-between overflow-hidden">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-4 animate-in fade-in duration-500">
              <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/20 rotate-3">
                <Shield className="text-white" size={28} />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tighter leading-none">SCMD <span className="text-sky-400">NOC</span></h1>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">Strategic Command</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20">
              <Shield className="text-white" size={20} />
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
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
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
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Building2 size={20} className={activeTab === 'tenants' ? "text-emerald-400" : ""} />
            {!isSidebarCollapsed && translations.entities.tenants}
          </button>
          <button 
            onClick={() => setActiveTab('news')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'news' 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            <Newspaper size={20} className={activeTab === 'news' ? "text-blue-400" : ""} />
            {!isSidebarCollapsed && "Quản lý Tin tức"}
          </button>
          {!isSidebarCollapsed && (
            <div className="pt-6 pb-2 px-4 animate-in fade-in duration-500">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Intelligence</p>
            </div>
          )}
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-2xl font-bold text-sm transition-all",
            isSidebarCollapsed && "justify-center px-0"
          )}>
            <TrendingUp size={20} />
            {!isSidebarCollapsed && "Market Growth"}
          </button>
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-2xl font-bold text-sm transition-all",
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
                <p className="text-[10px] font-bold text-slate-400 uppercase">{translations.common.status} hệ thống</p>
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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -z-10" />

        <div className="p-10 max-w-7xl mx-auto">
          {activeTab === 'overview' ? (
            <div className="space-y-10 animate-in fade-in duration-700">
              <header className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={10} />
                      {translations.dashboard.last_sync}
                    </div>
                    <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck size={10} />
                      {translations.dashboard.security_masking}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Đồng bộ cuối: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString() : '---'}
                    </p>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter text-white">{translations.dashboard.title}</h2>
                  <p className="text-slate-400 mt-2 font-medium text-lg">{translations.dashboard.subtitle}</p>
                </div>
                <div className="flex gap-3">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-8 shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="flex items-center gap-2 text-sky-400 mb-1">
                          <TrendingUp size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{translations.dashboard.growth_velocity}</span>
                        </div>
                        <h3 className="text-2xl font-black text-white">{translations.dashboard.growth_velocity}</h3>
                      </div>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-3xl font-black text-white">+{stats?.growthVelocity?.daily ?? 0}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hàng ngày</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-white">+{stats?.growthVelocity?.weekly ?? 0}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hàng tuần</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.growthVelocity?.chartData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                            dy={10}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 700 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#0ea5e9" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Smart Notifications Widget */}
                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
                        <Bell className="text-sky-400" size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">{translations.dashboard.smart_notifications}</h3>
                        <p className="text-xs text-slate-500 font-medium">Hệ thống tự động nhận diện Lead tiềm năng.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {stats?.smartNotifications?.length === 0 ? (
                        <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                          <p className="text-slate-600 text-sm font-medium">Chưa có thông báo mới.</p>
                        </div>
                      ) : stats?.smartNotifications?.map((notif) => (
                        <div key={notif.id} className={cn(
                          "p-4 rounded-2xl border flex items-start gap-4 transition-all hover:scale-[1.01]",
                          notif.priority === 'high' ? "bg-sky-500/5 border-sky-500/20" : "bg-white/5 border-white/10"
                        )}>
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                            notif.type === 'conversion_ready' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          )}>
                            {notif.type === 'conversion_ready' ? <Zap size={18} /> : <Target size={18} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-black text-white">{notif.tenantName}</p>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-3">{notif.message}</p>
                            <button 
                              onClick={() => {
                                const whale = stats?.whaleAlerts?.find(w => w.id === notif.tenantId);
                                if (whale) setContactLead(whale);
                              }}
                              className="px-4 py-2 bg-sky-500 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-400 transition-all"
                            >
                              {translations.common.contact_now}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                      <Zap size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{translations.dashboard.active_usage}</span>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="text-4xl font-black text-white">{stats?.activeUsage?.activePatrols ?? 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{translations.entities.patrols} đang chạy</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-xl font-black text-white">{stats?.activeUsage?.onlineGuards ?? 0}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Nhân sự trực tuyến</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-xl font-black text-white">{stats?.activeUsage?.systemLoad ?? 0}%</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Tải hệ thống</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 blur-3xl rounded-full" />
                    <div className="flex items-center gap-2 text-amber-400 mb-4">
                      <DollarSign size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{translations.dashboard.revenue_stream}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-4xl font-black text-white">${stats?.revenueStream?.totalRevenue.toLocaleString() ?? 0}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Tổng doanh thu</p>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-black">
                        <ArrowUpRight size={14} />
                        {stats?.revenueStream?.growth}% Tăng trưởng
                      </div>
                    </div>
                    <div className="mt-6 h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.revenueStream?.revenueData}>
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {stats?.revenueStream?.revenueData?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 4 ? '#f59e0b' : '#ffffff10'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center">
                      <Target className="text-indigo-400" size={28} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white">{translations.dashboard.whale_alerts}</h3>
                      <p className="text-slate-500 font-medium">Top {translations.entities.tenants} tiềm năng cao dựa trên quy mô nhân sự & mục tiêu.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="text-amber-500" size={16} />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Cơ hội chuyển đổi</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                        <th className="pb-6 font-black">{translations.entities.tenant}</th>
                        <th className="pb-6 font-black">Quy mô ({translations.entities.staff}/{translations.entities.checkpoints})</th>
                        <th className="pb-6 font-black">Gói hiện tại</th>
                        <th className="pb-6 font-black">Giá trị chiến lược</th>
                        <th className="pb-6 font-black text-right">{translations.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats?.whaleAlerts?.map((whale) => (
                        <tr key={whale.id} className="group hover:bg-white/5 transition-colors">
                          <td className="py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                                <Building2 size={20} />
                              </div>
                              <span className="font-black text-white">{whale.name}</span>
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-lg font-black text-white">{whale.staffCount}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{translations.entities.staff}</span>
                              </div>
                              <div className="w-px h-8 bg-white/5" />
                              <div className="flex flex-col">
                                <span className="text-lg font-black text-white">{whale.checkpointCount}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{translations.entities.checkpoints}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              whale.plan === 'ENTERPRISE' ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {whale.plan}
                            </span>
                          </td>
                          <td className="py-6">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                whale.potentialValue === 'HIGH' ? "bg-amber-500 animate-pulse" : "bg-sky-500"
                              )} />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{whale.potentialValue} POTENTIAL</span>
                            </div>
                          </td>
                          <td className="py-6 text-right">
                            <button 
                              onClick={() => setContactLead(whale)}
                              className="px-6 py-2.5 bg-sky-500 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/20"
                            >
                              {translations.common.contact_now}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-700">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-5xl font-black tracking-tighter text-white">{translations.entities.tenants}</h2>
                  <p className="text-slate-400 mt-2 font-medium text-lg">Quản lý khách hàng doanh nghiệp và cấu hình tính năng.</p>
                </div>
                <button 
                  onClick={() => setShowOnboarding(true)}
                  className="px-8 py-4 bg-sky-500 text-slate-950 rounded-2xl font-black text-sm hover:bg-sky-400 transition-all shadow-2xl shadow-sky-500/20 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Thêm {translations.entities.tenant} mới
                </button>
              </header>

              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm đơn vị khách hàng..." 
                      className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="px-8 py-6 font-black">Doanh nghiệp</th>
                      <th className="px-8 py-6 font-black">{translations.dashboard.health_score}</th>
                      <th className="px-8 py-6 font-black">Phân loại</th>
                      <th className="px-8 py-6 font-black">Gói & Hạn dùng</th>
                      <th className="px-8 py-6 font-black">Module</th>
                      <th className="px-8 py-6 font-black">{translations.common.status}</th>
                      <th className="px-8 py-6 font-black text-right">{translations.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-sky-500" size={48} />
                        </td>
                      </tr>
                    ) : tenants.map((tenant) => {
                      const insight = stats?.tenantInsights?.[tenant.id];
                      return (
                        <tr 
                          key={tenant.id} 
                          onClick={() => setSelectedTenantId(tenant.id)}
                          className={cn(
                            "hover:bg-white/5 transition-colors group cursor-pointer",
                            !tenant.is_active && tenant.provisioning_status === 'active' && "bg-red-500/5",
                            selectedTenantId === tenant.id && "bg-sky-500/5"
                          )}
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                                <Building2 size={24} />
                              </div>
                              <div>
                                <p className="font-black text-white">{tenant.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{tenant.subdomain}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[60px]">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-1000",
                                    (insight?.health?.score ?? 0) > 70 ? "bg-emerald-500" :
                                    (insight?.health?.score ?? 0) > 40 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${insight?.health?.score ?? 0}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-black",
                                (insight?.health?.score ?? 0) > 70 ? "text-emerald-400" :
                                (insight?.health?.score ?? 0) > 40 ? "text-amber-400" : "text-red-400"
                              )}>
                                {insight?.health?.score ?? 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              insight?.health?.status === 'Enterprise' ? "bg-indigo-500/20 text-indigo-400" :
                              insight?.health?.status === 'Trial' ? "bg-sky-500/20 text-sky-400" :
                              insight?.health?.status === 'At Risk' ? "bg-red-500/20 text-red-400 animate-pulse" :
                              "bg-slate-500/20 text-slate-400"
                            )}>
                              {insight?.health?.status ?? 'Free'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              tenant.plan === 'Freemium' ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
                            )}>
                              {tenant.plan}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                              EXP: {new Date(tenant.expiry_date).toLocaleDateString('vi-VN')}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-3 items-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleFeatureToggle(tenant.id, 'patrol', tenant.features_enabled?.patrol); }}
                                className={cn("w-3 h-3 rounded-full shadow-sm transition-all hover:scale-125", tenant.features_enabled?.patrol ? "bg-sky-500 shadow-sky-500/50" : "bg-slate-800")} 
                                title="Toggle Patrol" 
                              />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleFeatureToggle(tenant.id, 'attendance', tenant.features_enabled?.attendance); }}
                                className={cn("w-3 h-3 rounded-full shadow-sm transition-all hover:scale-125", tenant.features_enabled?.attendance ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-800")} 
                                title="Toggle Attendance" 
                              />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleFeatureToggle(tenant.id, 'ai_analytics', tenant.features_enabled?.ai_analytics); }}
                                className={cn("w-3 h-3 rounded-full shadow-sm transition-all hover:scale-125", tenant.features_enabled?.ai_analytics ? "bg-purple-500 shadow-purple-500/50" : "bg-slate-800")} 
                                title="Toggle AI Incident" 
                              />
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              {tenant.is_active ? (
                                <span className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                  <XCircle size={12} /> Suspended
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetPassword(tenant.id);
                                }}
                                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 flex items-center gap-1"
                                title="Reset Admin Password"
                              >
                                <Lock size={12} /> Reset Pass
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatus(tenant.id, tenant.is_active);
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  tenant.is_active 
                                    ? "text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20" 
                                    : "text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                                )}
                              >
                                {tenant.is_active ? "Disable" : "Restore"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Usage Timeline Side Panel */}
              {selectedTenantId && (
                <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-950 border-l border-white/10 shadow-2xl z-50 animate-in slide-in-from-right duration-500 flex flex-col">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setSelectedTenantId(null)}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div>
                        <h3 className="text-2xl font-black text-white">Usage Timeline</h3>
                        <p className="text-xs text-slate-500 font-medium">Hành trình trải nghiệm của Tenant</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-sky-500/10 rounded-2xl flex items-center justify-center">
                      <History className="text-sky-400" size={24} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-10">
                    {/* Health Summary */}
                    <div className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Health Metrics</span>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase">
                          {stats?.tenantInsights?.[selectedTenantId]?.health?.status}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-3xl font-black text-white">{stats?.tenantInsights?.[selectedTenantId]?.health?.score}%</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Health Score</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-3xl font-black text-white">{stats?.tenantInsights?.[selectedTenantId]?.health?.scansPerDay}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Scans / Day</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative space-y-8">
                      <div className="absolute left-4 top-2 bottom-2 w-px bg-white/5" />
                      {stats?.tenantInsights?.[selectedTenantId]?.timeline?.map((event, idx) => (
                        <div key={idx} className="relative pl-12">
                          <div className={cn(
                            "absolute left-2.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-slate-950 z-10",
                            event.type === 'registration' ? "bg-sky-500" :
                            event.type === 'first_patrol' ? "bg-emerald-500" : "bg-slate-500"
                          )} />
                          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-black text-white">{event.name}</h4>
                              <span className="text-[10px] font-bold text-slate-500">
                                {new Date(event.timestamp).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              {new Date(event.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Strategic Actions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="p-4 bg-sky-500 text-slate-950 rounded-2xl font-black text-xs hover:bg-sky-400 transition-all">
                          Gửi Email Upsell
                        </button>
                        <button className="p-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs hover:bg-white/10 transition-all">
                          Xem Chi Tiết
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-10 animate-in fade-in duration-700">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-5xl font-black tracking-tighter text-white">Quản lý Tin tức</h2>
                  <p className="text-slate-400 mt-2 font-medium text-lg">Xây dựng nội dung SEO, blog và thông báo hệ thống.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingNews(null);
                    setNewsForm({
                      title: '', slug: '', content: '', excerpt: '', category: 'Công nghệ',
                      status: 'draft', thumbnail: '', seo_title: '', seo_description: '', tags: ''
                    });
                    setIsNewsModalOpen(true);
                  }}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Viết bài mới
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {news.map((item) => (
                  <div key={item.id} className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[32px] p-6 shadow-2xl group">
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-6">
                      <img 
                        src={item.thumbnail || `https://picsum.photos/seed/${item.slug}/400/225`} 
                        alt={item.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                          item.status === 'published' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                        )}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-slate-500 font-medium mb-6 line-clamp-2">{item.excerpt}</p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingNews(item);
                            setNewsForm({
                              ...item,
                              tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
                            });
                            setIsNewsModalOpen(true);
                          }}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNews(item.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* News Editor Modal */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4">
          <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                  <Newspaper size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{editingNews ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Content Management System</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewsModalOpen(false)}
                className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
              >
                <XCircle size={28} />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tiêu đề bài viết</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <input 
                        type="text" 
                        required
                        value={newsForm.title}
                        onChange={(e) => setNewsForm({...newsForm, title: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Nhập tiêu đề hấp dẫn..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Slug (URL SEO)</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <input 
                        type="text" 
                        required
                        value={newsForm.slug}
                        onChange={(e) => setNewsForm({...newsForm, slug: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="tieu-de-bai-viet-2026"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Danh mục</label>
                      <select 
                        value={newsForm.category}
                        onChange={(e) => setNewsForm({...newsForm, category: e.target.value})}
                        className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none"
                      >
                        <option value="Công nghệ">Công nghệ</option>
                        <option value="An ninh">An ninh</option>
                        <option value="Sự kiện">Sự kiện</option>
                        <option value="Hướng dẫn">Hướng dẫn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Trạng thái</label>
                      <select 
                        value={newsForm.status}
                        onChange={(e) => setNewsForm({...newsForm, status: e.target.value})}
                        className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none"
                      >
                        <option value="draft">Bản nháp</option>
                        <option value="published">Công khai</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Thumbnail URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <input 
                        type="text" 
                        value={newsForm.thumbnail}
                        onChange={(e) => setNewsForm({...newsForm, thumbnail: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SEO Title</label>
                    <input 
                      type="text" 
                      value={newsForm.seo_title}
                      onChange={(e) => setNewsForm({...newsForm, seo_title: e.target.value})}
                      className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none"
                      placeholder="Tiêu đề hiển thị trên Google"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SEO Description</label>
                    <textarea 
                      value={newsForm.seo_description}
                      onChange={(e) => setNewsForm({...newsForm, seo_description: e.target.value})}
                      className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-medium text-sm focus:outline-none h-24 resize-none"
                      placeholder="Mô tả ngắn hiển thị trên Google..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tóm tắt bài viết</label>
                <textarea 
                  value={newsForm.excerpt}
                  onChange={(e) => setNewsForm({...newsForm, excerpt: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-medium text-sm focus:outline-none h-24 resize-none"
                  placeholder="Mô tả ngắn gọn nội dung bài viết..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nội dung bài viết (Markdown)</label>
                <textarea 
                  required
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({...newsForm, content: e.target.value})}
                  className="w-full px-6 py-6 bg-slate-950/50 border border-white/10 rounded-[32px] text-white font-mono text-sm focus:outline-none min-h-[400px]"
                  placeholder="# Tiêu đề lớn\n\nNội dung bài viết ở đây..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tags (phân cách bằng dấu phẩy)</label>
                <input 
                  type="text" 
                  value={newsForm.tags}
                  onChange={(e) => setNewsForm({...newsForm, tags: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white font-bold focus:outline-none"
                  placeholder="an ninh, cong nghe, 2026"
                />
              </div>
            </form>

            <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="px-8 py-4 text-slate-400 font-black text-sm uppercase tracking-widest hover:text-white transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSaveNews}
                className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
              >
                {editingNews ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
              </button>
            </div>
          </div>
        </div>
      )}
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
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{translations.entities.staff}</p>
                    </div>
                    <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] text-center">
                      <p className="text-2xl font-black text-white">{contactLead.checkpointCount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{translations.entities.checkpoints}</p>
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
                  <h3 className="text-3xl font-black text-white tracking-tight">Thêm {translations.entities.tenant}</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">Đăng ký {translations.entities.tenant} mới vào hệ thống.</p>
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

                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex gap-4">
                  <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Mặc định: Gói <strong className="text-emerald-400">Miễn phí</strong>, giới hạn <strong className="text-emerald-400">3 nhân sự</strong>. Hệ thống sẽ tự động cấp phát tài nguyên DevOps.
                  </p>
                </div>

                <button 
                  onClick={handleOnboarding}
                  disabled={!newCompanyName || !suggestedSubdomain || onboardingLoading}
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
    </div>
  );
};
