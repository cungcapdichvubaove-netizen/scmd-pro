import React from 'react';
import { cn } from '@/lib/utils';

interface SCMDLogoProps {
  variant?: 'light' | 'dark' | 'brand' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SCMDLogo: React.FC<SCMDLogoProps> = ({ 
  variant = 'light', 
  size = 'md',
  className 
}) => {
  const isIconOnly = variant === 'icon-only';
  
  const sizeClasses = {
    sm: isIconOnly ? 'w-8 h-8' : 'gap-2',
    md: isIconOnly ? 'w-10 h-10' : 'gap-2.5',
    lg: isIconOnly ? 'w-12 h-12' : 'gap-3',
  };

  const getIconWrapperSize = () => {
    switch(size) {
      case 'sm': return 'w-8 h-8 rounded-lg';
      case 'lg': return 'w-[48px] h-[48px] rounded-[14px]';
      default: return 'w-[38px] h-[38px] rounded-[10px]';
    }
  };

  const LogoIcon = () => (
    <div className={cn(
      "flex items-center justify-center shrink-0 overflow-hidden",
      getIconWrapperSize()
    )}>
      <img 
        src="/logo_scmd_pro.png" 
        alt="SCMD Pro Logo"
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );

  if (isIconOnly) {
    return <LogoIcon />;
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <img 
        src="/logo_scmd_pro.png" 
        alt="SCMD Pro Logo"
        className={cn(
          size === 'sm' ? "h-10" : size === 'lg' ? "h-20" : "h-14",
          "object-contain w-auto max-w-[280px]"
        )}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
