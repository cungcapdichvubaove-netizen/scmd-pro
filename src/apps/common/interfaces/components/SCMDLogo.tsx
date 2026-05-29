import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface SCMDLogoProps {
  variant?: 'light' | 'dark' | 'brand' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'sidebar';
  className?: string;
}

const WORDMARK_SIZE_CLASSES: Record<NonNullable<SCMDLogoProps['size']>, string> = {
  sm: 'h-8 max-w-[136px]',
  md: 'h-10 max-w-[172px]',
  lg: 'h-12 max-w-[204px]',
  sidebar: 'h-14 max-w-[196px]',
};

const ICON_SIZE_CLASSES: Record<NonNullable<SCMDLogoProps['size']>, string> = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-[10px]',
  lg: 'w-12 h-12 rounded-[14px]',
  sidebar: 'w-11 h-11 rounded-[12px]',
};

export const SCMDLogo: React.FC<SCMDLogoProps> = ({ 
  variant = 'light', 
  size = 'md',
  className 
}) => {
  const isIconOnly = variant === 'icon-only';
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: isIconOnly ? 'w-8 h-8' : 'gap-2',
    md: isIconOnly ? 'w-10 h-10' : 'gap-2.5',
    lg: isIconOnly ? 'w-12 h-12' : 'gap-3',
    sidebar: isIconOnly ? 'w-11 h-11' : 'gap-3',
  };

  const getIconWrapperSize = () => {
    return ICON_SIZE_CLASSES[size];
  };

  const LogoIcon = () => (
    <div className={cn(
      "flex items-center justify-center shrink-0 overflow-hidden",
      getIconWrapperSize()
    )}>
      {!imageError ? (
        <img
          src="/logo_scmd_pro.png"
          alt="SCMD Pro Logo"
          className="h-full w-auto max-w-none object-cover object-left"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#2563EB] text-sm font-black text-white">
          S
        </span>
      )}
    </div>
  );

  if (isIconOnly) {
    return <LogoIcon />;
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      {!imageError ? (
        <img
          src="/logo_scmd_pro.png"
          alt="SCMD Pro Logo"
          className={cn(
            WORDMARK_SIZE_CLASSES[size],
            "w-auto shrink-0 object-contain"
          )}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-lg font-black tracking-tight text-white">
          SCMD<span className="text-[#3B82F6]"> Pro</span>
        </span>
      )}
    </div>
  );
};
