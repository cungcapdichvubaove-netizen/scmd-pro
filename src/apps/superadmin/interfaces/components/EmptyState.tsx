import React from 'react';
import { cn } from '../../../../lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/5 bg-slate-900/30 px-6 py-16 text-center',
      className,
    )}
    role="status"
    aria-live="polite"
  >
    {icon && (
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/5 bg-slate-950/40 text-slate-600 shadow-inner">
        {icon}
      </div>
    )}
    <div className="space-y-1">
      <p className="text-sm font-bold uppercase tracking-tight text-slate-400">{title}</p>
      {description && <p className="mx-auto max-w-sm text-xs font-semibold text-slate-600">{description}</p>}
    </div>
    {action}
  </div>
);
