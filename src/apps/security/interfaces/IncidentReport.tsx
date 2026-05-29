import React, { useState } from 'react';
import { Camera, Send, AlertCircle, Loader2, CheckCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils.js';
import { apiFetch } from '../../../lib/api.js';
import { addToSyncQueue } from '../../../lib/db.js';
import { signData } from '../../../lib/crypto.js';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton.js';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard.js';
import { SecureCameraCapture } from './components/SecureCameraCapture.js';

interface IncidentReportProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export const IncidentReport: React.FC<IncidentReportProps> = ({ onSuccess, isModal }) => {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ severity: string, advice: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tenantId = localStorage.getItem('scmd_tenant_id') || 'default';
  const deviceSecret = localStorage.getItem('scmd_device_secret');

  const handleCapture = (url: string) => {
    setImage(url);
    setShowCamera(false);
    handleAIAnalysis(url);
  };

  const handleAIAnalysis = async (urlOrBase64: string) => {
    setAnalyzing(true);
    try {
      const data = await apiFetch('/api/v1/ai/analyze-incident-image', {
        method: 'POST',
        body: JSON.stringify({ image: urlOrBase64 })
      });
      setResult(data);
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!deviceSecret) {
      setSubmitError('Thiết bị chưa được xác thực. Vui lòng đăng nhập lại để tiếp tục gửi báo cáo sự cố.');
      return;
    }

    setSubmitting(true);
    const idempKey = 'incident-' + Date.now() + '-' + Math.random().toString(36).substring(7);
    const reportPayload = {
      type: description || 'Khác',
      severity: result?.severity || 'Thấp',
      description,
      imageUri: image
    };

    if (!navigator.onLine) {
      try {
        const t = Date.now();
        const signature = await signData(JSON.stringify(reportPayload) + t, deviceSecret);
        
        await addToSyncQueue({
          type: 'INCIDENT',
          tenantId,
          data: reportPayload,
          timestamp: t,
          signature,
          retryCount: 0,
          status: 'PENDING'
        });
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
        setSubmitError('Không thể lưu báo cáo ngoại tuyến lúc này.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      await apiFetch('/api/security/incidents', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempKey
        },
        body: JSON.stringify(reportPayload)
      });

      setSubmitted(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Không thể báo cáo sự cố lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4"
      >
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold">Báo cáo thành công!</h2>
        <p className="text-slate-400">Thông tin đã được gửi về trung tâm điều hành.</p>
        {!isModal && <SCMDButton onClick={() => setSubmitted(false)} className="w-full mt-8">Ghi nhận mới</SCMDButton>}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn("p-4 space-y-8", !isModal && "pb-60")}
    >
      {!isModal && (
        <header className="px-2">
          <h1 className="text-3xl font-black text-white tracking-tighter">{t('security.incident_report')}</h1>
          <p className="text-scmd-silver/50 text-[10px] font-black uppercase tracking-[0.2rem] mt-2 opacity-80">Ghi nhận thông tin thực địa • TRUNG TÂM PHẢN ỨNG</p>
        </header>
      )}

      <div className="space-y-6 px-2">
        {submitError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={18} />
            <p>{submitError}</p>
          </div>
        )}

        <div className="relative aspect-video bg-slate-900/60 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group hover:border-scmd-cyber transition-all">
          {image ? (
            <div className="relative w-full h-full">
              <img src={image} alt="Incident" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors"
                type="button"
              >
                <RefreshCcw size={16} />
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setShowCamera(true)}
              className="flex flex-col items-center gap-4 cursor-pointer w-full h-full justify-center"
            >
              <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-scmd-cyber transition-all border border-white/5">
                <Camera size={32} />
              </div>
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">CHỤP LẠI BẰNG CHỨNG (LIVE CAPTURE)</span>
            </button>
          )}
          {analyzing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-scmd-cyber" size={32} />
              <span className="text-scmd-cyber font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">AI Đang phân tích...</span>
            </div>
          )}
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SCMDCard 
              className={cn(
                "p-4 border-2 flex gap-4 transition-all duration-500 rounded-2xl",
                result.severity === 'Cao' ? "bg-red-500/10 border-red-500/40" : 
                result.severity === 'Trung bình' ? "bg-amber-500/10 border-amber-500/40" : 
                "bg-scmd-cyber/10 border-scmd-cyber/40"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                result.severity === 'Cao' ? "bg-red-500 text-white" : 
                result.severity === 'Trung bình' ? "bg-amber-500 text-white" : 
                "bg-scmd-cyber text-slate-950"
              )}>
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">AI Đánh giá:</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                    result.severity === 'Cao' ? "bg-red-500/20 text-red-500 border-red-500/30" : 
                    result.severity === 'Trung bình' ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : 
                    "bg-scmd-cyber/20 text-scmd-cyber border-scmd-cyber/30"
                  )}>{result.severity}</span>
                </div>
                <p className="text-slate-300 font-bold mt-1 leading-relaxed uppercase text-[10px]">"{result.advice}"</p>
              </div>
            </SCMDCard>
          </motion.div>
        )}

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phân loại sự cố</label>
          <div className="grid grid-cols-2 gap-2">
            {['Cháy nổ', 'Trộm cắp', 'Gây rối', 'Hư hỏng', 'Đột nhập', 'Khác'].map((type) => (
              <button
                key={type}
                onClick={() => setDescription((prev: string) => prev.includes(type) ? prev : prev ? `${prev}, ${type}` : type)}
                className={cn(
                  "h-12 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center",
                  description.includes(type) 
                    ? "bg-scmd-cyber border-scmd-cyber text-slate-950 shadow-lg shadow-scmd-cyber/20" 
                    : "bg-slate-900/50 border-white/5 text-slate-500"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 h-32 focus:border-scmd-cyber/30 outline-none transition-all text-white text-xs placeholder:text-slate-800"
            placeholder="Mô tả chi tiết diễn biến sự cố..."
          />
        </div>

        <div className={cn(isModal ? "pt-4" : "fixed bottom-[80px] left-0 right-0 p-6 pt-12 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-30 pointer-events-none")} style={!isModal ? { bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' } : {}}>
          <button
            onClick={handleSubmit}
            disabled={!image || submitting}
            className={cn(
              "w-full h-16 rounded-2xl font-black text-lg uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-4 border-b-4 active:border-b-0 active:translate-y-1 pointer-events-auto",
              !(!image || submitting)
                ? "bg-scmd-cyber text-slate-950 border-scmd-cyber/30 shadow-xl" 
                : "bg-slate-900/50 text-slate-700 border-white/5 opacity-50"
            )}
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Send size={20} />
                GỬI BÁO CÁO CẤP TỐC
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCamera && (
          <SecureCameraCapture
            onCapture={handleCapture}
            onCancel={() => setShowCamera(false)}
            uploadCategory="INCIDENT"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
