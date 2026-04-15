import React, { useState } from 'react';
import { QrCode, Clock, AlertTriangle, User, ShieldCheck } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { PatrolDashboard } from './PatrolDashboard';
import { IncidentReport } from './IncidentReport';
import { AttendanceModule } from './AttendanceModule';
import { SOSButton } from './components/SOSButton';
import { motion, AnimatePresence } from 'motion/react';

import translations from '../../common/constants/translations.json';

type Tab = 'patrol' | 'incident' | 'attendance' | 'profile';

export const SecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('patrol');

  const renderContent = () => {
    switch (activeTab) {
      case 'patrol':
        return <PatrolDashboard key="patrol" />;
      case 'incident':
        return <IncidentReport key="incident" />;
      case 'attendance':
        return <AttendanceModule key="attendance" />;
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
  };

  return (
    <div className="flex flex-col h-screen bg-scmd-navy text-slate-100 overflow-hidden relative">
      {/* Header - Chuyên nghiệp & Tin cậy */}
      <header className="px-6 pt-12 pb-6 bg-scmd-slate/50 backdrop-blur-lg border-b border-slate-700/50 shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SCMD <span className="text-scmd-cyber">Lite</span></h1>
            <p className="text-slate-400 text-sm font-medium">Nguyễn Văn An • ID: 8829</p>
          </div>
          <div className="w-10 h-10 rounded-scmd bg-slate-700 flex items-center justify-center border border-slate-600">
            <User className="text-slate-300" size={20} />
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* SOS Button - Always Visible & Draggable */}
      <SOSButton />

      {/* Bottom Navigation - Native Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-scmd-slate/90 backdrop-blur-xl border-t border-slate-700/50 px-6 pt-4 pb-8 safe-area-bottom flex justify-between items-center z-40">
        <button 
          onClick={() => setActiveTab('patrol')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'patrol' ? "text-scmd-cyber" : "text-slate-500"
          )}
        >
          <ShieldCheck size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{translations.entities.patrol}</span>
        </button>
        <button 
          onClick={() => setActiveTab('incident')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'incident' ? "text-scmd-cyber" : "text-slate-500"
          )}
        >
          <AlertTriangle size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{translations.entities.incident}</span>
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'attendance' ? "text-scmd-cyber" : "text-slate-500"
          )}
        >
          <Clock size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{translations.security.attendance}</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'profile' ? "text-scmd-cyber" : "text-slate-500"
          )}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Hồ sơ</span>
        </button>
      </nav>
    </div>
  );
};

