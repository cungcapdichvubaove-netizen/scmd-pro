import React from 'react';
import { cn } from '../../../../lib/utils';

interface SCMDButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const SCMDButton = React.forwardRef<HTMLButtonElement, SCMDButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-scmd-cyber text-white hover:bg-scmd-cyber/90 shadow-soft hover:shadow-scmd-deep',
      ghost: 'bg-transparent border border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white',
      danger: 'bg-scmd-alert text-white hover:bg-scmd-alert/90 shadow-soft hover:shadow-scmd-deep',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      if (props.onClick) {
        props.onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-scmd font-bold tracking-tight transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
        onClick={handleClick}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        ) : null}
        {children}
      </button>
    );
  }
);

SCMDButton.displayName = 'SCMDButton';
