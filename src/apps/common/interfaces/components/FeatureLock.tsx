import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { SCMDButton } from './SCMDButton';

interface FeatureLockProps {
  title: string;
  /** Mô tả tuỳ chỉnh. Mặc định: thông điệp nâng cấp PRO chung. */
  description?: string;
  onUpgrade: () => void;
}

export const FeatureLock: React.FC<FeatureLockProps> = ({
  title,
  description = 'Tính năng này yêu cầu gói PRO. Nâng cấp để mở khóa phân tích an ninh chiến lược và toàn bộ tính năng cốt lõi của SCMD Pro.',
  onUpgrade,
}) => (
  <div
    role="region"
    aria-label={`Tính năng bị khóa: ${title}`}
    className="flex flex-col items-center justify-center h-[60vh] text-center p-12 bg-scmd-navy/80 backdrop-blur-md rounded-scmd-xl border border-white/5 animate-in fade-in zoom-in duration-500"
  >
    <div className="w-24 h-24 bg-scmd-primary/20 rounded-scmd-lg flex items-center justify-center mb-8 shadow-2xl relative group">
      <Lock className="text-scmd-primary w-10 h-10 group-hover:scale-110 transition-transform relative z-10" />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-scmd-primary/10 rounded-scmd-lg blur-xl"
      />
    </div>
    <h2 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">{title}</h2>
    <p className="text-slate-400 max-w-md mb-10 font-medium leading-relaxed text-sm">
      {description}
    </p>
    <SCMDButton
      onClick={onUpgrade}
      variant="primary"
      className="px-10 h-14 font-black shadow-xl shadow-scmd-primary/30 hover:scale-105"
    >
      <Zap size={20} className="fill-current" /> NÂNG CẤP LÊN PRO
    </SCMDButton>
  </div>
);
