import React from 'react';
import { 
  Shield, 
  UserCog, 
  BadgeCheck, 
  ShieldCheck, 
  User 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Staff } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────
export const INPUT_CLS =
  'w-full px-4 py-3 bg-scmd-navy/50 border border-white/5 rounded-xl text-white placeholder:text-scmd-silver/20 focus:ring-2 focus:ring-scmd-primary/50 focus:border-scmd-primary outline-none transition-all font-bold text-sm hover:border-white/20 shadow-inner';

export const LABEL_CLS = 'block text-[9px] font-black text-scmd-silver/40 uppercase tracking-[0.2em] mb-1.5';

// ─── Helpers ─────────────────────────────────────────────────────────────

export const getDisplayName = (s: Staff): string =>
  s.fullName ?? '(Chưa đặt tên)';

const ROLE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'super-admin': {
    label: 'SYSTEM ADMIN',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]',
    icon: <Shield size={10} />,
  },
  'tenant-admin': {
    label: 'MANAGER',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
    icon: <UserCog size={10} />,
  },
  Admin: {
    label: 'MANAGER',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
    icon: <UserCog size={10} />,
  },
  supervisor: {
    label: 'SUPERVISOR',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    icon: <BadgeCheck size={10} />,
  },
  Supervisor: {
    label: 'SUPERVISOR',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    icon: <BadgeCheck size={10} />,
  },
  guard: {
    label: 'SECURITY',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    icon: <ShieldCheck size={10} />,
  },
  Guard: {
    label: 'SECURITY',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    icon: <ShieldCheck size={10} />,
  },
  technician: {
    label: 'TECH OPS',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]',
    icon: <UserCog size={10} />,
  },
};

export const getRoleInfo = (role: string) =>
  ROLE_MAP[role] ?? {
    label: role,
    color: 'bg-scmd-navy/50 text-scmd-silver/40 border-white/5',
    icon: <User size={10} />,
  };

export const getStatusInfo = (status?: string, isOnline?: boolean) => {
  if (isOnline)
    return { 
      label: 'LIVE', 
      color: 'text-emerald-400 font-black', 
      dot: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)] animate-pulse' 
    };
  if (status === 'inactive')
    return { label: 'OFFL', color: 'text-scmd-silver/40', dot: 'bg-scmd-silver/40' };
  if (status === 'suspended')
    return { label: 'SUSP', color: 'text-amber-400', dot: 'bg-amber-500' };
  return { label: 'AWAY', color: 'text-scmd-silver/20', dot: 'bg-scmd-navy' };
};

export const fmtDate = (d?: string | Date) => {
  if (!d) return '—';
  const date = new Date(d);
  
  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  } catch (err) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
};
