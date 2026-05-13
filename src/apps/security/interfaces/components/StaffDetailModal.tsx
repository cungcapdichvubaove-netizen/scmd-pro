import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  X, 
  Phone, 
  Calendar, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Edit3,
  Briefcase
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Staff } from '../types';
import { getDisplayName, getRoleInfo, getStatusInfo, fmtDate } from '../StaffTab.utils.js';
import { StaffReputationBadge } from './StaffReputationBadge.js';
import { StaffPerformancePortfolio } from './StaffPerformancePortfolio';

interface StaffDetailModalProps {
  selectedStaffDetail: Staff | null;
  staffModalTab: 'info' | 'performance' | 'history';
  setStaffModalTab: (v: 'info' | 'performance' | 'history') => void;
  setSelectedStaffDetail: (v: Staff | null) => void;
  startEditingStaff: (s: Staff) => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  selectedStaffDetail,
  staffModalTab,
  setStaffModalTab,
  setSelectedStaffDetail,
  startEditingStaff,
}) => {
  if (!selectedStaffDetail) return null;

  const s = selectedStaffDetail;
  const role = getRoleInfo(s.role);
  const status = getStatusInfo((s as any).status);
  const displayName = getDisplayName(s);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center p-0 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedStaffDetail(null)}
          className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-2xl bg-scmd-surface border border-white/10 rounded-t-[28px] md:rounded-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Modal header */}
          <div className="p-6 border-b border-white/5 flex gap-4 items-start bg-scmd-navy/20">
            <div className="w-14 h-14 rounded-2xl bg-scmd-navy border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
              <User size={26} className="text-scmd-silver/40" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-white truncate uppercase tracking-tight">{displayName}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest',
                    role.color,
                  )}
                >
                  {role.icon} {role.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  <span className={cn('text-[10px] font-black uppercase tracking-widest', status.color)}>{status.label}</span>
                </div>
                <span className="font-mono text-[10px] text-scmd-primary bg-scmd-primary/5 px-2 py-0.5 rounded border border-scmd-primary/20 font-black">
                  #{s.staffId}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedStaffDetail(null)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-scmd-navy border border-white/10 text-scmd-silver/40 hover:text-white hover:bg-scmd-surface transition-all shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-3 border-b border-white/5 bg-scmd-navy/40">
            {(['info', 'history', 'performance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStaffModalTab(tab)}
                className={cn(
                  'flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  staffModalTab === tab
                    ? 'bg-scmd-primary text-white shadow-lg shadow-scmd-primary/30'
                    : 'text-scmd-silver/40 hover:text-white hover:bg-scmd-surface',
                )}
              >
                {tab === 'info' ? 'Hồ sơ' : tab === 'history' ? 'Lịch sử' : 'Hiệu suất'}
              </button>
            ))}
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {staffModalTab === 'info' ? (
              <>
                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <User size={13} />, label: 'Username', value: `@${s.username || 'n/a'}` },
                    { icon: <Phone size={13} />, label: 'Điện thoại', value: (s as any).phone || '—' },
                    { icon: <Calendar size={13} />, label: 'Ngày vào làm', value: fmtDate((s as any).createdAt) },
                    { icon: <Calendar size={13} />, label: 'Cập nhật', value: fmtDate((s as any).updatedAt) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-3 bg-scmd-navy/50 rounded-xl border border-white/5 shadow-inner"
                    >
                      <div className="flex items-center gap-1.5 text-scmd-silver/40 mb-1">
                        {item.icon}
                        <span className="text-[10px] font-black uppercase tracking-wide">{item.label}</span>
                      </div>
                      <p className="text-sm font-bold text-white leading-none mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 col-span-2">
                  <StaffReputationBadge idNumber={(s as any).credentials?.idNumber || ''} />
                </div>

                {/* Bằng cấp & Chứng chỉ */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-scmd-primary">
                      <Award size={14} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Bằng cấp</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(s.qualifications) && s.qualifications.length > 0 ? (
                        s.qualifications.map((q, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-scmd-primary/10 text-scmd-primary rounded-lg text-[10px] font-black uppercase border border-scmd-primary/20"
                          >
                            {q}
                          </span>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-scmd-silver/20 uppercase tracking-widest">Chưa có dữ liệu</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <ShieldCheck size={14} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Chứng chỉ</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(s.certificates) && s.certificates.length > 0 ? (
                        s.certificates.map((c, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-lg text-[10px] font-black uppercase border border-amber-500/20"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-scmd-silver/20 uppercase tracking-widest">Chưa có chứng chỉ</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Khen thưởng & Kỷ luật */}
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/15">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <CheckCircle2 size={14} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Khen thưởng</h4>
                    </div>
                    <p className="text-xs text-scmd-silver/80 font-bold leading-relaxed">
                      {s.rewards || 'Chưa có ghi nhận khen thưởng.'}
                    </p>
                  </div>

                  <div className="p-4 bg-scmd-alert/5 rounded-xl border border-scmd-alert/15 shadow-sm">
                    <div className="flex items-center gap-2 text-scmd-alert mb-2">
                      <XCircle size={14} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Kỷ luật</h4>
                    </div>
                    <p className="text-xs text-scmd-silver/80 font-bold leading-relaxed">
                      {s.disciplines || 'Nhân viên chấp hành tốt nội quy.'}
                    </p>
                  </div>
                </div>

                {/* Pháp lý */}
                {(s as any).credentials && (
                  <div className="p-4 bg-scmd-navy/40 rounded-xl border border-white/5 space-y-3 shadow-inner">
                    <p className="flex items-center gap-1.5 text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                      <ShieldCheck size={11} className="text-scmd-primary" /> Chứng chỉ hành nghề
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'CMND/CCCD', value: (s as any).credentials?.idNumber },
                        { label: 'Số chứng chỉ', value: (s as any).credentials?.licenseNumber },
                        { label: 'Hết hạn', value: fmtDate((s as any).credentials?.expiryDate) },
                      ].map((f) => (
                        <div key={f.label}>
                          <p className="text-[9px] font-black text-scmd-silver/20 uppercase tracking-wide mb-1">{f.label}</p>
                          <p className="font-mono text-xs text-scmd-silver font-black">{f.value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : staffModalTab === 'history' ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={18} className="text-scmd-primary" /> Kinh nghiệm làm việc
                  </h4>
                </div>
                
                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-white/5">
                  {Array.isArray(s.workHistory) && s.workHistory.length > 0 ? (
                    s.workHistory.map((work) => (
                      <div key={work.id} className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-scmd-surface border border-scmd-primary/40 flex items-center justify-center z-10">
                          <CheckCircle2 size={12} className="text-scmd-primary" />
                        </div>
                        <div className="p-4 bg-scmd-navy/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                            <h5 className="text-sm font-black text-white uppercase tracking-tight">{work.position}</h5>
                            <span className="text-[9px] font-mono font-bold text-scmd-silver/40 whitespace-nowrap">
                              {work.startDate} — {work.endDate || 'Hiện tại'}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-scmd-primary uppercase tracking-widest mb-2">{work.company}</p>
                          {work.description && (
                            <p className="text-[11px] text-scmd-silver/40 font-medium leading-relaxed italic">
                              {work.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-scmd-navy/20 rounded-[28px] border border-white/5 border-dashed">
                      <Calendar className="mx-auto text-scmd-silver/10 mb-3" size={32} />
                      <p className="text-[10px] font-black text-scmd-silver/20 uppercase tracking-[0.2em]">Chưa cập nhật lịch sử công tác</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <StaffPerformancePortfolio staffId={s.id} staffName={displayName} />
            )}
          </div>

          {/* Modal footer */}
          <div className="p-4 bg-scmd-navy/60 border-t border-white/5 flex gap-3">
            <button
              onClick={() => {
                setSelectedStaffDetail(null);
                startEditingStaff(s);
              }}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-scmd-primary hover:bg-scmd-primary/80 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-scmd-primary/25 uppercase tracking-tighter"
            >
              <Edit3 size={15} /> Chỉnh sửa hồ sơ
            </button>
            <button
              onClick={() => setSelectedStaffDetail(null)}
              className="flex-1 h-11 flex items-center justify-center font-black text-sm text-scmd-silver/40 hover:text-white rounded-xl bg-scmd-surface hover:bg-scmd-navy transition-all border border-white/10 uppercase tracking-tighter"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
