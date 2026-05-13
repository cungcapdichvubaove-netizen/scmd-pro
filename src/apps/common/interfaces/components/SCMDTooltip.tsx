import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../../lib/utils';

interface SCMDTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const SCMDTooltip: React.FC<SCMDTooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: '-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2',
    bottom: '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2',
    left: 'top-1/2 -left-2 -translate-x-full -translate-y-1/2 mr-2',
    right: 'top-1/2 -right-2 translate-x-full -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0, x: position === 'left' ? 4 : position === 'right' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0, x: position === 'left' ? 4 : position === 'right' ? -4 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-[9999] whitespace-nowrap px-3 py-1.5 bg-scmd-navy border border-white/10 rounded-lg shadow-xl pointer-events-none",
              positions[position],
              className
            )}
          >
            <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
              {content}
            </p>
            {/* Tooltip Arrow */}
            <div className={cn(
              "absolute w-2 h-2 bg-scmd-navy border-white/10 rotate-45",
              position === 'top' && "bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r",
              position === 'bottom' && "top-[-5px] left-1/2 -translate-x-1/2 border-t border-l",
              position === 'left' && "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r",
              position === 'right' && "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
