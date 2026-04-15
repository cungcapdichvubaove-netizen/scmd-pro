import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  MapPin, 
  BarChart3, 
  Plus, 
  X,
  Trash2,
  Smartphone,
  Shield, 
  Search, 
  LayoutDashboard, 
  LogOut, 
  Loader2, 
  ChevronRight,
  Target,
  UserPlus,
  CheckCircle2,
  Clock,
  Bell,
  CreditCard,
  AlertCircle,
  Sparkles,
  Zap,
  Camera,
  Check,
  QrCode,
  User,
  Eye,
  HelpCircle,
  Printer,
  RefreshCw,
  Edit3,
  Award,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../../../lib/utils';
import translations from '../../common/constants/translations.json';
import { getAuthHeaders } from '../../common/utils/auth';
import { fetchWithAuth } from '../../common/utils/api';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';
import { SCMDStatusBadge } from '../../common/interfaces/components/SCMDStatusBadge';
import { CommandFeed } from './components/CommandFeed';
import { TacticalMap } from './components/TacticalMap';
import { HelpCenter } from '../components/HelpCenter';
import { PriorityWidget } from './components/PriorityWidget';
import { WatcherInsights } from './components/WatcherInsights';
import { AttendanceReports } from './components/AttendanceReports';
import socket from '../../../lib/socket';

interface CheckItem {
  id: string;
  task: string;
  required: boolean;
  type: 'toggle' | 'photo' | 'text';
}

interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  qr_hash?: string;
  check_items?: CheckItem[];
}

interface Staff {
  id: string;
  staffId: string;
  name: string;
  role: string;
  username?: string;
  password?: string;
  qualifications?: string[];
  certificates?: string[];
  rewards?: string;
  disciplines?: string;
}

interface PatrolRoute {
  id: string;
  name: string;
  checkpoints: string[]; // IDs of checkpoints
  schedule: string;
  frequency: string;
}

interface PatrolLog {
  id: string;
  checkpointName: string;
  staffId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  isSuspicious: boolean;
  suspicionReason?: string;
  checkItemsData: any[];
  createdAt: string;
}

interface Stats {
  completionRate: number;
  totalCheckpoints: number;
  completedCheckpoints: number;
  dailyStats: { name: string; completion: number }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

interface PricingPlan {
  name: string;
  price: number;
  max_guards: number;
  ai_enabled: boolean;
}

interface PricingConfig {
  currency: string;
  methods: string[];
  plans: Record<string, PricingPlan>;
}

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string }> = ({ active, onClick, icon, label, badge }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3.5 rounded-scmd font-bold text-sm transition-all duration-300 relative",
      active 
        ? "bg-scmd-cyber text-slate-950 shadow-lg shadow-scmd-cyber/20 translate-x-1" 
        : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
    )}
  >
    <span className={cn("transition-transform duration-300", active && "scale-110")}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span className={cn(
        "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
        active ? "bg-slate-950 text-sky-400" : "bg-sky-500 text-slate-950"
      )}>
        {badge}
      </span>
    )}
  </button>
);

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; trend?: string; trendInverse?: boolean; subtext?: string }> = ({ label, value, icon, trend, trendInverse, subtext }) => (
  <SCMDCard glass={false} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      {trend && (
        <span className={cn(
          "px-2 py-1 rounded-lg text-[10px] font-black tracking-wider",
          trend.startsWith('+') 
            ? (trendInverse ? "bg-scmd-alert/10 text-scmd-alert" : "bg-scmd-safety/10 text-scmd-safety")
            : (trendInverse ? "bg-scmd-safety/10 text-scmd-safety" : "bg-scmd-alert/10 text-scmd-alert")
        )}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
    {subtext && <p className="text-[10px] text-slate-400 font-bold mt-1 italic">{subtext}</p>}
  </SCMDCard>
);

const SimulationOverlay = () => (
  <div className="fixed bottom-8 right-8 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-6 rounded-[32px] shadow-2xl z-50 animate-in slide-in-from-bottom-8">
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Giả lập truy cập</p>
    <div className="space-y-2">
      <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-xl transition-all border border-slate-700/50">
        Truy cập Domain Chính (scmd.vn)
      </button>
      <button className="w-full py-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-bold text-[11px] rounded-xl transition-all border border-sky-500/20">
        Truy cập Subdomain (vincom.scmd.vn)
      </button>
      <button className="w-full py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-bold text-[11px] rounded-xl transition-all border border-purple-500/20">
        Truy cập Super Admin (scmd.vn/admin)
      </button>
      <button className="w-full py-3 bg-orange-900/30 hover:bg-orange-900/40 text-orange-500 font-bold text-[11px] rounded-xl transition-all border border-orange-900/30">
        Thiết lập thực địa (Admin Learning)
      </button>
    </div>
  </div>
);

export const TenantAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'monitor' | 'targets' | 'staff' | 'subscription' | 'routes' | 'help'>('staff');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [patrolLogs, setPatrolLogs] = useState<PatrolLog[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<PatrolLog | null>(null);
  const [reportTab, setReportTab] = useState<'patrol' | 'attendance'>('patrol');
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [editingRoute, setEditingRoute] = useState<PatrolRoute | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<Staff | null>(null);
  
  // NOC Data
  const [nocFeed, setNocFeed] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [selectedMapPoint, setSelectedMapPoint] = useState<any>(null);

  // Watcher Data
  const [trustScore, setTrustScore] = useState<{ averageScore: number; status: string; trend?: any[] }>({ averageScore: 100, status: 'EXCELLENT', trend: [] });
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<any>(null);

  const sortedPatrolLogs = useMemo(() => {
    return [...patrolLogs].sort((a, b) => {
      // Priority 1: Suspicious logs first
      if (a.isSuspicious && !b.isSuspicious) return -1;
      if (!a.isSuspicious && b.isSuspicious) return 1;
      
      // Priority 2: Most recent first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [patrolLogs]);

  const sortedNocFeed = useMemo(() => {
    const statusPriority: Record<string, number> = { 'CRITICAL': 0, 'WARNING': 1, 'SUCCESS': 2 };
    return [...nocFeed].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [nocFeed]);

  const sortedAnomalies = useMemo(() => {
    const severityPriority: Record<string, number> = { 'CRITICAL': 0, 'WARNING': 1 };
    return [...anomalies].sort((a, b) => {
      const priorityA = severityPriority[a.severity] ?? 2;
      const priorityB = severityPriority[b.severity] ?? 2;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [anomalies]);

  const [stats, setStats] = useState<Stats>({
    completionRate: 0,
    totalCheckpoints: 0,
    completedCheckpoints: 0,
    dailyStats: []
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [activeSOS, setActiveSOS] = useState<any | null>(null);

  // Form states
  const [newCheckpoint, setNewCheckpoint] = useState({ 
    name: '', 
    lat: 10.762622, 
    lon: 106.660172,
    check_items: [] as CheckItem[]
  });
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    staffId: '', 
    role: 'Guard',
    username: '',
    password: '',
    qualifications: '',
    certificates: '',
    rewards: '',
    disciplines: ''
  });
  const [newRoute, setNewRoute] = useState({ name: '', checkpoints: [] as string[], schedule: '', frequency: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{ id: string, type: 'checkpoint' | 'staff' | 'route', name: string } | null>(null);
  const [showQRModal, setShowQRModal] = useState<Checkpoint | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<Staff | null>(null);
  const [printFields, setPrintFields] = useState<string[]>(['name', 'staffId', 'role', 'qualifications', 'certificates', 'rewards', 'disciplines']);

  useEffect(() => {
    fetchData();
    
    // Socket.io Real-time Listeners
    const tenantId = localStorage.getItem('scmd_tenant_id') || 'tenant_1';
    socket.emit('join_tenant', tenantId);

    socket.on('sos_alert', (data) => {
      console.log("SOS Alert Received:", data);
      setActiveSOS(data);
      // Add to NOC feed
      setNocFeed(prev => [{
        id: Math.random().toString(),
        title: "CẢNH BÁO SOS KHẨN CẤP",
        description: `${data.message} (Nhân viên: ${data.staffId})`,
        status: 'CRITICAL',
        timestamp: new Date().toISOString()
      }, ...prev]);
      
      // Play alert sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
        audio.play();
      } catch (e) {}
    });

    socket.on('patrol_update', (data) => {
      console.log("Patrol Update Received:", data);
      // Update feed
      setNocFeed(prev => [{
        id: Math.random().toString(),
        title: "Cập nhật tuần tra",
        description: `Nhân viên ${data.staffId} hoàn thành ${data.checkpointName}`,
        status: data.anomaly?.isAnomaly ? 'WARNING' : 'SUCCESS',
        timestamp: new Date().toISOString()
      }, ...prev]);

      // If anomaly, add to anomalies
      if (data.anomaly?.isAnomaly) {
        setAnomalies(prev => [{
          id: Math.random().toString(),
          title: "Bất thường tuần tra (AI)",
          description: data.anomaly.reason,
          severity: 'WARNING',
          timestamp: new Date().toISOString()
        }, ...prev]);
      }
    });

    return () => {
      socket.off('sos_alert');
      socket.off('patrol_update');
    };
  }, []);

  const fetchNocData = async () => {
    try {
      const [feed, map, prio, trust, anom] = await Promise.all([
        fetchWithAuth<any[]>('/api/tenant/command-center/feed').catch(() => []),
        fetchWithAuth<any[]>('/api/tenant/command-center/map-data').catch(() => []),
        fetchWithAuth<any[]>('/api/tenant/command-center/priorities').catch(() => []),
        fetchWithAuth<any>('/api/tenant/monitor/trust-score').catch(() => ({ averageScore: 100, status: 'EXCELLENT' })),
        fetchWithAuth<any>('/api/tenant/monitor/anomalies').catch(err => {
          if (err.message.includes('FEATURE_DISABLED')) return { anomalies: [], stats: null };
          return { anomalies: [], stats: null };
        })
      ]);

      setNocFeed(feed);
      setMapData(map);
      setPriorities(prio);
      setTrustScore(trust);
      setAnomalies(anom.anomalies || []);
      setAnomalyStats(anom.stats || null);
    } catch (err) {
      console.error("Error fetching NOC data:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchNocData();
      
      const [
        cpData, 
        staffData, 
        statsData, 
        notifData, 
        pricingData, 
        meData, 
        logsData, 
        routesData, 
        attendanceData
      ] = await Promise.all([
        fetchWithAuth<Checkpoint[]>('/api/tenant/checkpoints').catch(() => []),
        fetchWithAuth<Staff[]>('/api/tenant/staff').catch(() => []),
        fetchWithAuth<Stats>('/api/tenant/stats').catch(() => ({ completionRate: 0, totalCheckpoints: 0, completedCheckpoints: 0, dailyStats: [] })),
        fetchWithAuth<Notification[]>('/api/tenant/notifications').catch(() => []),
        fetchWithAuth<PricingConfig>('/api/subscriptions/pricing').catch(() => null),
        fetchWithAuth<any>('/api/me').catch(() => ({})),
        fetchWithAuth<PatrolLog[]>('/api/tenant/patrol-logs').catch(() => []),
        fetchWithAuth<PatrolRoute[]>('/api/tenant/routes').catch(() => []),
        fetchWithAuth<any[]>('/api/tenant/attendance').catch(() => [])
      ]);

      setCheckpoints(cpData);
      setStaff(staffData);
      setStats(statsData);
      setNotifications(notifData);
      setPricing(pricingData);
      setTenantInfo(meData?.tenant);
      setPatrolLogs(logsData);
      setRoutes(routesData);
      setAttendanceLogs(attendanceData);

      if (meData?.tenant?.is_new) {
        setShowWelcomeModal(true);
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      if (err.message.includes('401')) {
        localStorage.removeItem('scmd_user_role');
        localStorage.removeItem('scmd_jwt');
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  };
      
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/tenant/notifications/${id}/read`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCheckpoint = async (id: string) => {
    try {
      const res = await fetch(`/api/tenant/checkpoints/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setMessage({ text: "Đã xóa điểm tuần tra!", type: 'success' });
        fetchData();
      } else {
        setMessage({ text: "Không thể xóa điểm này!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi kết nối!", type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const res = await fetch(`/api/tenant/staff/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setMessage({ text: "Đã xóa nhân viên khỏi hệ thống!", type: 'success' });
        fetchData();
      } else {
        setMessage({ text: "Lỗi khi xóa nhân viên!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi kết nối!", type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/tenant/routes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setMessage({ text: "Đã xóa lộ trình!", type: 'success' });
        fetchData();
      } else {
        setMessage({ text: "Lỗi khi xóa lộ trình!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi kết nối!", type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUpgrade = async (planName: string) => {
    setIsSubmitting(true);
    try {
      // Mock upgrade API call
      await new Promise(r => setTimeout(r, 1500));
      setMessage({ text: `Yêu cầu nâng cấp gói ${planName} đã được gửi. Chúng tôi sẽ liên hệ bạn sớm!`, type: 'success' });
      setShowUpgradeModal(false);
    } catch (err) {
      setMessage({ text: "Lỗi khi gửi yêu cầu nâng cấp!", type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingCheckpoint ? `/api/tenant/checkpoints/${editingCheckpoint.id}` : '/api/tenant/checkpoints';
      const method = editingCheckpoint ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newCheckpoint.name,
          latitude: newCheckpoint.lat,
          longitude: newCheckpoint.lon,
          check_items: newCheckpoint.check_items
        })
      });
      if (res.ok) {
        await fetchData();
        setNewCheckpoint({ 
          name: '', 
          lat: 10.762622, 
          lon: 106.660172,
          check_items: []
        });
        setEditingCheckpoint(null);
        setMessage({ text: editingCheckpoint ? "Đã cập nhật điểm tuần tra!" : "Đã lưu điểm tuần tra. Hãy in mã QR!", type: 'success' });
      } else {
        setMessage({ text: "Lỗi lưu dữ liệu. Hãy kiểm tra lại!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Mất kết nối máy chủ!", type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEditingCheckpoint = (cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setNewCheckpoint({
      name: cp.name,
      lat: cp.latitude,
      lon: cp.longitude,
      check_items: cp.check_items || []
    });
    // Scroll to top of form or just let user know
    const formElement = document.getElementById('checkpoint-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingCheckpoint(null);
    setNewCheckpoint({ 
      name: '', 
      lat: 10.762622, 
      lon: 106.660172,
      check_items: []
    });
  };

  const handleDownloadPDF = async (log: PatrolLog) => {
    setMessage({ text: "Đang khởi tạo báo cáo AI...", type: 'success' });
    try {
      const content = `
        <div style="margin-bottom: 30px">
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px">THÔNG TIN CHUNG</h3>
          <p><strong>Mục tiêu:</strong> ${log.checkpointName}</p>
          <p><strong>Nhân viên:</strong> ${log.staffId}</p>
          <p><strong>Thời gian:</strong> ${new Date(log.startTime).toLocaleString('vi-VN')} - ${new Date(log.endTime).toLocaleString('vi-VN')}</p>
          <p><strong>Thời lượng:</strong> ${Math.round(log.durationSeconds)} giây</p>
        </div>

        <div style="margin-bottom: 30px; padding: 20px; background: ${log.isSuspicious ? '#fef2f2' : '#f0fdf4'}; border-radius: 12px; border: 1px solid ${log.isSuspicious ? '#fee2e2' : '#dcfce7'}">
          <h3 style="color: ${log.isSuspicious ? '#991b1b' : '#166534'}; margin-top: 0">TRẠNG THÁI GIÁM ĐỊNH</h3>
          <p style="font-size: 18px; font-weight: 900; color: ${log.isSuspicious ? '#dc2626' : '#10b981'}">
            ${log.isSuspicious ? 'NGHI NGỜ GIAN LẬN' : 'HỢP LỆ'}
          </p>
          ${log.suspicionReason ? `<p><strong>Lý do:</strong> ${log.suspicionReason}</p>` : ''}
        </div>

        <div>
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px">DỮ LIỆU CHECKLIST</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px">
            <thead>
              <tr style="background: #f8fafc">
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left">Nhiệm vụ</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              ${(log.checkItemsData || []).map(item => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 12px">${item.task}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">
                    ${item.type === 'toggle' ? (item.value ? '✅ Xong' : '❌ Chưa') : (item.value ? '📸 Đã chụp' : '➖ Trống')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const res = await fetch("/api/reports/generate-pdf", {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `BÁO CÁO TUẦN TRA: ${log.checkpointName}`,
          content
        })
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_SCMD_${log.checkpointName}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setMessage({ text: "Đã tải báo cáo PDF AI thành công!", type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi khi tạo báo cáo PDF từ máy chủ!", type: 'error' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExportWatcherReport = async () => {
    setMessage({ text: "Đang khởi tạo báo cáo Watcher AI...", type: 'success' });
    try {
      const content = `
        <div style="margin-bottom: 30px">
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px">TỔNG QUAN HỆ THỐNG</h3>
          <p><strong>Chỉ số tin cậy trung bình:</strong> ${trustScore.averageScore}%</p>
          <p><strong>Trạng thái hệ thống:</strong> ${trustScore.status === 'EXCELLENT' ? 'TỐT' : 'CẢNH BÁO'}</p>
          <p><strong>Tổng số bất thường ghi nhận:</strong> ${anomalyStats?.totalCount || 0}</p>
        </div>

        <div style="margin-bottom: 30px">
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px">PHÂN TÍCH BẤT THƯỜNG</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px">
            <thead>
              <tr style="background: #f8fafc">
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left">Loại bất thường</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">Số lượng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 12px">Cảnh báo đứng yên</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">${anomalyStats?.stationaryCount || 0}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 12px">Bỏ sót điểm tuần tra</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">${anomalyStats?.missedCount || 0}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 12px">Cảnh báo nghiêm trọng</td>
                <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center">${anomalyStats?.criticalCount || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px">DANH SÁCH CHI TIẾT CÁC VỤ VIỆC</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px">
            <thead>
              <tr style="background: #f8fafc">
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left">Thời gian</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left">Loại</th>
                <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left">Mô tả</th>
              </tr>
            </thead>
            <tbody>
              ${anomalies.map(a => `
                <tr>
                  <td style="border: 1px solid #e2e8f0; padding: 12px">${new Date(a.timestamp).toLocaleString('vi-VN')}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px">${a.title}</td>
                  <td style="border: 1px solid #e2e8f0; padding: 12px">${a.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const res = await fetch("/api/reports/generate-pdf", {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: "BÁO CÁO GIÁM ĐỊNH TIN CẬY & CHỐNG GIAN LẬN",
          content
        })
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_Watcher_AI_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setMessage({ text: "Đã xuất báo cáo Watcher AI thành công!", type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi khi tạo báo cáo PDF từ máy chủ!", type: 'error' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePrintStaffProfile = (staff: Staff) => {
    const doc = new jsPDF();
    
    // Navy Style Header
    doc.setFillColor(2, 6, 23); // scmd-navy
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(0, 255, 242); // scmd-cyber
    doc.text("HỒ SƠ NHÂN SỰ CHUYÊN NGHIỆP", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${tenantInfo?.name || 'SCMD Pro'} • HỆ THỐNG QUẢN TRỊ AN NINH TẬP TRUNG`, 105, 32, { align: "center" });
    
    let currentY = 55;
    doc.setTextColor(2, 6, 23);
    
    const addSection = (title: string, content: string | string[]) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), 20, currentY);
      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      if (Array.isArray(content)) {
        content.forEach(item => {
          doc.text(`• ${item}`, 25, currentY);
          currentY += 6;
        });
      } else {
        const splitText = doc.splitTextToSize(content || 'N/A', 170);
        doc.text(splitText, 20, currentY);
        currentY += (splitText.length * 6);
      }
      currentY += 10;
    };

    if (printFields.includes('name')) addSection("Họ và tên", staff.name);
    if (printFields.includes('staffId')) addSection("Mã nhân viên", staff.staffId);
    if (printFields.includes('role')) addSection("Vai trò", staff.role);
    if (printFields.includes('qualifications')) addSection("Bằng cấp", staff.qualifications || []);
    if (printFields.includes('certificates')) addSection("Chứng chỉ", staff.certificates || []);
    if (printFields.includes('rewards')) addSection("Khen thưởng", staff.rewards || 'Không có');
    if (printFields.includes('disciplines')) addSection("Kỷ luật", staff.disciplines || 'Không có');

    // Signatures
    currentY = Math.max(currentY, 240);
    doc.setFontSize(10);
    doc.text("NHÂN VIÊN KÝ TÊN", 40, currentY, { align: "center" });
    doc.text("XÁC NHẬN CỦA QUẢN TRỊ VIÊN", 150, currentY, { align: "center" });
    doc.setFont("helvetica", "italic");
    doc.text("(Ký và ghi rõ họ tên)", 40, currentY + 5, { align: "center" });
    doc.text("(Ký tên và đóng dấu)", 150, currentY + 5, { align: "center" });

    doc.save(`Ho_so_${staff.staffId}_${staff.name}.pdf`);
    setShowPrintModal(null);
    setMessage({ text: "Đã tạo hồ sơ nhân sự thành công!", type: 'success' });
  };

  const addCheckItem = () => {
    const newItem: CheckItem = {
      id: Math.random().toString(36).substr(2, 9),
      task: '',
      required: true,
      type: 'toggle'
    };
    setNewCheckpoint(prev => ({
      ...prev,
      check_items: [...prev.check_items, newItem]
    }));
  };

  const removeCheckItem = (id: string) => {
    setNewCheckpoint(prev => ({
      ...prev,
      check_items: prev.check_items.filter(item => item.id !== id)
    }));
  };

  const updateCheckItem = (id: string, updates: Partial<CheckItem>) => {
    setNewCheckpoint(prev => ({
      ...prev,
      check_items: prev.check_items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...newStaff,
        qualifications: typeof newStaff.qualifications === 'string' ? newStaff.qualifications.split(',').map(s => s.trim()).filter(s => s) : newStaff.qualifications,
        certificates: typeof newStaff.certificates === 'string' ? newStaff.certificates.split(',').map(s => s.trim()).filter(s => s) : newStaff.certificates
      };
      
      const url = editingStaff ? `/api/tenant/staff/${editingStaff.id}` : '/api/tenant/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchData();
        setNewStaff({ 
          name: '', 
          staffId: '', 
          role: 'Guard',
          username: '',
          password: '',
          qualifications: '',
          certificates: '',
          rewards: '',
          disciplines: ''
        });
        setEditingStaff(null);
        setShowAddStaffModal(false);
        setMessage({ 
          text: editingStaff ? "Đã cập nhật hồ sơ nhân sự thành công!" : "Đã kích hoạt hồ sơ nhân sự v2.0 thành công!", 
          type: 'success' 
        });
      } else {
        setMessage({ text: "Mã nhân viên hoặc tên đăng nhập đã tồn tại!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi kết nối hệ thống!", type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEditingStaff = (s: Staff) => {
    setEditingStaff(s);
    setNewStaff({
      name: s.name,
      staffId: s.staffId,
      role: s.role,
      username: s.username || '',
      password: s.password || '',
      qualifications: Array.isArray(s.qualifications) ? s.qualifications.join(', ') : (s.qualifications || ''),
      certificates: Array.isArray(s.certificates) ? s.certificates.join(', ') : (s.certificates || ''),
      rewards: s.rewards || '',
      disciplines: s.disciplines || ''
    });
    // Scroll to form
    const formElement = document.getElementById('staff-form-header');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditingStaff = () => {
    setEditingStaff(null);
    setNewStaff({ 
      name: '', 
      staffId: '', 
      role: 'Guard',
      username: '',
      password: '',
      qualifications: '',
      certificates: '',
      rewards: '',
      disciplines: ''
    });
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoute.checkpoints.length === 0) {
      setMessage({ text: "Vui lòng chọn ít nhất một điểm tuần tra!", type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingRoute ? `/api/tenant/routes/${editingRoute.id}` : '/api/tenant/routes';
      const method = editingRoute ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(newRoute)
      });
      if (res.ok) {
        await fetchData();
        setNewRoute({ name: '', checkpoints: [], schedule: '', frequency: '' });
        setEditingRoute(null);
        setMessage({ text: editingRoute ? "Đã cập nhật lộ trình!" : "Đã tạo lộ trình tuần tra mới!", type: 'success' });
      } else {
        setMessage({ text: "Lỗi khi lưu lộ trình!", type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "Lỗi kết nối!", type: 'error' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const startEditingRoute = (route: PatrolRoute) => {
    setEditingRoute(route);
    setNewRoute({
      name: route.name,
      checkpoints: route.checkpoints,
      schedule: route.schedule,
      frequency: route.frequency
    });
    const formElement = document.getElementById('route-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleCheckpointInRoute = (id: string) => {
    setNewRoute(prev => ({
      ...prev,
      checkpoints: prev.checkpoints.includes(id)
        ? prev.checkpoints.filter(cpId => cpId !== id)
        : [...prev.checkpoints, id]
    }));
  };

  return (
    <>
      {/* SOS Modal Overlay */}
      <AnimatePresence>
        {activeSOS && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(239,68,68,0.5)] border-8 border-red-500"
            >
              <div className="bg-red-500 p-8 text-white text-center animate-pulse">
                <AlertTriangle size={80} className="mx-auto mb-4" />
                <h2 className="text-4xl font-black uppercase tracking-tighter">TÍN HIỆU SOS</h2>
                <p className="text-red-100 font-bold mt-2">PHẢN ỨNG KHẨN CẤP NGAY LẬP TỨC</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên yêu cầu</p>
                    <p className="text-xl font-black text-slate-900">{activeSOS.staffId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí hiện tại</p>
                    <p className="text-xl font-black text-slate-900">
                      {activeSOS.location.lat.toFixed(6)}, {activeSOS.location.lon.toFixed(6)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Thông điệp</p>
                  <p className="text-lg font-bold text-red-700 italic">"{activeSOS.message}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveSOS(null)}
                    className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all"
                  >
                    ĐÓNG
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://www.google.com/maps?q=${activeSOS.location.lat},${activeSOS.location.lon}`, '_blank');
                    }}
                    className="py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={20} /> XEM BẢN ĐỒ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex h-screen bg-scmd-navy text-slate-100 overflow-hidden">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #qr-print-area, #qr-print-area * {
              visibility: visible;
            }
            #qr-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: white !important;
              z-index: 9999;
            }
            #qr-print-area h3, #qr-print-area p {
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      {/* QR Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(null)}
              className="absolute inset-0 bg-scmd-navy/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-scmd-slate rounded-[40px] p-10 shadow-2xl text-center border border-slate-800"
            >
              <div id="qr-print-area" className="flex flex-col items-center">
                <div className="mb-8 text-center">
                  <h3 className="text-2xl font-black text-white mb-2">Mã QR {translations.entities.patrol}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{showQRModal.name}</p>
                </div>
                
                <div className="bg-white p-8 rounded-[32px] border-2 border-dashed border-slate-200 mb-8 flex items-center justify-center shadow-inner">
                  <QRCodeSVG 
                    value={showQRModal.qr_hash || showQRModal.id} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="text-center mb-8 hidden print:block">
                  <p className="text-slate-900 font-black text-xl uppercase tracking-tighter">SCMD PRO • THINK ZERO</p>
                  <p className="text-slate-500 text-[10px] font-bold mt-1">Hệ thống quản lý tuần tra thông minh</p>
                </div>
              </div>

              <div className="space-y-3 no-print">
                <SCMDButton 
                  onClick={() => window.print()}
                  className="w-full h-14"
                >
                  <Printer size={18} /> In mã QR ngay
                </SCMDButton>
                <button 
                  onClick={() => setShowQRModal(null)}
                  className="w-full py-4 text-slate-400 font-bold rounded-2xl hover:bg-white/5 transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl"
            >
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                  <Zap className="text-white w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Nâng cấp hệ thống</h3>
                <p className="text-slate-500 font-medium">Mở khóa toàn bộ sức mạnh AI và quản lý không giới hạn.</p>
              </div>

              <div className="space-y-4 mb-10">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-emerald-500 transition-all cursor-pointer" onClick={() => handleUpgrade('PRO')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Shield className="text-emerald-500" size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">Gói PRO</p>
                      <p className="text-xs text-slate-500 font-bold">Dành cho doanh nghiệp vừa</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500" />
                </div>
                
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-indigo-500 transition-all cursor-pointer" onClick={() => handleUpgrade('ENTERPRISE')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Sparkles className="text-indigo-500" size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">Gói ENTERPRISE</p>
                      <p className="text-xs text-slate-500 font-bold">Tùy chỉnh theo yêu cầu</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500" />
                </div>
              </div>

              <button 
                onClick={() => setShowUpgradeModal(null)}
                className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Để sau
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Xác nhận xóa?</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium">
                Bạn có chắc chắn muốn xóa <strong>{showConfirmModal.name}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    if (showConfirmModal.type === 'checkpoint') handleDeleteCheckpoint(showConfirmModal.id);
                    else if (showConfirmModal.type === 'staff') handleDeleteStaff(showConfirmModal.id);
                    else if (showConfirmModal.type === 'route') handleDeleteRoute(showConfirmModal.id);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWelcomeModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] p-10 shadow-2xl overflow-hidden"
            >
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -mr-20 -mt-20" />
              
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                  <Sparkles className="text-white w-10 h-10" />
                </div>
                
                <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                  Chào mừng {tenantInfo?.name} <br />
                  đến với SCMD Lite!
                </h2>
                
                <p className="text-slate-500 mb-10 leading-relaxed">
                  Hệ thống của bạn đã sẵn sàng. Bạn muốn bắt đầu bằng việc tạo Điểm tuần tra đầu tiên hay xem hướng dẫn?
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setActiveTab('targets');
                      setShowWelcomeModal(false);
                    }}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                  >
                    Tạo điểm tuần tra ngay
                    <ChevronRight size={18} />
                  </button>
                  <button 
                    onClick={() => setShowWelcomeModal(false)}
                    className="w-full py-4 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-2xl transition-all"
                  >
                    Tôi muốn tham quan trước
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Map Point Quick View Modal */}
      <AnimatePresence>
        {selectedMapPoint && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMapPoint(null)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-scmd-slate rounded-[40px] p-8 shadow-2xl border border-slate-700"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    selectedMapPoint.status === 'SOS' ? "bg-scmd-alert text-white" : "bg-scmd-cyber/20 text-scmd-cyber"
                  )}>
                    {selectedMapPoint.status === 'SOS' ? <AlertCircle size={24} /> : <MapPin size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedMapPoint.name}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tọa độ thực tế: {selectedMapPoint.lat}, {selectedMapPoint.lon}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMapPoint(null)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {selectedMapPoint.type === 'ALERT' && selectedMapPoint.description && (
                  <div className="p-4 bg-scmd-alert/10 rounded-2xl border border-scmd-alert/20">
                    <p className="text-[10px] font-black text-scmd-alert uppercase tracking-widest mb-2">Chi tiết sự cố</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{selectedMapPoint.description}</p>
                  </div>
                )}
                <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Lượt tuần tra gần nhất</p>
                  {selectedMapPoint.lastPatrol ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <User size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{selectedMapPoint.lastPatrol.staff}</p>
                        <p className="text-xs text-slate-500">{new Date(selectedMapPoint.lastPatrol.time).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic">Chưa có dữ liệu tuần tra</p>
                  )}
                </div>

                <div className="p-4 bg-scmd-navy/50 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ảnh chụp hiện trường</p>
                  <div className="aspect-video bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${selectedMapPoint.id}/400/225`} 
                      className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                    <Camera size={24} className="absolute text-slate-700 opacity-20" />
                  </div>
                </div>

                <SCMDButton 
                  onClick={() => setSelectedMapPoint(null)}
                  className="w-full h-14"
                >
                  Đóng Quick View
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Chi tiết tuần tra</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Mã log: #{selectedLog.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Thời gian thực hiện</p>
                    <p className="text-sm font-bold text-slate-900">
                      {new Date(selectedLog.startTime).toLocaleTimeString('vi-VN')} - {new Date(selectedLog.endTime).toLocaleTimeString('vi-VN')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={12} className="text-slate-400" />
                      <p className="text-xs text-slate-500 font-medium">{Math.round(selectedLog.durationSeconds)} giây</p>
                    </div>
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl border",
                    selectedLog.isSuspicious ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
                  )}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Trạng thái trung thực</p>
                    <div className="flex items-center gap-2">
                      {selectedLog.isSuspicious ? <AlertCircle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                      <p className={cn("text-sm font-bold", selectedLog.isSuspicious ? "text-red-700" : "text-emerald-700")}>
                        {selectedLog.isSuspicious ? "Nghi ngờ gian lận" : "Hợp lệ"}
                      </p>
                    </div>
                    {selectedLog.suspicionReason && (
                      <p className="text-[10px] text-red-500 mt-2 font-bold bg-white/50 px-2 py-1 rounded-md border border-red-100 italic">
                        Lý do: {selectedLog.suspicionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dữ liệu Checklist chi tiết</h4>
                  <div className="space-y-3">
                    {selectedLog.checkItemsData.map((item: any, idx: number) => (
                      <div key={idx} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            item.value ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                          )}>
                            {item.type === 'photo' ? <Camera size={20} /> : <Check size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.task}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{item.type}</span>
                              {item.is_gallery_upload && (
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1 rounded">GALLERY</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.type === 'toggle' && (
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              item.value ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {item.value ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                            </div>
                          )}
                          {item.type === 'photo' && item.value && (
                            <div className="relative group">
                              <img 
                                src={item.value} 
                                className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100 group-hover:border-emerald-500 transition-all cursor-zoom-in" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          {item.type === 'text' && (
                            <p className="text-sm text-slate-600 italic">"{item.value || 'Không có ghi chú'}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                  Đóng báo cáo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "bg-scmd-navy text-white flex flex-col shrink-0 border-r border-slate-800/50 transition-all duration-500 relative z-30",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-8 flex items-center justify-between overflow-hidden">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-4 animate-in fade-in duration-500">
              <div className="w-12 h-12 bg-scmd-cyber rounded-scmd flex items-center justify-center shadow-2xl shadow-scmd-cyber/40 rotate-3">
                <Shield className="text-slate-950" size={28} />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tight leading-none">SCMD <span className="text-scmd-cyber">LITE</span></h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">QUẢN TRỊ</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-10 h-10 bg-scmd-cyber rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-scmd-cyber/20">
              <Shield className="text-slate-950" size={20} />
            </div>
          )}
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "absolute -right-3 top-12 w-6 h-6 bg-scmd-cyber text-slate-950 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-40",
              isSidebarCollapsed && "rotate-180"
            )}
          >
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label={isSidebarCollapsed ? "" : "Bảng điều hành"}
          />
          <NavItem 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            icon={<BarChart3 size={20} />}
            label={isSidebarCollapsed ? "" : "Báo cáo Smart"}
          />
          <NavItem 
            active={activeTab === 'monitor'} 
            onClick={() => setActiveTab('monitor')}
            icon={<Eye size={20} />}
            label={isSidebarCollapsed ? "" : "The Watcher"}
          />
          <NavItem 
            active={activeTab === 'targets'} 
            onClick={() => setActiveTab('targets')}
            icon={<Target size={20} />}
            label={isSidebarCollapsed ? "" : "Các điểm tuần tra"}
          />
          <NavItem 
            active={activeTab === 'staff'} 
            onClick={() => setActiveTab('staff')}
            icon={<Users size={20} />}
            label={isSidebarCollapsed ? "" : "Nhân sự"}
            badge={isSidebarCollapsed ? undefined : "Mới"}
          />
          <NavItem 
            active={activeTab === 'routes'} 
            onClick={() => setActiveTab('routes')}
            icon={<Zap size={20} />}
            label={isSidebarCollapsed ? "" : "Lộ trình & Tuyến"}
          />
          <NavItem 
            active={activeTab === 'subscription'} 
            onClick={() => setActiveTab('subscription')}
            icon={<CreditCard size={20} />}
            label={isSidebarCollapsed ? "" : "Gói cước & Billing"}
          />
          <NavItem 
            active={activeTab === 'help'} 
            onClick={() => setActiveTab('help')}
            icon={<HelpCircle size={20} />}
            label={isSidebarCollapsed ? "" : "Help Center"}
          />
        </nav>

        <div className="p-6 mt-auto">
          {!isSidebarCollapsed && (
            <div className="bg-scmd-slate/50 rounded-scmd p-4 border border-slate-800/50 mb-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-scmd-cyber/20 flex items-center justify-center">
                  <Zap size={14} className="text-scmd-cyber" />
                </div>
                <p className="text-xs font-bold text-slate-300">Gói {tenantInfo?.plan}</p>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-scmd-cyber h-full transition-all duration-1000" 
                  style={{ width: `${(staff.length / (tenantInfo?.max_employees || 3)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">
                {staff.length}/{tenantInfo?.max_employees} nhân viên đã dùng
              </p>
            </div>
          )}
          
          <button className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl font-bold text-sm transition-all group",
            isSidebarCollapsed && "justify-center px-0"
          )}>
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            {!isSidebarCollapsed && "Đăng xuất"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative bg-slate-950/30">
        {/* Background Mesh Gradients for V2.0 PRO feel */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-scmd-cyber/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-[20%] w-[30%] h-[30%] bg-scmd-cyber/5 rounded-full blur-[80px]" />
        </div>

        <div className="absolute top-8 right-8 z-20 flex items-center gap-4">
          <div className="px-3 py-1 bg-emerald-500/20 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-500/20">
            SYSTEM V2.0.5 - AUDIT OK
          </div>
          <button className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
            Đăng xuất
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="max-w-6xl mx-auto mb-6 space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3 text-amber-800">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{n.message}</p>
                </div>
                <button 
                  onClick={() => markAsRead(n.id)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  Đã hiểu
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-4xl font-black text-white tracking-tight">Bảng điều hành NOC</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Hệ thống giám sát an ninh thời gian thực</p>
                  </div>
                  <div className="flex gap-3">
                    <SCMDButton className="bg-slate-900 border-slate-800 text-slate-400 h-10 px-4">
                      <Clock size={14} className="mr-2" /> Lịch sử NOC
                    </SCMDButton>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-8 h-[600px]">
                  {/* Tactical Map - Centerpiece */}
                  <div className="col-span-8 h-full">
                    <TacticalMap 
                      points={mapData} 
                      onPointClick={(point) => setSelectedMapPoint(point)} 
                    />
                  </div>

                  {/* Activity Feed */}
                  <div className="col-span-4 h-full">
                    <CommandFeed items={sortedNocFeed} />
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-6">
                      <StatCard 
                        label="Tỉ lệ hoàn thành" 
                        value={`${stats.completionRate}%`} 
                        icon={<CheckCircle2 className="text-scmd-safety" />} 
                        trend="+5.2%"
                      />
                      <StatCard 
                        label="Lượt tuần tra" 
                        value={stats.completedCheckpoints.toString()} 
                        icon={<Shield className="text-scmd-cyber" />} 
                        subtext={`Trên tổng số ${stats.totalCheckpoints} điểm`}
                      />
                      <StatCard 
                        label="Sự cố SOS" 
                        value={nocFeed.filter(i => i.type === 'SOS').length.toString()} 
                        icon={<AlertCircle className="text-scmd-alert" />} 
                        trend={nocFeed.filter(i => i.type === 'SOS').length > 0 ? "+1" : "0"}
                        trendInverse
                      />
                      <SCMDCard 
                        onClick={() => setActiveTab('staff')}
                        className="bg-slate-950 p-6 rounded-[32px] border border-slate-800 shadow-2xl hover:border-sky-500/50 transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Users className="text-sky-400" size={24} />
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quản lý nhân sự</p>
                          <p className="text-2xl font-black text-white">{staff.length} Nhân viên</p>
                          <div className="mt-4 flex items-center gap-2 text-sky-400 text-[10px] font-black uppercase tracking-widest">
                            Quản lý ngay <ChevronRight size={12} />
                          </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all" />
                      </SCMDCard>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <PriorityWidget 
                      tasks={priorities} 
                      onExport={() => setMessage({ text: "Đang xuất báo cáo ca trực...", type: 'success' })} 
                    />
                  </div>
                </div>

                {/* Staff Preview Section */}
                <div className="bg-slate-900/50 rounded-[40px] border border-slate-800 p-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Nhân sự trực tuyến</h3>
                      <p className="text-sky-400/60 text-[10px] font-black uppercase tracking-widest mt-1">Trạng thái quân số thời gian thực</p>
                    </div>
                    <SCMDButton 
                      onClick={() => setActiveTab('staff')}
                      className="bg-slate-800 text-sky-400 border-slate-700 hover:bg-sky-500/10 h-10 px-4"
                    >
                      Xem tất cả <ChevronRight size={14} className="ml-1" />
                    </SCMDButton>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    {staff.slice(0, 4).map((s) => (
                      <div key={s.id} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-sky-500/30 transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-sky-400 transition-colors">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-black text-white text-sm">{s.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.staffId}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-sky-500/10 text-sky-400 px-2 py-1 rounded-md">
                            {s.role}
                          </span>
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                            <span className="text-[9px] font-bold text-emerald-500 uppercase">Online</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {staff.length === 0 && (
                      <div className="col-span-4 py-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                        <p className="text-slate-500 font-bold">Chưa có dữ liệu nhân sự</p>
                        <button 
                          onClick={() => setActiveTab('staff')}
                          className="mt-4 text-sky-400 text-xs font-black uppercase tracking-widest hover:underline"
                        >
                          Thiết lập ngay
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header className="flex justify-between items-start">
                  <div>
                    <h2 className="text-5xl font-black tracking-tight text-white">Smart Report</h2>
                    <p className="text-slate-400 mt-3 font-medium text-lg">Phân tích hiệu suất tuần tra và tính trung thực thời gian thực.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 shadow-2xl mt-2">
                    <button 
                      onClick={() => setReportTab('patrol')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${reportTab === 'patrol' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      Tuần tra
                    </button>
                    <button 
                      onClick={() => setReportTab('attendance')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${reportTab === 'attendance' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                      Chấm công
                    </button>
                  </div>
                </header>

                {reportTab === 'patrol' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard 
                    label="Tỷ lệ hoàn thành" 
                    value={`${stats?.completionRate ?? 0}%`} 
                    trend="+5.2%" 
                    icon={<CheckCircle2 className="text-emerald-500" size={20} />} 
                  />
                  <StatCard 
                    label="Điểm kiểm tra" 
                    value={`${stats?.completedCheckpoints ?? 0} / ${stats?.totalCheckpoints ?? 0}`} 
                    subtext="Mục tiêu đang hoạt động"
                    icon={<MapPin className="text-sky-500" size={20} />} 
                  />
                  <StatCard 
                    label="Tổng lượt tuần tra" 
                    value={String(patrolLogs?.length ?? 0)} 
                    trend="+12"
                    icon={<Shield className="text-indigo-500" size={20} />} 
                  />
                  <StatCard 
                    label="Cảnh báo gian lận" 
                    value={String(patrolLogs?.filter(l => l.isSuspicious)?.length ?? 0)} 
                    trend="-2"
                    trendInverse
                    icon={<AlertCircle className="text-red-500" size={20} />} 
                  />
                  <StatCard 
                    label="Quân số hiện tại" 
                    value={String(staff.length)} 
                    trend="+1"
                    icon={<Users className="text-sky-400" size={20} />} 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="font-black text-lg text-slate-900">Biểu đồ hiệu suất tuần tra</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hoàn thành</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.dailyStats || []}>
                          <defs>
                            <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="completion" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorComp)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                        <Sparkles className="text-emerald-400" size={24} />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">AI Insights</h3>
                      <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Hệ thống phát hiện 2 trường hợp nghi ngờ gian lận tại <strong>Nhà kho A</strong>. Hãy kiểm tra lại lịch sử chi tiết.
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-xs font-medium text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hiệu suất tăng 12% so với tuần trước
                        </li>
                        <li className="flex items-center gap-3 text-xs font-medium text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Tất cả mục tiêu đã được quét ít nhất 1 lần
                        </li>
                      </ul>
                    </div>
                    <button className="relative z-10 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl transition-all mt-8">
                      Xem phân tích AI
                    </button>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-950 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-black text-white mb-6">Phân tích Bằng cấp & Chứng chỉ</h3>
                    <div className="space-y-4">
                      {['PCCC', 'Sơ cấp cứu', 'Võ thuật', 'Nghiệp vụ bảo vệ'].map((cert) => {
                        const count = staff.filter(s => s.certificates?.includes(cert) || s.qualifications?.includes(cert)).length;
                        const percentage = staff.length > 0 ? (count / staff.length) * 100 : 0;
                        return (
                          <div key={cert} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">{cert}</span>
                              <span className="text-sky-400">{count} NV ({Math.round(percentage)}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-sky-500 h-full transition-all duration-1000" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
                    <h3 className="text-xl font-black text-white mb-6">Thành tích & Kỷ luật</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Tổng khen thưởng</p>
                        <p className="text-4xl font-black text-emerald-400">{staff.filter(s => s.rewards && s.rewards !== 'Không').length}</p>
                      </div>
                      <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Tổng kỷ luật</p>
                        <p className="text-4xl font-black text-red-400">{staff.filter(s => s.disciplines && s.disciplines !== 'Không').length}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('staff')}
                      className="w-full mt-6 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl hover:bg-slate-800 transition-all border border-slate-800"
                    >
                      Chi tiết hồ sơ nhân sự
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-900">Nhật ký tuần tra chi tiết</h3>
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2">
                      <Search size={14} /> Lọc dữ liệu
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                          <th className="px-8 py-4">Thời gian</th>
                          <th className="px-8 py-4">Nhân viên</th>
                          <th className="px-8 py-4">Mục tiêu</th>
                          <th className="px-8 py-4">Thời lượng</th>
                          <th className="px-8 py-4">Trạng thái</th>
                          <th className="px-8 py-4 text-right">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedPatrolLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-8 py-5 text-sm font-mono text-slate-500">
                              {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-200">
                                  {log.staffId.slice(-2)}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{log.staffId}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-sm font-black text-slate-900">{log.checkpointName}</td>
                            <td className="px-8 py-5 text-sm font-medium text-slate-600">{Math.round(log.durationSeconds)}s</td>
                            <td className="px-8 py-5">
                              {log.isSuspicious ? (
                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-red-100">
                                  <AlertCircle size={12} /> Nghi ngờ
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit border border-emerald-100">
                                  <CheckCircle2 size={12} /> Hợp lệ
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setSelectedLog(log)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-xs font-black hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                >
                                  Chi tiết
                                </button>
                                <button 
                                  onClick={() => handleDownloadPDF(log)}
                                  className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                  title="Tải báo cáo PDF"
                                >
                                  <Printer size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
                ) : (
                  <AttendanceReports logs={attendanceLogs} />
                )}
              </div>
            )}

            {activeTab === 'monitor' && (
              <WatcherInsights 
                trustScore={trustScore} 
                anomalies={sortedAnomalies} 
                anomalyStats={anomalyStats}
                onExportReport={handleExportWatcherReport} 
              />
            )}

            {activeTab === 'targets' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header id="checkpoint-form">
                  <h2 className="text-4xl font-black tracking-tight text-white">Mục tiêu tuần tra</h2>
                  <p className="text-slate-400 mt-2 font-medium">Thiết lập và quản lý các điểm kiểm soát an ninh.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-slate-900">
                          {editingCheckpoint ? "Sửa mục tiêu" : "Thêm điểm mới"}
                        </h3>
                        {editingCheckpoint && (
                          <button 
                            onClick={cancelEditing}
                            className="text-xs font-bold text-red-500 hover:text-red-600"
                          >
                            Hủy sửa
                          </button>
                        )}
                      </div>
                      <form onSubmit={handleAddCheckpoint} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên mục tiêu</label>
                          <input 
                            type="text" 
                            required
                            value={newCheckpoint.name}
                            onChange={(e) => setNewCheckpoint({...newCheckpoint, name: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                            placeholder="Ví dụ: Cổng số 3"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vĩ độ (Lat)</label>
                            <input 
                              type="number" 
                              step="any"
                              required
                              value={newCheckpoint.lat}
                              onChange={(e) => setNewCheckpoint({...newCheckpoint, lat: parseFloat(e.target.value)})}
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-sm font-bold text-slate-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kinh độ (Lon)</label>
                            <input 
                              type="number" 
                              step="any"
                              required
                              value={newCheckpoint.lon}
                              onChange={(e) => setNewCheckpoint({...newCheckpoint, lon: parseFloat(e.target.value)})}
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-sm font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Checklist Builder */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist</label>
                            <button 
                              type="button"
                              onClick={addCheckItem}
                              className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                              <Plus size={12} /> Thêm đầu việc
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {newCheckpoint.check_items.map((item, index) => (
                              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 relative group hover:border-emerald-200 transition-colors">
                                <button 
                                  type="button"
                                  onClick={() => removeCheckItem(item.id)}
                                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <X size={14} />
                                </button>
                                
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {['Kiểm tra PCCC', 'Khóa cửa kho', 'Kiểm tra điện', 'Vệ sinh'].map(suggestion => (
                                    <button
                                      key={suggestion}
                                      type="button"
                                      onClick={() => updateCheckItem(item.id, { task: suggestion })}
                                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 hover:border-emerald-500 hover:text-emerald-500 transition-all"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                                <input 
                                  type="text"
                                  placeholder={`Đầu việc ${index + 1}...`}
                                  value={item.task}
                                  onChange={(e) => updateCheckItem(item.id, { task: e.target.value })}
                                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 placeholder:text-slate-400"
                                />
                                
                                <div className="flex items-center gap-4">
                                  <select 
                                    value={item.type}
                                    onChange={(e) => updateCheckItem(item.id, { type: e.target.value as any })}
                                    className="text-[10px] font-black bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/10"
                                  >
                                    <option value="toggle">Xác nhận (Toggle)</option>
                                    <option value="photo">Chụp ảnh (Photo)</option>
                                    <option value="text">Ghi chú (Text)</option>
                                  </select>
                                  
                                  <label className="flex items-center gap-2 cursor-pointer group/check">
                                    <div className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      item.required ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-300"
                                    )}>
                                      {item.required && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <input 
                                      type="checkbox"
                                      checked={item.required}
                                      onChange={(e) => updateCheckItem(item.id, { required: e.target.checked })}
                                      className="hidden"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase group-hover/check:text-slate-600 transition-colors">Bắt buộc</span>
                                  </label>
                                </div>
                              </div>
                            ))}
                            
                            {newCheckpoint.check_items.length === 0 && (
                              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                                  Chưa có đầu việc nào
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className={cn(
                            "w-full py-4 text-slate-950 font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                            editingCheckpoint ? "bg-scmd-cyber shadow-scmd-cyber/20" : "bg-emerald-500 shadow-emerald-500/20"
                          )}
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" /> : (editingCheckpoint ? <Check size={20} /> : <Plus size={20} />)}
                          {editingCheckpoint ? "Cập nhật mục tiêu" : "Lưu mục tiêu"}
                        </button>
                      </form>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden">
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                          <Sparkles className="text-emerald-400" size={20} />
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          <strong>Mẹo:</strong> Bạn có thể lấy tọa độ từ Google Maps. Hệ thống sẽ tự động sinh mã QR bảo mật cho điểm này.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900">Danh sách mục tiêu</h3>
                        <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {checkpoints.length} Điểm
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {checkpoints.map((cp) => (
                          <div key={cp.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all border border-slate-100">
                                <MapPin size={24} />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg">{cp.name}</p>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{cp.latitude.toFixed(6)}, {cp.longitude.toFixed(6)}</p>
                                {cp.check_items && cp.check_items.length > 0 && (
                                  <div className="flex gap-1.5 mt-2">
                                    {cp.check_items.map((item, idx) => (
                                      <div 
                                        key={idx} 
                                        className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-emerald-200 transition-colors" 
                                        title={item.task} 
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                cp.status === 'completed' 
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                  : "bg-slate-50 text-slate-400 border-slate-100"
                              )}>
                                {cp.status === 'completed' ? 'Đã xong' : 'Chờ'}
                              </span>
                              <button 
                                onClick={() => startEditingCheckpoint(cp)}
                                className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Sửa điểm"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => setShowQRModal(cp)}
                                className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                title="In mã QR"
                              >
                                <QrCode size={18} />
                              </button>
                              <button 
                                onClick={() => setShowConfirmModal({ id: cp.id, type: 'checkpoint', name: cp.name })}
                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {checkpoints.length === 0 && (
                          <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                              <Target className="text-slate-200" size={40} />
                            </div>
                            <p className="text-slate-400 font-bold">Chưa có mục tiêu tuần tra nào.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header className="flex items-center gap-4">
                  <h2 className="text-4xl font-black tracking-tight text-white">Quản lý quân số</h2>
                  <span className="px-3 py-1 bg-scmd-cyber text-slate-950 text-[10px] font-black rounded-full uppercase tracking-widest mt-2">V2.0 PRO</span>
                </header>
                <p className="text-slate-400 mt-2 font-medium">Thêm và quản lý nhân viên bảo vệ tại mục tiêu.</p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Add Staff Form */}
                  <div className="lg:col-span-4">
                    <SCMDCard className="p-8 bg-white/95 backdrop-blur-xl border-slate-200 shadow-2xl rounded-[40px]">
                      <h3 id="staff-form-header" className="text-2xl font-black text-slate-900 mb-8 flex items-center justify-between">
                        {editingStaff ? "Sửa nhân viên" : "Thêm nhân viên"}
                        {editingStaff && (
                          <button 
                            onClick={cancelEditingStaff}
                            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                          >
                            Hủy sửa
                          </button>
                        )}
                      </h3>
                      
                      <form onSubmit={handleAddStaff} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Họ và tên</label>
                          <input 
                            type="text" 
                            required
                            value={newStaff.name}
                            onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-bold placeholder:text-slate-300"
                            placeholder="Ví dụ: Nguyễn Văn A"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã nhân viên (Staff ID)</label>
                          <input 
                            type="text" 
                            required
                            value={newStaff.staffId}
                            onChange={(e) => setNewStaff({...newStaff, staffId: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-mono font-bold placeholder:text-slate-300"
                            placeholder="Ví dụ: NV001"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tên đăng nhập</label>
                          <input 
                            type="text" 
                            required
                            value={newStaff.username}
                            onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-bold placeholder:text-slate-300"
                            placeholder="username"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mật khẩu</label>
                          <input 
                            type="password" 
                            required
                            value={newStaff.password}
                            onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-bold placeholder:text-slate-300"
                            placeholder="••••••••"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vai trò</label>
                          <select 
                            value={newStaff.role}
                            onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-bold appearance-none"
                          >
                            <option value="Guard">Nhân viên bảo vệ</option>
                            <option value="Supervisor">Giám sát</option>
                            <option value="Admin">Quản trị viên</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bằng cấp</label>
                            <textarea 
                              value={newStaff.qualifications}
                              onChange={(e) => setNewStaff({...newStaff, qualifications: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-medium h-20 text-xs"
                              placeholder="Đại học..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chứng chỉ</label>
                            <textarea 
                              value={newStaff.certificates}
                              onChange={(e) => setNewStaff({...newStaff, certificates: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-medium h-20 text-xs"
                              placeholder="PCCC..."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Khen thưởng</label>
                            <textarea 
                              value={newStaff.rewards}
                              onChange={(e) => setNewStaff({...newStaff, rewards: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-medium h-20 text-xs"
                              placeholder="Thành tích..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kỷ luật</label>
                            <textarea 
                              value={newStaff.disciplines}
                              onChange={(e) => setNewStaff({...newStaff, disciplines: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 focus:ring-4 focus:ring-scmd-cyber/20 focus:border-scmd-cyber outline-none transition-all font-medium h-20 text-xs"
                              placeholder="Vi phạm..."
                            />
                          </div>
                        </div>

                        <SCMDButton 
                          type="submit"
                          disabled={isSubmitting}
                          className={cn(
                            "w-full py-5 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 mt-4",
                            editingStaff ? "bg-scmd-cyber shadow-scmd-cyber/20" : "bg-scmd-safety shadow-emerald-500/20"
                          )}
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" /> : (editingStaff ? <Check size={20} /> : <UserPlus size={20} />)}
                          {editingStaff ? "Cập nhật hồ sơ" : "Thêm nhân viên"}
                        </SCMDButton>
                      </form>
                    </SCMDCard>
                  </div>

                  {/* Right Column: Staff List */}
                  <div className="lg:col-span-8">
                    <SCMDCard className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-2xl rounded-[40px] overflow-hidden">
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Danh sách nhân sự</h3>
                        <div className="relative w-64">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Tìm nhân sự..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-scmd-cyber/10 focus:border-scmd-cyber transition-all"
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              <th className="px-8 py-6">Nhân viên</th>
                              <th className="px-8 py-6">Mã NV</th>
                              <th className="px-8 py-6">Vai trò</th>
                              <th className="px-8 py-6 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {staff.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-scmd-cyber/20 group-hover:text-scmd-cyber transition-all border border-slate-200">
                                      <User size={20} />
                                    </div>
                                    <div>
                                      <p className="font-black text-sm text-slate-900">{s.name}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{s.username || 'n/a'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    {s.staffId}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200">
                                    {s.role === 'Guard' ? 'Bảo vệ' : s.role === 'Supervisor' ? 'Giám sát' : 'Quản trị'}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end gap-3">
                                    <button 
                                      onClick={() => setSelectedStaffDetail(s)}
                                      className="p-3 text-slate-400 hover:text-scmd-cyber transition-all"
                                      title="Xem chi tiết"
                                    >
                                      <Eye size={18} />
                                    </button>
                                    <button 
                                      onClick={() => startEditingStaff(s)}
                                      className="p-3 text-slate-400 hover:text-scmd-cyber transition-all"
                                      title="Sửa hồ sơ"
                                    >
                                      <Edit3 size={18} />
                                    </button>
                                    <button 
                                      onClick={() => setShowPrintModal(s)}
                                      className="p-3 text-slate-400 hover:text-scmd-cyber transition-all"
                                      title="In hồ sơ"
                                    >
                                      <Printer size={18} />
                                    </button>
                                    <button 
                                      onClick={() => setShowConfirmModal({ id: s.id, type: 'staff', name: s.name })}
                                      className="p-3 text-slate-400 hover:text-red-500 transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </SCMDCard>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'routes' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header id="route-form">
                  <h2 className="text-4xl font-black tracking-tight text-white">Lộ trình & Tuyến</h2>
                  <p className="text-slate-400 mt-2 font-medium">Thiết lập các tuyến đường tuần tra và lịch trình thực hiện.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-slate-900">
                          {editingRoute ? "Sửa lộ trình" : "Tạo tuyến mới"}
                        </h3>
                        {editingRoute && (
                          <button 
                            onClick={() => {
                              setEditingRoute(null);
                              setNewRoute({ name: '', checkpoints: [], schedule: '', frequency: '' });
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-600"
                          >
                            Hủy sửa
                          </button>
                        )}
                      </div>
                      <form onSubmit={handleAddRoute} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên tuyến đường</label>
                          <input 
                            type="text" 
                            required
                            value={newRoute.name}
                            onChange={(e) => setNewRoute({...newRoute, name: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                            placeholder="Ví dụ: Tuyến tuần tra đêm khu A"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Khung giờ (Schedule)</label>
                          <input 
                            type="text" 
                            required
                            value={newRoute.schedule}
                            onChange={(e) => setNewRoute({...newRoute, schedule: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                            placeholder="Ví dụ: 22:00 - 06:00"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tần suất (Frequency)</label>
                          <input 
                            type="text" 
                            required
                            value={newRoute.frequency}
                            onChange={(e) => setNewRoute({...newRoute, frequency: e.target.value})}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400"
                            placeholder="Ví dụ: Mỗi 2 tiếng"
                          />
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn các điểm tuần tra</label>
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {checkpoints.map(cp => (
                              <button
                                key={cp.id}
                                type="button"
                                onClick={() => toggleCheckpointInRoute(cp.id)}
                                className={cn(
                                  "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group",
                                  newRoute.checkpoints.includes(cp.id)
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-slate-50 border-slate-100 hover:border-slate-300"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                    newRoute.checkpoints.includes(cp.id) ? "bg-emerald-500 text-white" : "bg-white text-slate-400"
                                  )}>
                                    <MapPin size={14} />
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold",
                                    newRoute.checkpoints.includes(cp.id) ? "text-emerald-900" : "text-slate-600"
                                  )}>{cp.name}</span>
                                </div>
                                {newRoute.checkpoints.includes(cp.id) && (
                                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                    <Check size={12} strokeWidth={4} />
                                  </div>
                                )}
                              </button>
                            ))}
                            {checkpoints.length === 0 && (
                              <p className="text-xs text-slate-400 italic text-center py-4">Chưa có điểm tuần tra nào để chọn.</p>
                            )}
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSubmitting}
                          className={cn(
                            "w-full py-4 text-slate-950 font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2",
                            editingRoute ? "bg-scmd-cyber shadow-scmd-cyber/20" : "bg-emerald-500 shadow-emerald-500/20"
                          )}
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" /> : (editingRoute ? <Check size={20} /> : <Plus size={20} />)}
                          {editingRoute ? "Cập nhật lộ trình" : "Lưu lộ trình"}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900">Danh sách tuyến đường</h3>
                        <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {routes.length} Tuyến
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {routes.map((route) => (
                          <div key={route.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all border border-slate-100">
                                <Zap size={24} />
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-lg">{route.name}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                                    <Clock size={12} /> {route.schedule}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-slate-500 font-bold">
                                    <Target size={12} /> {route.checkpoints.length} điểm
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                  {route.checkpoints.map(cpId => {
                                    const cp = checkpoints.find(c => c.id === cpId);
                                    return cp ? (
                                      <span key={cpId} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold">
                                        {cp.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => startEditingRoute(route)}
                                className="p-2.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Sửa lộ trình"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => setShowConfirmModal({ id: route.id, type: 'route', name: route.name })}
                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {routes.length === 0 && (
                          <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                              <Zap className="text-slate-200" size={40} />
                            </div>
                            <p className="text-slate-400 font-bold">Chưa có lộ trình tuần tra nào.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'subscription' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <header>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900">Gói cước & Billing</h2>
                  <p className="text-slate-500 mt-2 font-medium">Quản lý hạn mức và nâng cấp tính năng hệ thống.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <span className="px-4 py-1.5 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            Gói hiện tại: {tenantInfo?.plan}
                          </span>
                          {tenantInfo?.plan === 'Freemium' && (
                            <span className="text-[10px] text-amber-600 font-black flex items-center gap-1.5 uppercase tracking-wider">
                              <AlertCircle size={14} /> Đang bị giới hạn
                            </span>
                          )}
                        </div>
                        <h3 className="text-3xl font-black mb-3 text-slate-900 tracking-tight">Trạng thái tài khoản</h3>
                        <p className="text-slate-500 mb-8 font-medium max-w-md">Bạn đang sử dụng gói {tenantInfo?.plan}. Nâng cấp để mở khóa toàn bộ sức mạnh AI và tăng giới hạn nhân sự.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-colors">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">Nhân viên tối đa</p>
                            <p className="text-2xl font-black text-slate-900">{tenantInfo?.max_employees} người</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-emerald-200 transition-colors">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">AI Incident Analysis</p>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", tenantInfo?.features_enabled?.ai_analytics ? "bg-emerald-500" : "bg-slate-300")} />
                              <p className={cn("text-2xl font-black", tenantInfo?.features_enabled?.ai_analytics ? "text-emerald-600" : "text-slate-400")}>
                                {tenantInfo?.features_enabled?.ai_analytics ? "Đã kích hoạt" : "Đã khóa"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20"
                          >
                            Nâng cấp ngay
                          </button>
                          <button className="px-10 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all">
                            Lịch sử thanh toán
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {pricing && Object.entries(pricing.plans).map(([key, plan]) => {
                        const p = plan as PricingPlan;
                        const isPro = key === 'PRO';
                        return (
                          <div key={key} className={cn(
                            "bg-white p-8 rounded-[40px] border transition-all duration-500 relative group",
                            isPro ? "border-emerald-500 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500 scale-[1.02]" : "border-slate-200 hover:border-slate-300"
                          )}>
                            {isPro && (
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                Phổ biến nhất
                              </div>
                            )}
                            <div className="flex justify-between items-start mb-6">
                              <h4 className="text-2xl font-black text-slate-900">{p.name}</h4>
                              {isPro && <Sparkles className="text-emerald-500" size={24} />}
                            </div>
                            <div className="mb-8">
                              <span className="text-4xl font-black text-slate-900 tracking-tighter">{p.price.toLocaleString('vi-VN')}</span>
                              <span className="text-slate-400 text-sm font-bold ml-2 uppercase tracking-widest">đ / tháng</span>
                            </div>
                            <ul className="space-y-4 mb-10">
                              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Check className="text-emerald-500" size={12} strokeWidth={4} />
                                </div>
                                Tối đa {p.max_guards} nhân viên
                              </li>
                              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                <div className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                  p.ai_enabled ? "bg-emerald-50" : "bg-slate-50"
                                )}>
                                  <Check className={p.ai_enabled ? "text-emerald-500" : "text-slate-300"} size={12} strokeWidth={4} />
                                </div>
                                AI Incident Analysis {!p.ai_enabled && "(Khóa)"}
                              </li>
                              <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Check className="text-emerald-500" size={12} strokeWidth={4} />
                                </div>
                                Báo cáo Smart Dashboard
                              </li>
                            </ul>
                            <button 
                              onClick={() => handleUpgrade(p.name)}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2",
                                isPro 
                                  ? "bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20 hover:bg-emerald-600" 
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white"
                              )}
                            >
                              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
                              Chọn gói {p.name}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                      <h3 className="text-xl font-black mb-6 text-slate-900">Hỗ trợ thanh toán</h3>
                      <div className="space-y-3">
                        {pricing?.methods.map(m => (
                          <div key={m} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-colors cursor-pointer">
                            <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{m}</span>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-all group-hover:translate-x-1" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                          <Shield className="text-emerald-400" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Cần hỗ trợ?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
                          Đội ngũ SCMD luôn sẵn sàng hỗ trợ bạn cấu hình gói cước phù hợp nhất với quy mô doanh nghiệp.
                        </p>
                        <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all border border-white/10">
                          Liên hệ ngay
                        </button>
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'help' && (
              <div className="h-[calc(100vh-160px)] animate-in fade-in duration-500">
                <HelpCenter />
              </div>
            )}
          </div>
        )}
      </main>

      <SimulationOverlay />

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddStaffModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddStaffModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 bg-slate-900/50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Thêm nhân sự mới</h3>
                    <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mt-1">Thiết lập hồ sơ nhân viên v2.0</p>
                  </div>
                  <button 
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleAddStaff} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Họ và tên</label>
                      <input 
                        type="text" 
                        required
                        value={newStaff.name}
                        onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mã nhân viên</label>
                      <input 
                        type="text" 
                        required
                        value={newStaff.staffId}
                        onChange={(e) => setNewStaff({...newStaff, staffId: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-mono font-bold"
                        placeholder="NV001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên đăng nhập</label>
                      <input 
                        type="text" 
                        required
                        value={newStaff.username}
                        onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                        placeholder="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mật khẩu truy cập</label>
                      <input 
                        type="password" 
                        required
                        value={newStaff.password}
                        onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vai trò</label>
                      <select 
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-bold"
                      >
                        <option value="Guard">Nhân viên bảo vệ</option>
                        <option value="Supervisor">Giám sát</option>
                        <option value="Admin">Quản trị viên</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bằng cấp</label>
                      <textarea 
                        value={newStaff.qualifications}
                        onChange={(e) => setNewStaff({...newStaff, qualifications: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium h-20"
                        placeholder="Ví dụ: Đại học An ninh, Cao đẳng Luật..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chứng chỉ</label>
                      <textarea 
                        value={newStaff.certificates}
                        onChange={(e) => setNewStaff({...newStaff, certificates: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium h-20"
                        placeholder="Ví dụ: Chứng chỉ PCCC, Võ thuật..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Khen thưởng</label>
                      <textarea 
                        value={newStaff.rewards}
                        onChange={(e) => setNewStaff({...newStaff, rewards: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium h-20"
                        placeholder="Các thành tích đã đạt được..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kỷ luật</label>
                      <textarea 
                        value={newStaff.disciplines}
                        onChange={(e) => setNewStaff({...newStaff, disciplines: e.target.value})}
                        className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all font-medium h-20"
                        placeholder="Các vi phạm (nếu có)..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddStaffModal(false)}
                      className="flex-1 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-sky-500 text-slate-950 font-black rounded-2xl hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                      Kích hoạt hồ sơ
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Staff Profile Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintModal(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 bg-slate-900/50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Tùy chỉnh in hồ sơ</h3>
                    <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mt-1">Nhân viên: {showPrintModal.name}</p>
                  </div>
                  <button 
                    onClick={() => setShowPrintModal(null)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400">Chọn các trường thông tin muốn hiển thị trên bản in PDF:</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'name', label: 'Họ và tên' },
                      { id: 'staffId', label: 'Mã nhân viên' },
                      { id: 'role', label: 'Vai trò' },
                      { id: 'qualifications', label: 'Bằng cấp' },
                      { id: 'certificates', label: 'Chứng chỉ' },
                      { id: 'rewards', label: 'Khen thưởng' },
                      { id: 'disciplines', label: 'Kỷ luật' }
                    ].map((field) => (
                      <label key={field.id} className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:border-sky-500/50 transition-all group">
                        <input 
                          type="checkbox" 
                          checked={printFields.includes(field.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPrintFields([...printFields, field.id]);
                            } else {
                              setPrintFields(printFields.filter(f => f !== field.id));
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500/20"
                        />
                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-slate-950 flex gap-4">
                <button 
                  onClick={() => setShowPrintModal(null)}
                  className="flex-1 py-4 bg-slate-900 text-slate-400 font-black rounded-2xl hover:bg-slate-800 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={() => handlePrintStaffProfile(showPrintModal)}
                  className="flex-1 py-4 bg-sky-500 text-slate-950 font-black rounded-2xl hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Xuất PDF Pro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 font-bold text-sm",
              message.type === 'success' ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
            )}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Staff Detail Modal */}
      <AnimatePresence>
        {selectedStaffDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaffDetail(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-scmd-cyber/10 rounded-2xl flex items-center justify-center text-scmd-cyber">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedStaffDetail.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Mã NV: {selectedStaffDetail.staffId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStaffDetail(null)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</p>
                    <p className="text-sm font-bold text-slate-900">{selectedStaffDetail.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên đăng nhập</p>
                    <p className="text-sm font-bold text-slate-900">@{selectedStaffDetail.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-scmd-cyber">
                      <Award size={18} />
                      <h4 className="text-sm font-black uppercase tracking-widest">Bằng cấp</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedStaffDetail.qualifications) && selectedStaffDetail.qualifications.length > 0 ? (
                        selectedStaffDetail.qualifications.map((q, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">{q}</span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa có thông tin</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-scmd-cyber">
                      <ShieldCheck size={18} />
                      <h4 className="text-sm font-black uppercase tracking-widest">Chứng chỉ</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedStaffDetail.certificates) && selectedStaffDetail.certificates.length > 0 ? (
                        selectedStaffDetail.certificates.map((c, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">{c}</span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa có thông tin</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-600 mb-3">
                      <Sparkles size={18} />
                      <h4 className="text-sm font-black uppercase tracking-widest">Khen thưởng</h4>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {selectedStaffDetail.rewards || "Chưa có ghi nhận khen thưởng."}
                    </p>
                  </div>

                  <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                    <div className="flex items-center gap-2 text-red-600 mb-3">
                      <AlertTriangle size={18} />
                      <h4 className="text-sm font-black uppercase tracking-widest">Kỷ luật</h4>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {selectedStaffDetail.disciplines || "Chưa có ghi nhận kỷ luật."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <SCMDButton 
                  onClick={() => {
                    setSelectedStaffDetail(null);
                    startEditingStaff(selectedStaffDetail);
                  }}
                  className="flex-1 bg-scmd-cyber text-white"
                >
                  Sửa hồ sơ
                </SCMDButton>
                <SCMDButton 
                  onClick={() => setSelectedStaffDetail(null)}
                  variant="ghost"
                  className="flex-1"
                >
                  Đóng
                </SCMDButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};
