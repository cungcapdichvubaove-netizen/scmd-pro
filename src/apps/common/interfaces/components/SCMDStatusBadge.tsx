import React from 'react';
import { cn } from '../../../../lib/utils';

export type SCMDStatus = 'safe' | 'danger' | 'patrolling' | 'warning' | 'idle';

interface SCMDStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: SCMDStatus;
}

const configs: Record<SCMDStatus, { label: string; classes: string }> = {
  safe: {
    label: 'Đạt SLA',
    classes: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  },
  danger: {
    label: 'Vi phạm SLA',
    classes: 'border-red-400/20 bg-red-400/10 text-red-300',
  },
  patrolling: {
    label: 'Đang vận hành',
    classes: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  },
  warning: {
    label: 'Cần chú ý',
    classes: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  },
  idle: {
    label: 'Tạm dừng',
    classes: 'border-slate-400/20 bg-slate-400/10 text-slate-300',
  },
};

export const SCMDStatusBadge: React.FC<SCMDStatusBadgeProps> = ({
  status,
  className,
  children,
  ...props
}) => {
  const config = configs[status];

  return (
    <div
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold',
        config.classes,
        className,
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children || config.label}
    </div>
  );
};
