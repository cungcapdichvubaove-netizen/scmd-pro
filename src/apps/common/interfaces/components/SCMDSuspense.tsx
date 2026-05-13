import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface SCMDSuspenseProps {
  message?: string;
  fullHeight?: boolean;
}

export const SCMDSuspense: React.FC<SCMDSuspenseProps> = ({ 
  message = "Đang tải dữ liệu...", 
  fullHeight = true 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${fullHeight ? 'h-full py-40' : 'py-12'} gap-6`}>
      <div className="relative">
        <Loader2 className="animate-spin text-scmd-primary" size={48} />
        <motion.div 
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-scmd-primary/20 blur-xl rounded-full scale-150"
        />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse italic">
          {message}
        </p>
        <div className="flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1.5 h-1.5 bg-scmd-cyber rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};
