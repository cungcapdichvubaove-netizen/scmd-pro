import React, { useState } from 'react';
import { Camera, Upload, Send, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import translations from '../../common/constants/translations.json';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { SCMDInput } from '../../common/interfaces/components/SCMDInput';

export const IncidentReport: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ severity: string, advice: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI analysis skipped.");
      setResult({ severity: "N/A", advice: "Vui lòng cấu hình API Key để sử dụng tính năng phân tích AI." });
      return;
    }

    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = base64.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: "Bạn là chuyên gia an ninh. Hãy phân tích hình ảnh sự cố này và trả về JSON với 2 trường: 'severity' (Thấp/Trung bình/Cao) và 'advice' (Lời khuyên ngắn gọn cho bảo vệ). Trả về duy nhất JSON." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING },
              advice: { type: Type.STRING }
            },
            required: ["severity", "advice"]
          }
        }
      });

      const data = JSON.parse(response.text);
      setResult(data);
    } catch (error) {
      console.error("AI Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4"
      >
        <div className="w-20 h-20 bg-scmd-safety/20 text-scmd-safety rounded-full flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold">{translations.security.report_success}</h2>
        <p className="text-slate-400">Thông tin đã được gửi về trung tâm điều hành.</p>
        <SCMDButton onClick={() => setSubmitted(false)} className="w-full mt-8">Ghi nhận mới</SCMDButton>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-4 space-y-6 pb-32"
    >
      <header>
        <h1 className="text-2xl font-bold text-white">{translations.security.incident_report}</h1>
        <p className="text-slate-400 text-sm">Ghi nhận {translations.entities.incident} tại hiện trường</p>
      </header>

      <div className="space-y-4">
        <div className="relative aspect-video bg-scmd-navy rounded-scmd border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt="Incident" className="w-full h-full object-cover" />
          ) : (
            <label className="flex flex-col items-center gap-2 cursor-pointer">
              <Camera size={48} className="text-slate-500" />
              <span className="text-slate-400 font-medium">Chụp ảnh hoặc tải lên</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
          {analyzing && (
            <div className="absolute inset-0 bg-scmd-navy/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-scmd-cyber" size={32} />
              <span className="text-white font-medium">AI đang phân tích...</span>
            </div>
          )}
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SCMDCard 
              className={cn(
                "p-4 border flex gap-3",
                result.severity === 'Cao' ? "bg-scmd-alert/10 border-scmd-alert/50" : 
                result.severity === 'Trung bình' ? "bg-scmd-alert/10 border-scmd-alert/30" : 
                "bg-scmd-cyber/10 border-scmd-cyber/50"
              )}
            >
              <AlertCircle className={cn(
                result.severity === 'Cao' ? "text-scmd-alert" : 
                result.severity === 'Trung bình' ? "text-scmd-alert" : 
                "text-scmd-cyber"
              )} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Mức độ:</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    result.severity === 'Cao' ? "bg-scmd-alert text-white" : 
                    result.severity === 'Trung bình' ? "bg-scmd-alert/50 text-white" : 
                    "bg-scmd-cyber text-slate-950"
                  )}>{result.severity}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1">{result.advice}</p>
              </div>
            </SCMDCard>
          </motion.div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-400">Loại sự cố</label>
          <div className="grid grid-cols-2 gap-2">
            {['Cháy nổ', 'Trộm cắp', 'Gây rối', 'Hư hỏng', 'Đột nhập', 'Khác'].map((type) => (
              <button
                key={type}
                onClick={() => setDescription(prev => prev.includes(type) ? prev : prev ? `${prev}, ${type}` : type)}
                className={cn(
                  "py-3 px-4 rounded-scmd border font-bold text-sm transition-all active:scale-95",
                  description.includes(type) 
                    ? "bg-scmd-cyber border-scmd-cyber text-slate-950" 
                    : "bg-scmd-navy border-slate-800 text-slate-400"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-scmd-navy border border-slate-800 rounded-scmd p-4 h-24 focus:border-scmd-cyber outline-none transition-colors text-sm"
            placeholder="Ghi chú thêm (không bắt buộc)..."
          />
        </div>

        <SCMDButton
          onClick={handleSubmit}
          disabled={!image || submitting}
          className="w-full h-14 text-lg gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          {translations.security.report_incident}
        </SCMDButton>
      </div>
    </motion.div>
  );
};

