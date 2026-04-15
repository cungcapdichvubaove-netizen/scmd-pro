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
      classes: 'bg-scmd-safety/10 border-scmd-safety/20 text-scmd-safety',
    },
    danger: {
      label: 'Sự cố an ninh',
      classes: 'bg-scmd-alert/10 border-scmd-alert/20 text-scmd-alert animate-pulse',
    },
    patrolling: {
      label: 'Đang tuần tra',
      classes: 'bg-scmd-cyber/10 border-scmd-cyber/20 text-scmd-cyber',
    },
    warning: {
      label: 'Cảnh báo',
      classes: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
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
