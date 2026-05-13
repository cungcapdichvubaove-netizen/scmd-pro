import React, { useState, lazy, Suspense } from 'react';
import { Clock, AlertTriangle, User, ShieldCheck, ClipboardList } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SOSButton } from './components/SOSButton';
import { motion, AnimatePresence } from 'motion/react';
import { SCMDSuspense } from '../../common/interfaces/components/SCMDSuspense';

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
              return (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center"
                >
                  <User size={64} className="mb-4 opacity-20" />
                  <h2 className="text-xl font-bold text-slate-400">Hồ sơ nhân viên</h2>
                  <p className="mt-2 text-sm">Thông tin cá nhân và lịch sử ca làm việc.</p>
                </motion.div>
              );
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

