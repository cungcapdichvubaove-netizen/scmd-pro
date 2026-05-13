import React from 'react';
import { cn } from '../../../../lib/utils';

export type SCMDStatus = 'safe' | 'danger' | 'patrolling' | 'warning' | 'idle';

interface SCMDStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: SCMDStatus;
}

export const SCMDStatusBadge: React.FC<SCMDStatusBadgeProps> = ({ 
  status, 
  className, 
  children,
  ...props 
}) => {
  const configs = {
    safe: {
      label: 'An toàn',
      classes: 'bg-scmd-success/10 border-scmd-success/20 text-scmd-success',
    },
    danger: {
      label: 'Sự cố an ninh',
      classes: 'bg-scmd-error/10 border-scmd-error/20 text-scmd-error animate-pulse',
    },
    patrolling: {
      label: 'Đang tuần tra',
      classes: 'bg-scmd-primary/10 border-scmd-primary/20 text-scmd-primary',
    },
    warning: {
      label: 'Cảnh báo',
      classes: 'bg-scmd-warning/10 border-scmd-warning/20 text-scmd-warning',
    },
    idle: {
      label: 'Nghỉ ca',
      classes: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
    },
  };

  const config = configs[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest',
        config.classes,
        className
      )}
      {...props}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {children || config.label}
    </div>
  );
};
