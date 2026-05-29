import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Phone, 
  Calendar, 
  Eye, 
  Edit3, 
  Printer, 
  Trash2
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Staff } from '../types';
import { getDisplayName, getDisplayStaffCode, getRoleInfo, getStatusInfo, fmtDate } from '../StaffTab.utils.js';

interface StaffTableProps {
  pagedStaff: Staff[];
  onlineUserIds: string[];
  isLoading: boolean;
  staff: Staff[];
  itemsPerPage: number;
  setSelectedStaffDetail: (v: Staff | null) => void;
  startEditingStaff: (s: Staff) => void;
  setShowPrintModal: (v: Staff | null) => void;
  setShowConfirmModal: (v: { id: string; type: 'checkpoint' | 'staff' | 'route'; name: string } | null) => void;
}

export const StaffTable: React.FC<StaffTableProps> = ({
  pagedStaff,
  onlineUserIds,
  isLoading,
  staff,
  itemsPerPage,
  setSelectedStaffDetail,
  startEditingStaff,
  setShowPrintModal,
  setShowConfirmModal,
}) => {
  const StaffSkeleton = () => (
    <>
      {[...Array(itemsPerPage)].map((_, i) => (
        <tr key={`skeleton-${i}`} className="border-b border-white/[0.02] animate-pulse">
          <td className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-scmd-navy/50" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-scmd-navy rounded" />
                <div className="h-2 w-20 bg-scmd-navy/50 rounded" />
              </div>
            </div>
          </td>
          <td className="px-6 py-4"><div className="h-5 w-24 bg-scmd-navy rounded-lg" /></td>
          <td className="px-6 py-4 hidden sm:table-cell"><div className="h-3 w-16 bg-scmd-navy rounded" /></td>
          <td className="px-6 py-4 hidden md:table-cell"><div className="h-3 w-28 bg-scmd-navy rounded" /></td>
          <td className="px-6 py-4 hidden lg:table-cell"><div className="h-3 w-20 bg-scmd-navy rounded" /></td>
          <td className="px-6 py-4 text-right">
            <div className="flex justify-end gap-2">
              {[...Array(3)].map((_, j) => <div key={j} className="w-9 h-9 bg-scmd-navy rounded-xl" />)}
            </div>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-scmd-navy/80 border-b border-white/5">
            <th className="px-6 py-4 text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] sticky left-0 z-20 bg-scmd-navy/80 backdrop-blur-md border-b border-white/10">
              Nhân viên
            </th>
            <th className="px-6 py-4 text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] border-b border-white/10">
              Vai trò
            </th>
            <th className="px-6 py-4 text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] border-b border-white/10">
              Trạng thái
            </th>
            <th className="px-6 py-4 text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Phone size={10} className="text-scmd-primary" />
                Điện thoại
              </div>
            </th>
            <th className="px-6 py-4 text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Calendar size={10} className="text-scmd-primary" />
                Ngày vào
              </div>
            </th>
            <th className="px-6 py-4 text-right text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] sticky right-0 z-20 bg-scmd-navy/80 backdrop-blur-md border-b border-white/10">
              Thao tác
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-white/[0.03]">
          {isLoading && staff.length === 0 ? (
            <StaffSkeleton />
          ) : (
            <AnimatePresence mode="popLayout">
              {Array.isArray(pagedStaff) && pagedStaff.map((s, idx) => {
                const isOnline = Array.isArray(onlineUserIds) && onlineUserIds.includes(s.id);
                const role = getRoleInfo(s.role);
                const status = getStatusInfo((s as any).status, isOnline);
                const displayName = getDisplayName(s);

                return (
                  <motion.tr
                    key={s.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3, delay: (idx % itemsPerPage) * 0.05 }}
                    className="group hover:bg-scmd-primary/5 transition-all duration-300"
                  >
                    <td className="px-6 py-4 sticky left-0 z-10 bg-scmd-surface group-hover:bg-scmd-slate transition-colors border-b border-white/[0.02]">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-scmd-navy border border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner group-hover:border-scmd-primary/30 transition-all">
                          <div className="absolute inset-0 bg-scmd-primary/5" />
                          <User size={18} className="text-scmd-silver/20 group-hover:text-scmd-primary transition-colors" />
                          {isOnline && (
                            <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-scmd-surface rounded-full z-10 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-[13px] text-white uppercase tracking-tight truncate leading-tight group-hover:text-scmd-primary transition-colors">
                            {displayName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[9px] font-black text-scmd-primary/80 bg-scmd-primary/5 px-2 py-0.5 rounded border border-scmd-primary/10 tracking-widest leading-none">
                              # {getDisplayStaffCode(s)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-white/[0.02]">
                      <div className={cn(
                        'px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 w-fit',
                        role.color
                      )}>
                        {role.icon}
                        {role.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                        <span className={cn('text-[10px] font-black uppercase tracking-widest', status.color)}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-white/[0.02]">
                      <p className="text-[11px] font-black font-mono tracking-wider text-scmd-silver/40 group-hover:text-white transition-colors">
                        {(s as any).phone || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 border-b border-white/[0.02]">
                      <p className="font-black text-[10px] text-scmd-silver/20 uppercase tracking-tighter group-hover:text-scmd-silver/60">
                        {fmtDate((s as any).createdAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right sticky right-0 z-10 bg-scmd-surface group-hover:bg-scmd-slate transition-colors border-b border-white/[0.02]">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => setSelectedStaffDetail(s)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy/50 border border-white/5 text-scmd-silver/40 hover:text-scmd-primary hover:bg-scmd-primary/10 hover:border-scmd-primary/20 transition-all duration-300 group/btn shadow-sm"
                          title="Xem hồ sơ"
                        >
                          <Eye size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => startEditingStaff(s)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy/50 border border-white/5 text-scmd-silver/40 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 group/btn shadow-sm"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => setShowPrintModal(s)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy/50 border border-white/5 text-scmd-silver/40 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all duration-300 group/btn shadow-sm"
                          title="In hồ sơ"
                        >
                          <Printer size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => setShowConfirmModal({ id: s.id, type: 'staff', name: displayName })}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-scmd-navy/50 border border-white/5 text-scmd-silver/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300 group/btn shadow-sm"
                          title="Xóa nhân viên"
                        >
                          <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          )}
        </tbody>
      </table>
    </div>
  );
};
