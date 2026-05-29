import React from 'react';
import { cn } from '../../../../lib/utils';

interface SCMDCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const SCMDCard = React.forwardRef<HTMLDivElement, SCMDCardProps>(
  ({ className, glass = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[14px] p-4 transition-colors duration-150 sm:p-5',
          glass
            ? 'border border-slate-200/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl hover:border-blue-400/18 hover:bg-white/[0.05]'
            : 'border border-slate-200/10 bg-slate-900/70 shadow-[0_10px_24px_rgba(2,6,23,0.16)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SCMDCard.displayName = 'SCMDCard';
