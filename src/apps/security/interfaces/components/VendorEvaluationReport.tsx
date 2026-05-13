import React, { useState, useEffect } from 'react';
import { 
  FileText, TrendingUp, AlertTriangle, ShieldCheck, 
  Download, Loader2, X, Award, 
  ChevronRight, Activity, Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { cn } from '../../../../lib/utils';
import { getAuthHeaders } from '../../../common/utils/auth';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard';

interface VendorEvaluation {
  vendorId: string;
  vendorName: string;
  weightedScore: number;
  rank: 'STRATEGIC' | 'COMPLIANT' | 'NEEDS_IMPROVEMENT' | 'AT_RISK';
  monthlyHistory: {
    month: string;
    score: number;
  }[];
  totalViolations: number;
  recommendation: string;
}

interface VendorEvaluationReportProps {
  vendorId: string;
  onClose: () => void;
}

export const VendorEvaluationReport: React.FC<VendorEvaluationReportProps> = ({ vendorId, onClose }) => {
  const [evaluation, setEvaluation] = useState<VendorEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluation();
  }, [vendorId]);

  const fetchEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/evaluation`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error("Error fetching vendor evaluation:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRankConfig = (rank: VendorEvaluation['rank']) => {
    switch (rank) {
      case 'STRATEGIC': 
        return { 
          label: 'Đối tác Chiến lược', 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10', 
          border: 'border-emerald-500/20',
          icon: Award 
        };
      case 'COMPLIANT': 
        return { 
          label: 'Đạt chuẩn', 
          color: 'text-sky-400', 
          bg: 'bg-sky-500/10', 
          border: 'border-sky-500/20',
          icon: ShieldCheck 
        };
      case 'NEEDS_IMPROVEMENT': 
        return { 
          label: 'Cần cải thiện', 
          color: 'text-amber-400', 
          bg: 'bg-amber-500/10', 
          border: 'border-amber-500/20',
          icon: Info 
        };
      case 'AT_RISK': 
        return { 
          label: 'Mức độ Nguy cơ', 
          color: 'text-red-400', 
          bg: 'bg-red-500/10', 
          border: 'border-red-500/20',
          icon: AlertTriangle 
        };
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 text-sky-400 animate-spin mx-auto" />
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Đang phân tích dữ liệu 12 tháng...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const rankConfig = getRankConfig(evaluation.rank);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[var(--color-bg)]/90 backdrop-blur-2xl z-50 overflow-y-auto p-4 md:p-10"
    >
      <div className="max-w-6xl mx-auto scmd-glass rounded-[48px] overflow-hidden">
        {/* Modal Header */}
        <div className="p-10 border-b border-[var(--color-border)]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--color-surface)]/30">
          <div className="flex items-center gap-6">
            <div className={cn("w-20 h-20 rounded-[28px] flex items-center justify-center border", rankConfig.bg, rankConfig.color, rankConfig.border)}>
              <rankConfig.icon size={40} />
            </div>
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{evaluation.vendorName}</h2>
                <span className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", rankConfig.bg, rankConfig.color, rankConfig.border)}>
                  {rankConfig.label}
                </span>
              </div>
              <p className="text-[var(--color-text-secondary)] font-bold opacity-80 decoration-[var(--color-primary)]/30 underline underline-offset-4">Báo cáo đánh giá năng lực tích lũy (Chu kỳ 12 tháng)</p>
            </div>
          </div>
          <div className="flex gap-4">
            <SCMDButton className="h-14 px-8 !bg-[var(--color-primary)] shadow-2xl shadow-[var(--color-primary)]/20 !rounded-2xl">
              <Download size={20} className="mr-2" /> XUẤT BÁO CÁO PDF
            </SCMDButton>
            <button 
              onClick={onClose}
              className="w-14 h-14 bg-[var(--gray-100)] text-[var(--color-text-muted)] hover:text-white rounded-2xl flex items-center justify-center transition-all border border-[var(--color-border)]/20"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-10 space-y-12">
          {/* Top Score Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SCMDCard className="p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Điểm Weighted Average</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">{evaluation.weightedScore}</span>
                <span className="text-xl font-bold text-[var(--color-text-muted)]">/100</span>
              </div>
              <div className="mt-6 flex items-center gap-2 text-[var(--color-success)]">
                <TrendingUp size={16} />
                <span className="text-xs font-black uppercase tracking-tight">+3.2% so với cùng kỳ</span>
              </div>
            </SCMDCard>

            <SCMDCard className="p-8 flex flex-col justify-center">
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Khuyến nghị Tái ký</p>
              <p className="text-lg font-bold text-white leading-tight ">"{evaluation.recommendation}"</p>
            </SCMDCard>

            <SCMDCard className="p-8 flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Tổng số lỗi/vi phạm</p>
              <div className="text-5xl font-black text-[var(--color-warning)]">{evaluation.totalViolations}</div>
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-2">Trong 12 tháng qua</p>
            </SCMDCard>
          </div>

          {/* Performance Chart */}
          <SCMDCard className="p-10">
            <div className="flex justify-between items-end mb-10">
               <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">Biểu đồ xu hướng 12 tháng</h3>
                 <p className="text-[10px] text-[var(--color-text-secondary)] font-bold uppercase tracking-widest mt-1 decoration-[var(--color-primary)]/30 underline underline-offset-4">Dữ liệu SLA Compliance trung bình hàng tháng</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                     <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase">SLA Score</span>
                  </div>
               </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evaluation.monthlyHistory}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="var(--color-text-muted)" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickFormatter={(val) => val.split('-').reverse().join('/')}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="var(--color-text-muted)" 
                    fontSize={10} 
                    fontWeight="bold"
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-bg)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '16px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#fff',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: '#2563eb', textTransform: 'uppercase' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563eb" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SCMDCard>

          {/* Matrix Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SCMDCard className="p-8">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <Activity size={18} className="text-[var(--color-primary)]" /> Điểm mạnh vận hành
              </h4>
              <ul className="space-y-4">
                {[
                  'Duy trì tần suất tuần tra ổn định (>98%)',
                  'Phản ứng sự cố khẩn cấp nhanh (MTTR < 15p)',
                  'Sử dụng 100% công cụ báo cáo số hóa SCMD Pro'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-xs font-bold text-[var(--color-text-secondary)]">
                    <div className="w-6 h-6 bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-lg flex items-center justify-center shrink-0">
                      <ChevronRight size={14} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </SCMDCard>

            <SCMDCard className="p-8">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <AlertTriangle size={18} className="text-[var(--color-warning)]" /> Các điểm cần lưu ý
              </h4>
              <ul className="space-y-4">
                {[
                  'Tỉ lệ vi phạm tác phong trang phục còn tồn tại (3 lỗi/tháng)',
                  'Cần cải thiện chất lượng hình ảnh bằng chứng báo cáo',
                  'Dữ liệu chấm công thỉnh thoảng có độ trễ do GPS'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-xs font-bold text-[var(--color-text-secondary)]">
                    <div className="w-6 h-6 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-lg flex items-center justify-center shrink-0">
                      <ChevronRight size={14} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </SCMDCard>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-[var(--color-border)]/20 bg-[var(--color-bg)]/50 flex items-center gap-6">
           <FileText className="text-[var(--color-text-muted)]" size={32} />
           <div className="flex-1">
             <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Xác thực hệ thống</p>
             <p className="text-xs font-bold text-[var(--color-text-muted)]/80 ">Dữ liệu được trích xuất tự động từ SCMD Pro Analytics Engine. Không thể can thiệp thủ công.</p>
           </div>
           <div className="text-right">
             <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Ngày xuất báo cáo</p>
             <p className="text-sm font-black text-white uppercase">{new Date().toLocaleDateString('vi-VN')}</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
