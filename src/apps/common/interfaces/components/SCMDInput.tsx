import React from 'react';
import { cn } from '../../../../lib/utils';

interface SCMDInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const SCMDInput = React.forwardRef<HTMLInputElement, SCMDInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-scmd border border-slate-800 bg-scmd-navy/50 px-4 py-2 text-sm text-white ring-offset-background transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-600 focus:border-scmd-cyber focus:outline-none focus:ring-2 focus:ring-scmd-cyber/20 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-scmd-alert focus:ring-scmd-alert/20',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-scmd-alert">{error}</p>
        )}
      </div>
    );
  }
);

SCMDInput.displayName = 'SCMDInput';
