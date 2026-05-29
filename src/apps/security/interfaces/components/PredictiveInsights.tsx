import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Map as MapIcon,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../../lib/utils';
import { apiFetch } from '../../../../lib/api';
import { useAuthStore } from '../../../common/store/useAuthStore';
import { useDashboardStore } from '../../store/useDashboardStore';

interface BlindSpot {
  locationId: string;
  locationName: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

interface RouteSuggestion {
  sequence: string[];
  benefit: string;
}

interface AnalysisData {
  blindSpots: BlindSpot[];
  dynamicRouteSuggestions: RouteSuggestion[];
  predictionConfidence: number;
  message?: string;
}

export const PredictiveInsights: React.FC = () => {
  const { t } = useTranslation();
  const tenantId = useAuthStore((state) => state.tenantId);
  const tenantInfo = useDashboardStore((state) => state.tenantInfo);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const predictiveGuardEnabled = tenantInfo?.resolvedFeatures?.predictive_guard === true;
  const canFetch = Boolean(tenantId && predictiveGuardEnabled);

  const fetchAnalysis = async () => {
    if (!canFetch) {
      setData(null);
      setError('AI dự báo chưa khả dụng cho tenant hoặc phiên hiện tại.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<AnalysisData>('/api/security/patrol/predictive-analysis', {
        suppressErrorToast: true,
      });
      setData(result);
    } catch (err: any) {
      if (err?.status === 401) {
        setError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      } else if (err?.status === 403 && err?.message === 'FEATURE_DISABLED') {
        setError('AI dự báo chưa được bật cho tenant hiện tại.');
      } else if (err?.status === 403 && err?.message === 'FEATURE_DEPENDENCY_MISSING') {
        setError('AI dự báo đang bị chặn do thiếu feature phụ thuộc bắt buộc.');
      } else {
        setError(err?.message || t('common.invalid_request'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalysis();
  }, [canFetch]);

  if (loading) {
    return (
      <div className="bg-scmd-surface/50 border border-white/5 rounded-[2rem] p-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Zap className="text-scmd-cyber animate-pulse" size={40} />
          <div className="absolute inset-0 bg-scmd-cyber/20 blur-xl rounded-full scale-150 animate-pulse" />
        </div>
        <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest text-center">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  if (error || (data && data.message)) {
    return (
      <div className="bg-scmd-surface border border-scmd-alert/20 rounded-[2rem] p-8 text-center">
        <AlertTriangle className="text-scmd-alert mx-auto mb-4" size={32} />
        <p className="text-scmd-silver font-bold">{error || data?.message}</p>
        <button 
          onClick={fetchAnalysis}
          className="mt-4 px-6 py-2 bg-scmd-surface border border-white/10 rounded-xl text-[10px] font-black uppercase text-scmd-silver hover:bg-white/5 transition-all"
        >
          {t('common.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-scmd-cyber/10 flex items-center justify-center text-scmd-cyber">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{t('predictive.title')}</h3>
            <p className="text-[9px] font-black text-scmd-cyber uppercase tracking-widest">Powered by Gemini 1.5 Flash</p>
          </div>
        </div>
        <button 
          onClick={fetchAnalysis}
          className="p-3 bg-white/5 hover:bg-white/10 text-scmd-silver/40 rounded-xl transition-all"
        >
          <RefreshCcw size={16} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blind Spots section */}
        <div className="bg-scmd-surface border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-scmd-alert" size={20} />
            <h4 className="text-sm font-black text-scmd-silver uppercase tracking-widest">{t('predictive.blind_spots')}</h4>
          </div>

          <div className="space-y-4">
            {data?.blindSpots.map((spot, idx) => (
              <motion.div 
                key={spot.locationId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/2 border border-white/5 p-4 rounded-2xl flex gap-4 hover:bg-white/5 transition-all"
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  spot.riskLevel === 'high' ? "bg-scmd-alert/20 text-scmd-alert" :
                  spot.riskLevel === 'medium' ? "bg-amber-500/20 text-amber-400" :
                  "bg-emerald-500/20 text-emerald-400"
                )}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-white font-black">{spot.locationName}</p>
                  <p className="text-[11px] text-scmd-silver/60 mt-1 leading-relaxed">{spot.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                      spot.riskLevel === 'high' ? "bg-scmd-alert text-scmd-navy" :
                      spot.riskLevel === 'medium' ? "bg-amber-500 text-scmd-navy" :
                      "bg-emerald-500 text-scmd-navy"
                    )}>
                      {spot.riskLevel === 'high' ? t('predictive.risk_high') : spot.riskLevel === 'medium' ? t('predictive.risk_medium') : t('predictive.risk_low')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Dynamic Routes section */}
        <div className="bg-scmd-surface border border-white/5 rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center gap-2">
            <MapIcon className="text-scmd-cyber" size={20} />
            <h4 className="text-sm font-black text-scmd-silver uppercase tracking-widest">{t('predictive.dynamic_routes')}</h4>
          </div>

          <div className="space-y-6">
            {data?.dynamicRouteSuggestions.map((suggestion, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="bg-scmd-navy/40 border border-scmd-cyber/20 p-5 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-5">
                  <TrendingUp size={60} />
                </div>
                
                <p className="text-[10px] font-black text-scmd-cyber uppercase tracking-widest mb-3">Suggestion #{idx + 1}</p>
                
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  {suggestion.sequence.map((point, pIdx) => (
                    <React.Fragment key={pIdx}>
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-white border border-white/5">
                        {point}
                      </span>
                      {pIdx < suggestion.sequence.length - 1 && (
                        <ArrowRight size={12} className="text-scmd-silver/20" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-start gap-2 bg-scmd-cyber/5 p-3 rounded-xl border border-scmd-cyber/10">
                  <TrendingUp size={14} className="text-scmd-cyber shrink-0 mt-0.5" />
                  <p className="text-[11px] text-scmd-cyber font-medium leading-relaxed">
                    {suggestion.benefit}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="pt-4 flex items-center justify-between border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-scmd-silver/40 uppercase tracking-widest">{t('predictive.ai_confidence')}: {(data?.predictionConfidence || 0) * 100}%</span>
            </div>
            <button className="flex items-center gap-2 text-scmd-cyber text-[10px] font-black uppercase tracking-widest group">
              {t('predictive.apply_now')}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
