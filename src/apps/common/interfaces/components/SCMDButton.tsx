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
      primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm hover:shadow-md border-none',
      ghost: 'bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--gray-100)] hover:text-[var(--color-text-primary)]',
      danger: 'bg-[#FEF2F2] text-[var(--color-danger)] border border-[#FCA5A5] hover:bg-[#FEE2E2]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2 min-h-[48px]', // 48px touch target
      lg: 'px-6 py-3 text-[15px] min-h-[56px]', // 56px preferred action target
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
          'inline-flex items-center justify-center gap-[6px] rounded-[var(--radius-sm)] font-semibold text-[13px] transition-[var(--transition-fast)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
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
