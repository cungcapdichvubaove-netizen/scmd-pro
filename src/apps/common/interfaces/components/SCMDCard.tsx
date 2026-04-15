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
          'rounded-scmd p-6 transition-all duration-300',
          glass ? 'scmd-glass' : 'bg-scmd-slate border border-slate-800 shadow-scmd-deep',
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
