import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Save, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export type OpsTone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'muted';

const toneClass: Record<OpsTone, string> = {
  default: 'border-slate-400/18 bg-slate-400/10 text-slate-200',
  info: 'border-blue-400/24 bg-blue-500/10 text-blue-200',
  success: 'border-emerald-400/24 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-400/24 bg-amber-500/10 text-amber-200',
  danger: 'border-red-400/24 bg-red-500/10 text-red-200',
  muted: 'border-white/10 bg-white/[0.035] text-slate-400',
};

export const opsPanelClass = 'overflow-hidden rounded-[14px] border border-white/8 bg-slate-900/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]';
export const opsThClass = 'px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500';
export const opsTdClass = 'px-3 py-2 align-middle text-[12px] leading-5 text-slate-300';
export const opsTableClass = 'w-full text-[12px]';
export const opsRowClass = 'border-t border-white/6 transition-colors duration-150 hover:bg-white/[0.025]';

export const normalizeStatusTone = (value?: string): OpsTone => {
  const normalized = String(value || '').toUpperCase();
  if (['CRITICAL', 'HIGH', 'BREACHED', 'OVERDUE', 'TERMINATED', 'REJECTED', 'FAILED', 'SUSPENDED'].some((item) => normalized.includes(item))) return 'danger';
  if (['WARNING', 'MEDIUM', 'DUE', 'WAITING', 'PENDING', 'DRAFT', 'REVIEWING', 'IN_PROGRESS', 'INACTIVE'].some((item) => normalized.includes(item))) return 'warning';
  if (['ACTIVE', 'OK', 'RESOLVED', 'CLOSED', 'COMPLETED', 'DONE', 'APPROVED', 'PASS'].some((item) => normalized.includes(item))) return 'success';
  if (['NEW', 'ASSIGNED', 'ACKNOWLEDGED', 'OPEN'].some((item) => normalized.includes(item))) return 'info';
  return 'default';
};

export const normalizeStatusLabel = (value?: string): string => {
  const normalized = String(value || '').toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Tạm ngưng',
    SUSPENDED: 'Đình chỉ',
    TERMINATED: 'Đã chấm dứt',
    DRAFT: 'Bản nháp',
    EXPIRED: 'Hết hiệu lực',
    REPORTED: 'Mới báo cáo',
    ACKNOWLEDGED: 'Đã tiếp nhận',
    ASSIGNED: 'Đã giao',
    INVESTIGATING: 'Đang xử lý',
    WAITING_VENDOR_RESPONSE: 'Chờ nhà thầu',
    RESOLVED_PENDING_APPROVAL: 'Chờ nghiệm thu',
    RESOLVED: 'Đã xử lý',
    CLOSED: 'Đã đóng',
    PENDING: 'Chờ xử lý',
    IN_PROGRESS: 'Đang làm',
    COMPLETED: 'Hoàn tất',
    DONE: 'Hoàn tất',
    NEW: 'Mới',
    REVIEWING: 'Đang review',
    WAIVED: 'Đã miễn trừ',
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
    CRITICAL: 'Khẩn cấp',
    WARNING: 'Cảnh báo',
    OK: 'Ổn định',
    BREACHED: 'Quá hạn',
    OVERDUE: 'Quá hạn',
  };
  return labels[normalized] ?? (normalized || 'Chưa rõ');
};

export const OpsStatusBadge: React.FC<{ value?: string; tone?: OpsTone; className?: string }> = ({ value, tone, className }) => (
  <span className={cn('inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.08em]', toneClass[tone ?? normalizeStatusTone(value)], className)}>
    {normalizeStatusLabel(value)}
  </span>
);

export const OpsIconButton: React.FC<{
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}> = ({ label, onClick, children, type = 'button', disabled = false, className }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={cn(
      'inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.035] text-slate-300 transition-colors duration-150 hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
  >
    {children ?? <Eye size={14} />}
  </button>
);

export const OpsDetailDrawer: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ open, title, subtitle, onClose, children, actions }) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" aria-label="Đóng khay chi tiết" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-[2px]" />
      <aside className="relative flex h-full w-full max-w-[480px] flex-col border-l border-white/10 bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Chi tiết nhanh</p>
            <h3 className="mt-1 truncate text-lg font-black tracking-[-0.02em] text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-400">{subtitle}</p> : null}
          </div>
          <OpsIconButton label="Đóng" onClick={onClose}>
            <X size={16} />
          </OpsIconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>
        {actions ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-slate-950/92 p-4">
            {actions}
          </footer>
        ) : null}
      </aside>
    </div>
  );
};

export const OpsDetailGrid: React.FC<{ items: Array<{ label: string; value: React.ReactNode }> }> = ({ items }) => (
  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {items.map((item) => (
      <div key={item.label} className="rounded-[12px] border border-white/8 bg-white/[0.035] p-3">
        <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{item.label}</dt>
        <dd className="mt-1 break-words text-[13px] font-semibold text-white">{item.value}</dd>
      </div>
    ))}
  </dl>
);

export const OpsSavedViews: React.FC<{
  storageKey: string;
  defaultViews: string[];
  onSelect?: (view: string) => void;
}> = ({ storageKey, defaultViews, onSelect }) => {
  const [views, setViews] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultViews;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultViews;
    } catch {
      return defaultViews;
    }
  });
  const [active, setActive] = useState(defaultViews[0] ?? 'Tất cả');

  const canSaveDefault = useMemo(() => !views.includes('Bộ lọc hiện tại'), [views]);

  const handleSave = () => {
    const next = canSaveDefault ? [...views, 'Bộ lọc hiện tại'] : views;
    setViews(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-slate-950/20 px-4 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Saved views</span>
      {views.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => {
            setActive(view);
            onSelect?.(view);
          }}
          className={cn(
            'h-8 rounded-full border px-3 text-[11px] font-semibold transition-colors duration-150',
            active === view ? 'border-blue-400/30 bg-blue-500/12 text-blue-100' : 'border-white/10 bg-white/[0.025] text-slate-400 hover:text-white',
          )}
        >
          {view}
        </button>
      ))}
      <OpsIconButton label="Lưu bộ lọc hiện tại" onClick={handleSave} className="ml-1">
        <Save size={14} />
      </OpsIconButton>
    </div>
  );
};
