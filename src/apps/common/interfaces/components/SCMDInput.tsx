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
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)]/20 bg-[var(--color-surface)]/5 px-4 py-2 text-sm text-white ring-offset-background transition-[var(--transition-base)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/10',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[10px] font-bold text-[var(--color-danger)] ml-1 uppercase ">{error}</p>
        )}
      </div>
    );
  }
);

SCMDInput.displayName = 'SCMDInput';
