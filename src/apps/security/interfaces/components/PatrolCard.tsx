import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, MapPin, QrCode } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';
import { ElapsedTime } from './ElapsedTime';

interface PatrolCardProps {
  checkpoint: any;
  index: number;
  isPendingTarget: boolean;
  distVal: number | null;
  lastCheckpointTime: number;
}

export const PatrolCard = React.memo(({ 
  checkpoint, 
  index, 
  isPendingTarget, 
  distVal, 
  lastCheckpointTime 
}: PatrolCardProps) => {
  const isNear = distVal !== null && distVal <= 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <SCMDCard 
        className={cn(
          "p-5 flex flex-row items-center gap-5 border-2 transition-all duration-500 card-active",
          checkpoint.status === 'completed' 
            ? "border-scmd-cyber/10 bg-scmd-surface/20 opacity-50 grayscale" 
            : isPendingTarget
              ? (isNear ? "border-scmd-cyber bg-scmd-cyber/10 scmd-glow" : "border-scmd-silver/20 bg-scmd-surface shadow-lg shadow-black/20")
              : "border-white/5 bg-scmd-surface/60"
        )}
      >
        <div className={cn(
          "w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-700 shadow-inner",
          checkpoint.status === 'completed' 
            ? "bg-scmd-cyber/20 text-scmd-cyber" 
            : isPendingTarget
              ? (isNear ? "bg-scmd-cyber text-scmd-navy animate-pulse" : "bg-scmd-surface text-scmd-silver scale-110 border border-white/5")
              : "bg-scmd-navy text-scmd-silver/20 opacity-40"
        )}>
          {checkpoint.status === 'completed' ? <CheckCircle2 size={28} strokeWidth={2.5} /> : <MapPin size={28} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-black text-xl truncate transition-colors",
            checkpoint.status === 'completed' ? "text-scmd-silver/50" : "text-scmd-silver"
          )}>{checkpoint.name}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              checkpoint.status === 'completed' ? "bg-scmd-cyber" : isPendingTarget ? "bg-scmd-cyber animate-ping" : "bg-slate-700"
            )} />
            <span className={cn(
              "font-bold uppercase tracking-widest text-[10px] whitespace-nowrap",
              checkpoint.status === 'completed' ? "text-scmd-cyber/50" : "text-scmd-cyber"
            )}>
              {checkpoint.status === 'completed' ? "Đã xác thực" : "Chưa hoàn tất"}
            </span>
            
            {distVal !== null && checkpoint.status !== 'completed' && (
              <span className={cn(
                "font-black px-2 py-0.5 rounded-md border border-slate-800/50 whitespace-nowrap",
                isNear ? "text-scmd-cyber bg-scmd-cyber/5" : "text-scmd-silver/40 px-0 border-0"
              )}>
                Cách {Math.round(distVal)}m
              </span>
            )}

            {checkpoint.status !== 'completed' && isPendingTarget && (
              <span className="font-mono text-[10px] font-bold text-scmd-cyber bg-scmd-cyber/10 px-2 py-0.5 rounded-sm border border-scmd-cyber/20 whitespace-nowrap shrink-0">
                ⏱ <ElapsedTime startTime={lastCheckpointTime} />s
              </span>
            )}
          </div>
        </div>
        {isPendingTarget && !isNear && (
          <div className="flex flex-col items-center justify-center text-scmd-silver/20 opacity-30">
            <QrCode size={20} />
            <span className="text-[8px] font-black mt-1">GẦN</span>
          </div>
        )}
      </SCMDCard>
    </motion.div>
  );
});

PatrolCard.displayName = 'PatrolCard';
