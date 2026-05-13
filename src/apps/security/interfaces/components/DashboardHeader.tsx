import React from 'react';
import { User } from 'lucide-react';

interface DashboardHeaderProps {
  user: any;
  role: string | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, role }) => {
  return (
    <header className="flex justify-between items-center mb-8 pb-6 border-b border-white/5 animate-in fade-in slide-in-from-top-4 duration-700">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
          Hệ thống <span className="text-scmd-primary">Chỉ huy</span>
        </h1>
        <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
          Giao diện dành cho quản trị viên hệ thống
          <span className="w-1 h-1 rounded-full bg-scmd-primary/20" />
          <span className="text-scmd-primary/60 border border-scmd-primary/20 px-1 rounded uppercase tracking-normal">V.3.9.3</span>
        </p>
      </div>
      
      <div className="flex items-center gap-4 bg-scmd-surface/50 p-2 pr-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-scmd-primary/10 flex items-center justify-center text-scmd-primary border border-scmd-primary/20">
          <User size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white tracking-tight uppercase">
              {user?.name || 'Administrator'}
            </span>
            <span className="px-1.5 py-0.5 bg-scmd-primary/10 text-scmd-primary text-[8px] font-black uppercase tracking-widest rounded border border-scmd-primary/20">
              {role === 'tenant-admin' ? 'Quản trị viên' : role}
            </span>
          </div>
          <p className="text-[9px] text-scmd-silver/40 font-bold uppercase tracking-widest">
            ID: {user?.staffId?.substring(0, 8) || 'ADMIN'}
          </p>
        </div>
      </div>
    </header>
  );
};
