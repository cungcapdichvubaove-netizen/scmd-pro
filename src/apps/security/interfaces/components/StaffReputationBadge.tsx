import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, AlertTriangle, XCircle, Info, Scan } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { apiFetch } from '../../../../lib/api';

interface ReputationBadgeProps {
  idNumber: string;
}

export const StaffReputationBadge: React.FC<ReputationBadgeProps> = ({ idNumber }) => {
  const [rep, setRep] = useState<{ violations: number, severeViolations: number, incidents: number, status: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (idNumber && idNumber.length >= 9) {
      const timer = setTimeout(async () => {
        setLoading(true);
        try {
          const result = await apiFetch<any>(`/api/tenant/staff/reputation?idNumber=${idNumber}`);
          setRep(result);
        } catch (e) {
          console.error('Reputation check failed', e);
        } finally {
          setLoading(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setRep(null);
      return undefined;
    }
  }, [idNumber]);

  if (loading) return (
    <div className="flex items-center gap-2 text-[10px] font-black text-scmd-primary animate-pulse">
      <Scan size={12} className="animate-spin" /> QUÉT HỆ THỐNG SCMD...
    </div>
  );

  if (!rep) return null;

  const config = {
    CLEAN: { icon: CheckCircle2, text: 'HỒ SƠ SẠCH', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    WARNING: { icon: AlertTriangle, text: 'CẦN CHÚ Ý', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    CRITICAL: { icon: XCircle, text: 'RED FLAG: KỶ LUẬT', color: 'text-red-400 bg-red-600/15 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse' },
  }[rep.status as 'CLEAN' | 'WARNING' | 'CRITICAL'] || { icon: Info, text: 'N/A', color: 'text-scmd-silver/40 bg-scmd-surface border-white/10' };

  // Note: CheckCircle2 is missing from imports in this extraction, adding it.
  const StatusIcon = config.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col gap-1 p-3 rounded-xl border mt-2 relative overflow-hidden", config.color)}
    >
      {rep.status === 'CRITICAL' && (
        <div className="absolute top-0 right-0 p-1">
          <Shield size={12} className="text-red-500 opacity-50" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <StatusIcon size={14} className={cn(rep.status === 'CRITICAL' && "animate-bounce")} />
        <span className="text-[10px] font-black uppercase tracking-widest">{config.text}</span>
      </div>
      {rep.status !== 'CLEAN' && (
        <p className="text-[10px] font-bold opacity-90 mt-1 leading-tight">
          {rep.status === 'CRITICAL' ? 'CẢNH BÁO: ' : ''}
          Phát hiện {rep.violations} vi phạm {rep.severeViolations > 0 && `(${rep.severeViolations} nghiêm trọng)`} trên mạng lưới SCMD.
        </p>
      )}
    </motion.div>
  );
};

// Add missing CheckCircle2 import to the file above manually or fix it now.
import { CheckCircle2 } from 'lucide-react';
