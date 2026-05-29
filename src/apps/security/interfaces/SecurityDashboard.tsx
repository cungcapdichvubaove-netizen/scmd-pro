import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Clock, AlertTriangle, User, ShieldCheck, ClipboardList, Building2, MapPin, CalendarCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SOSButton } from './components/SOSButton';
import { motion, AnimatePresence } from 'motion/react';
import { SCMDSuspense } from '../../common/interfaces/components/SCMDSuspense';
import { apiFetch } from '../../../lib/api';

import { useAuth } from '../../../context/AuthContext';

// Lazy loaded tabs
const PatrolDashboard = lazy(() => import('./PatrolDashboard').then(m => ({ default: m.PatrolDashboard })));
const IncidentReport = lazy(() => import('./IncidentReport').then(m => ({ default: m.IncidentReport })));
const AttendanceModule = lazy(() => import('./AttendanceModule').then(m => ({ default: m.AttendanceModule })));
const GuardTasksModule = lazy(() => import('./GuardTasksModule').then(m => ({ default: m.GuardTasksModule })));

type Tab = 'patrol' | 'incident' | 'attendance' | 'tasks' | 'profile';

interface SecurityDashboardProps {
  user?: { name?: string; staffId?: string; role?: string } | null;
}

interface GuardProfile {
  guard: {
    id: string;
    fullName: string;
    staffId: string | null;
    status: string;
  };
  scope: {
    vendor: { id: string; name: string; status: string } | null;
    site: { id: string; siteName: string; address: string; status: string } | null;
    contract: { id: string; contractName: string | null; contractCode: string | null; status: string } | null;
  };
  todayShift: {
    id: string;
    date: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    positionName: string;
    guardPost: { id: string; postName: string; postType?: string | null } | null;
  } | null;
  attendanceHistory: Array<{
    id: string;
    type: string;
    createdAt: string;
    isValid: boolean;
    lateMinutes: number | null;
    earlyLeaveMinutes: number | null;
    shiftSchedule: {
      id: string;
      date: string;
      shiftType: string;
      siteId: string;
      guardPost: { id: string; postName: string } | null;
    } | null;
  }>;
  warnings: string[];
}

const GuardProfileTab: React.FC<{ fallbackName: string; fallbackId: string }> = ({ fallbackName, fallbackId }) => {
  const [profile, setProfile] = useState<GuardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<GuardProfile>('/api/v1/security/guard/profile', { suppressErrorToast: true });
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError('Không tải được hồ sơ ca trực. Vui lòng đăng nhập lại hoặc thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <SCMDSuspense message="Đang tải hồ sơ ca trực..." />;

  if (error) {
    return (
      <div className="p-5">
        <div className="min-h-12 rounded-scmd-md border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
          {error}
        </div>
      </div>
    );
  }

  const guard = profile?.guard;
  const todayShift = profile?.todayShift;

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 p-5 pb-8"
    >
      {profile?.warnings?.length ? (
        <div className="rounded-scmd-md border border-amber-400/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">
          <div className="flex min-h-12 items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{profile.warnings.join(' ')}</span>
          </div>
        </div>
      ) : null}

      <section className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
        <div className="flex min-h-12 items-center gap-3">
          <User className="text-scmd-primary" size={22} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/50">Bảo vệ trực ca</p>
            <h2 className="text-xl font-black text-white">{guard?.fullName || fallbackName}</h2>
            <p className="text-sm font-bold text-scmd-silver/70">ID: {guard?.staffId || fallbackId}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <div className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
          <div className="flex min-h-12 items-center gap-3">
            <Building2 className="text-scmd-primary" size={20} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/50">Vendor</p>
              <p className="text-sm font-black text-white">{profile?.scope.vendor?.name || 'Chưa gắn vendor'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
          <div className="flex min-h-12 items-center gap-3">
            <MapPin className="text-scmd-primary" size={20} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/50">Site / Guard post</p>
              <p className="text-sm font-black text-white">{profile?.scope.site?.siteName || 'Chưa gắn site'}</p>
              <p className="text-xs font-bold text-scmd-silver/60">{todayShift?.guardPost?.postName || 'Chưa gắn chốt trực hôm nay'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
          <div className="flex min-h-12 items-center gap-3">
            <ShieldCheck className="text-scmd-primary" size={20} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/50">Hợp đồng / SLA</p>
              <p className="text-sm font-black text-white">
                {profile?.scope.contract?.contractName || profile?.scope.contract?.contractCode || 'Chưa gắn hợp đồng'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex min-h-12 items-center gap-3">
          <CalendarCheck className="text-scmd-primary" size={20} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/50">Ca trực hôm nay</p>
            <p className="text-sm font-black text-white">
              {todayShift ? `${todayShift.startTime} - ${todayShift.endTime} · ${todayShift.positionName}` : 'Chưa có ca trực'}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-scmd-silver/60">Check-in 7 ngày gần nhất</h3>
        {(profile?.attendanceHistory || []).length === 0 ? (
          <div className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-scmd-silver/70">
            Chưa có dữ liệu check-in trong 7 ngày gần nhất.
          </div>
        ) : (
          profile?.attendanceHistory.map((record) => (
            <div key={record.id} className="rounded-scmd-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex min-h-12 items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{record.type}</p>
                  <p className="text-xs font-bold text-scmd-silver/60">
                    {new Date(record.createdAt).toLocaleString('vi-VN')} · {record.shiftSchedule?.guardPost?.postName || 'Không có chốt'}
                  </p>
                </div>
                <span className={cn(
                  'rounded px-2 py-1 text-[10px] font-black uppercase',
                  record.isValid ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200',
                )}>
                  {record.isValid ? 'Hợp lệ' : 'Cần kiểm tra'}
                </span>
              </div>
            </div>
          ))
        )}
      </section>
    </motion.div>
  );
};

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ user: propsUser }) => {
  const { user: authUser, role: authRole } = useAuth();
  const user = propsUser || { ...authUser, role: authRole };
  
  const [activeTab, setActiveTab] = useState<Tab>('patrol');
  const displayName = user?.name || "Nhân viên";
  const displayId = user?.staffId || "---";
  const displayRole = user?.role || "Nhân viên";

  const renderContent = () => {
    return (
      <Suspense fallback={<SCMDSuspense message={`Đang tải phân hệ ${activeTab === 'patrol' ? 'Tuần tra' : activeTab === 'incident' ? 'Sự cố' : activeTab === 'attendance' ? 'Chấm công' : 'Việc làm'}...`} />}>
        {(() => {
          switch (activeTab) {
            case 'patrol':
              return <PatrolDashboard key="patrol" />;
            case 'incident':
              return <IncidentReport key="incident" />;
            case 'attendance':
              return <AttendanceModule key="attendance" />;
            case 'tasks':
              return <GuardTasksModule key="tasks" />;
            case 'profile':
              return <GuardProfileTab key="profile" fallbackName={displayName} fallbackId={displayId} />;
            default:
              return <PatrolDashboard key="patrol" />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-scmd-navy text-white overflow-hidden relative">
      {/* Header - Chuyên nghiệp & Tin cậy */}
      <header className="px-6 pt-12 pb-6 bg-scmd-surface/50 backdrop-blur-lg border-b border-white/5 shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">SCMD <span className="text-scmd-primary">PRO</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-1.5 py-0.5 bg-scmd-primary/20 text-scmd-primary text-[8px] font-black uppercase rounded tracking-widest border border-scmd-primary/30">
                {displayRole === 'guard' ? 'Nhân viên' : displayRole}
              </span>
              <p className="text-scmd-silver/60 text-[10px] font-black uppercase tracking-widest opacity-70 ">{displayName} • ID: {displayId}</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-scmd-md bg-white/5 flex items-center justify-center border border-white/5 shadow-scmd-lg">
            <User className="text-scmd-primary" size={20} />
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* SOS Button - Always Visible & Draggable */}
      <SOSButton />

      {/* Bottom Navigation - Native Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-scmd-surface/90 backdrop-blur-xl border-t border-white/5 px-4 pt-3 pb-8 safe-area-bottom flex justify-around items-center z-40">
        {([
          { id: 'patrol',     icon: ShieldCheck,    label: 'Tuần tra' },
          { id: 'incident',   icon: AlertTriangle,  label: 'Sự cố' },
          { id: 'attendance', icon: Clock,          label: 'Chấm công' },
          { id: 'tasks',      icon: ClipboardList,  label: 'Việc làm' },
          { id: 'profile',    icon: User,           label: 'Hồ sơ' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as Tab)}
            className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-300 relative min-w-0"
          >
            <div className={cn(
              "w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300",
              activeTab === id
                ? "bg-scmd-primary/15 text-scmd-primary scale-110"
                : "text-scmd-silver/40"
            )}>
              <Icon size={22} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase leading-none transition-all duration-300 text-center w-full",
              activeTab === id ? "text-scmd-primary" : "text-scmd-silver/40"
            )}>{label}</span>
            {activeTab === id && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-1 bg-scmd-primary rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
            )}
          </button>
        ))}
</nav>
    </div>
  );
};
