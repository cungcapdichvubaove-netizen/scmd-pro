import React from 'react';
import { Lock } from 'lucide-react';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';

export const FeatureLock: React.FC<{ title: string; onUpgrade: () => void }> = ({
  title,
  onUpgrade,
}) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-12 bg-scmd-navy/80 backdrop-blur-md rounded-scmd-xl border border-white/5 animate-in fade-in zoom-in duration-500">
    <div className="w-24 h-24 bg-scmd-primary/20 rounded-scmd-lg flex items-center justify-center mb-8 shadow-2xl relative group">
      <div className="absolute inset-0 bg-scmd-cyber/20 rounded-scmd-lg blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse delay-75" />
      <Lock size={48} className="text-scmd-cyber relative z-10" />
    </div>
    <h3 className="text-3xl font-black text-white tracking-tight mb-4">{title}</h3>
    <p className="text-sm font-medium text-slate-400 max-w-md mb-10 leading-relaxed">
      Tính năng này yêu cầu hạng thẻ PRO đính kèm SCMD Insight AI. Vui lòng nâng cấp để mở khóa phân
      tích an ninh chiến lược.
    </p>
    <SCMDButton onClick={onUpgrade} className="h-14 px-10 text-sm tracking-widest min-w-[240px]">
      Nâng cấp PRO
    </SCMDButton>
  </div>
);
