import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Activity, 
  Phone, 
  Calendar, 
  Eye, 
  Edit3, 
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Staff } from '../types';
import { getDisplayName, getRoleInfo, getStatusInfo, fmtDate } from '../StaffTab.utils.js';

interface StaffCardListProps {
  pagedStaff: Staff[];
  onlineUserIds: string[];
  isLoading: boolean;
  staff: Staff[];
  itemsPerPage: number;
  setSelectedStaffDetail: (v: Staff | null) => void;
  startEditingStaff: (s: Staff) => void;
  setShowConfirmModal: (v: { id: string; type: 'checkpoint' | 'staff' | 'route'; name: string } | null) => void;
}

export const StaffCardList: React.FC<StaffCardListProps> = ({
  pagedStaff,
  onlineUserIds,
  isLoading,
  staff,
  itemsPerPage,
  setSelectedStaffDetail,
  startEditingStaff,
  setShowConfirmModal,
}) => {
  return (
    <div className="md:hidden space-y-4 p-4 max-h-[65vh] overflow-y-auto no-scrollbar border-t border-white/5">
      {isLoading && staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
          <Loader2 className="animate-spin text-scmd-primary" size={32} />
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Đang tải dữ liệu nhân sự...</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {Array.isArray(pagedStaff) && pagedStaff.map((s, idx) => {
            const isOnline = Array.isArray(onlineUserIds) && onlineUserIds.includes(s.id);
            const role = getRoleInfo(s.role);
            const status = getStatusInfo((s as any).status, isOnline);
            const displayName = getDisplayName(s);

            return (
              <motion.div
                key={`card-${s.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: (idx % itemsPerPage) * 0.05 }}
                className="bg-scmd-navy/40 border border-white/5 rounded-3xl p-5 space-y-4 relative overflow-hidden group active:border-scmd-primary/30 transition-all shadow-lg"
              >
                <div className="absolute top-0 right-0 p-3">
                  <div className={cn(
                    'px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider',
                    role.color
                  )}>
                    {role.label}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-scmd-navy border border-white/5 flex items-center justify-center relative shadow-inner">
                    <User size={24} className="text-scmd-silver/20" />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-scmd-navy rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 pr-12">
                    <h4 className="font-black text-white uppercase text-sm leading-tight truncate">{displayName}</h4>
                    <p className="text-[10px] font-black text-scmd-primary font-mono tracking-widest mt-1"># {s.staffId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.03]">
                  <div>
                    <p className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-50">
                      <Activity size={10} /> Trạng thái
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                      <span className={cn('text-[10px] font-black uppercase tracking-widest', status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-50">
                      <Phone size={10} /> Điện thoại
                    </p>
                    <p className="text-xs font-black font-mono text-scmd-silver/80">
                      {(s as any).phone || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                  <p className="text-[10px] font-black text-scmd-silver/20 uppercase flex items-center gap-1.5 tracking-tighter">
                    <Calendar size={11} /> Vào: {fmtDate((s as any).createdAt)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedStaffDetail(s)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy border border-white/5 text-scmd-silver/40 active:bg-scmd-primary/20 active:text-scmd-primary transition-all shadow-sm"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => startEditingStaff(s)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy border border-white/5 text-scmd-silver/40 active:bg-emerald-500/20 active:text-emerald-400 transition-all shadow-sm"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => setShowConfirmModal({ id: s.id, type: 'staff', name: displayName })}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy border border-white/5 text-scmd-silver/40 active:bg-red-500/20 active:text-red-400 transition-all shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
};
