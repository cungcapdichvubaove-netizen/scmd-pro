import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  Shield, AlertTriangle, CheckCircle2, History, Plus, Gavel, Info, Loader2, Sparkles, BrainCircuit, Scan, Database, ShieldCheck, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton.js';
import { SCMDCard } from '../../../common/interfaces/components/SCMDCard.js';

interface PerformanceData {
  metrics: {
    period: string;
    trustScore: number;
    attendanceRate: number;
    missedPoints: number;
    sosCount: number;
  }[];
  disciplinaryActions: {
    id: string;
    type: string;
    description: string;
    severity: string;
    evidenceUris: string[];
    actionTaken?: string;
    occurredAt: string;
  }[];
  summary: {
    patrolCount: number;
    sosCountRecent: number;
    currentTrustScore: number;
    attendanceRate: number;
    reputation?: {
      violations: number;
      severeViolations: number;
      incidents: number;
      status: string;
    };
  };
}

export const StaffPerformancePortfolio: React.FC<{ staffId: string; staffName: string }> = ({ staffId, staffName }) => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDisciplinary, setShowAddDisciplinary] = useState(false);
  const [newAction, setNewAction] = useState({
    type: 'LATE',
    description: '',
    severity: 'LOW',
    actionTaken: '',
    occurredAt: new Date().toISOString().split('T')[0],
    evidenceUris: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPerformance();
  }, [staffId]);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<PerformanceData>(`/api/tenant/staff/${staffId}/performance`);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDisciplinary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenant/staff/${staffId}/disciplinary`, {
        method: 'POST',
        body: JSON.stringify(newAction)
      });
      setShowAddDisciplinary(false);
      setNewAction({ 
        type: 'LATE', 
        description: '', 
        severity: 'LOW', 
        actionTaken: '',
        occurredAt: new Date().toISOString().split('T')[0],
        evidenceUris: [] as string[]
      });
      fetchPerformance();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
      <Loader2 className="animate-spin text-scmd-cyber mb-4" size={32} />
      <p className="text-scmd-silver/40 font-black tracking-widest text-xs">TRUY XUẤT BẰNG CHỨNG SỐ...</p>
    </div>
  );

  if (!data) return <div className="p-12 text-center text-scmd-silver/40 font-bold">Lỗi tải dữ liệu hồ sơ.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SCMDCard className="p-4 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Tin cậy hiện tại</p>
          <div className="flex items-center gap-2">
            <Shield className={cn("w-5 h-5", data.summary.currentTrustScore > 90 ? "text-emerald-400" : "text-amber-400")} />
            <span className="text-2xl font-black text-white">{data.summary.currentTrustScore}%</span>
          </div>
        </SCMDCard>
        <SCMDCard className="p-4 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Đúng ca (30d)</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-scmd-cyber" />
            <span className="text-2xl font-black text-white">{data.summary.attendanceRate}%</span>
          </div>
        </SCMDCard>
        <SCMDCard className="p-4 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Tuần tra (30d)</p>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span className="text-2xl font-black text-white">{data.summary.patrolCount}</span>
          </div>
        </SCMDCard>
        <SCMDCard className="p-4 bg-scmd-navy/50 border-white/5">
          <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Cảnh báo SOS</p>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("w-5 h-5", data.summary.sosCountRecent > 0 ? "text-red-400" : "text-scmd-silver/20")} />
            <span className="text-2xl font-black text-white">{data.summary.sosCountRecent}</span>
          </div>
        </SCMDCard>
      </div>

      {/* Global Reputation Summary (Smart Recognition) */}
      {data.summary.reputation && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-6 rounded-[32px] border-2 shadow-lg flex flex-col md:flex-row items-center gap-6 relative overflow-hidden",
            data.summary.reputation.status === 'CLEAN' ? "bg-emerald-500/5 border-emerald-500/20" :
            data.summary.reputation.status === 'WARNING' ? "bg-amber-500/5 border-amber-500/20" :
            "bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20"
          )}
        >
          {data.summary.reputation.status === 'CRITICAL' && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 animate-pulse pointer-events-none" />
          )}
          
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 relative z-10",
            data.summary.reputation.status === 'CLEAN' ? "bg-emerald-500/20 text-emerald-400" :
            data.summary.reputation.status === 'WARNING' ? "bg-amber-500/20 text-amber-400" :
            "bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          )}>
            {data.summary.reputation.status === 'CLEAN' ? <ShieldCheck size={32} /> :
             data.summary.reputation.status === 'WARNING' ? <AlertTriangle size={32} /> :
             <Gavel size={32} className="animate-bounce" />}
          </div>
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <h5 className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
              <Scan size={14} className="text-scmd-cyber" /> Smart Recognition — Digital Source of Truth
            </h5>
            <p className={cn(
              "text-xl font-black mt-1 uppercase tracking-tighter",
              data.summary.reputation.status === 'CLEAN' ? "text-emerald-400" :
              data.summary.reputation.status === 'WARNING' ? "text-amber-400" :
              "text-red-500"
            )}>
              {data.summary.reputation.status === 'CLEAN' ? "Nhân sự tin cậy cao" :
               data.summary.reputation.status === 'WARNING' ? "Phát hiện tiền sự kỷ luật" :
               "PHÁT HIỆN LỊCH SỬ KỶ LUẬT NGHIÊM TRỌNG"}
            </p>
            <p className="text-[11px] font-bold text-scmd-silver/40 leading-relaxed mt-2 uppercase tracking-tight">
              Phát hiện {data.summary.reputation.violations} vi phạm kỷ luật ({data.summary.reputation.severeViolations} lỗi nặng) trong mạng lưới đối tác SCMD. Hệ thống khuyến nghị giám sát chặt chẽ.
            </p>
          </div>
          
          <div className="px-6 py-4 bg-scmd-navy/80 border border-white/5 rounded-2xl text-center relative z-10 min-w-[120px]">
             <Database size={16} className="text-scmd-cyber mx-auto mb-1" />
             <p className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest mb-1">Network Sync</p>
             <div className="flex items-center justify-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">VERIFIED</p>
             </div>
          </div>
        </motion.div>
      )}

      {/* Trust Score History Chart */}
      <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-widest">Lịch sử tin cậy (6 tháng)</h4>
            <div className="flex items-center gap-2 mt-1">
              <BrainCircuit size={10} className="text-scmd-cyber" />
              <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-tighter">
                Phân tích bởi Watcher AI™ • Digital Source of Truth
              </p>
            </div>
          </div>
          <Sparkles className="text-scmd-cyber animate-pulse" size={16} />
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...data.metrics].reverse()}>
              <defs>
                <linearGradient id="colorTrust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis 
                dataKey="period" 
                stroke="#475569" 
                fontSize={10} 
                fontWeight="bold"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={10} 
                fontWeight="bold"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="trustScore" 
                stroke="var(--color-primary)" 
                fillOpacity={1} 
                fill="url(#colorTrust)" 
                strokeWidth={3}
                name="Điểm tin cậy"
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="attendanceRate" 
                stroke="#818cf8" 
                fill="transparent" 
                strokeWidth={2}
                name="Tỉ lệ đúng ca"
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SCMDCard>

      {/* Disciplinary Actions & Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Gavel size={18} className="text-amber-400" /> Hồ sơ vi phạm & Kỷ luật
            </h4>
            <button 
              onClick={() => setShowAddDisciplinary(true)}
              className="p-2.5 bg-scmd-navy hover:bg-scmd-navy/80 rounded-xl transition-all text-emerald-400 shadow-sm"
              title="Ghi nhận vi phạm"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
            {data.disciplinaryActions.length === 0 ? (
              <div className="p-10 text-center bg-emerald-500/5 rounded-[32px] border border-emerald-500/10">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={32} />
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Sạch hồ sơ vi phạm</p>
                <p className="text-[9px] text-scmd-silver/40 font-bold mt-2 uppercase">Không có dữ liệu tiêu cực cho {staffName}</p>
              </div>
            ) : (
              data.disciplinaryActions.map(action => (
                <div key={action.id} className="p-5 bg-scmd-navy/40 rounded-3xl border border-white/5 group hover:border-scmd-silver/40 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border",
                      action.severity === 'HIGH' 
                        ? "bg-red-500/10 text-red-500 border-red-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {action.type}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-scmd-silver/40">
                      {new Date(action.occurredAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-scmd-silver/60 font-bold mb-4 leading-relaxed">{action.description}</p>
                  
                  {action.actionTaken && (
                    <div className="flex items-start gap-2 p-3 bg-scmd-navy/50 rounded-2xl border border-white/5 mb-3">
                      <Info size={14} className="text-scmd-cyber shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-scmd-silver/40 uppercase tracking-widest mb-0.5">Xử lý đã thực hiện</p>
                        <p className="text-[11px] font-bold text-indigo-300">{action.actionTaken}</p>
                      </div>
                    </div>
                  )}

                  {action.evidenceUris.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {action.evidenceUris.map((uri, i) => (
                        <div key={i} className="w-14 h-14 bg-slate-700 rounded-xl overflow-hidden border border-white/5 cursor-pointer hover:scale-110 transition-transform shadow-md">
                           <img 
                            src={uri} 
                            alt="Evidence" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=100&h=100&auto=format&fit=crop";
                              target.onerror = null;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SCMDCard>

        {/* Attendance Evidence & Performance Matrix */}
        <SCMDCard className="p-6 bg-scmd-navy/50 border-white/5 flex flex-col">
           <h4 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
            <Sparkles size={18} className="text-scmd-cyber" /> Ma trận bằng chứng số
          </h4>
          <div className="space-y-6 flex-1">
            <div className="p-5 bg-scmd-navy/40 rounded-3xl border border-white/5">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">Hiệu suất tuần tra</p>
                  <p className="text-2xl font-black text-white mt-1">{data.summary.attendanceRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-scmd-cyber uppercase tracking-widest">ĐANG CẢI THIỆN</p>
                  <p className="text-[10px] font-bold text-scmd-silver/40 uppercase tracking-tighter mt-1">Dựa trên {data.summary.patrolCount} lượt</p>
                </div>
              </div>
              <div className="w-full h-2.5 bg-scmd-navy rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.summary.attendanceRate}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-scmd-cyber rounded-full relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-scmd-navy/40 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-2">Phản ứng SOS</p>
                <p className="text-xl font-black text-white ">4.5 <span className="text-[10px] text-scmd-silver/40 uppercase font-bold tracking-widest">m</span></p>
                <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                  <CheckCircle2 size={10} /> ĐẠT CHUẨN SLA
                </div>
              </div>
              <div className="p-5 bg-scmd-navy/40 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest mb-2">Báo cáo bất thường</p>
                <p className="text-xl font-black text-white">{data.disciplinaryActions.length}</p>
                <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-amber-400">
                  <AlertTriangle size={10} /> CẦN QUAN SÁT
                </div>
              </div>
            </div>

            <div className="p-6 bg-indigo-500/10 rounded-[32px] border border-indigo-500/20 mt-auto">
               <div className="flex items-center gap-2 mb-3">
                 <Shield className="text-indigo-400" size={16} />
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Kết luận của Giám đốc An ninh</p>
               </div>
               <p className="text-[11px] font-bold text-indigo-200 leading-relaxed text-center px-4 ">
                 "{data.summary.currentTrustScore > 90 
                    ? `Nhân viên ${staffName} có chỉ số tin cậy vượt trội. Khuyến khích xếp loại TỐT và xem xét khen thưởng quý.` 
                    : `Nhân viên ${staffName} cần cải thiện tính kỷ luật và giảm tỉ lệ bỏ điểm tuần tra.`}"
               </p>
            </div>
          </div>
        </SCMDCard>
      </div>

      {/* Add Disciplinary Modal */}
      {showAddDisciplinary && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-scmd-navy/90 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg bg-[var(--color-bg)] border border-white/10 rounded-[32px] p-8 shadow-huge overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-6">
              <button 
                onClick={() => setShowAddDisciplinary(false)} 
                className="w-10 h-10 flex items-center justify-center bg-scmd-navy hover:bg-scmd-navy/80 rounded-full text-white transition-all shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                 <Gavel size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Ghi nhận vi phạm</h3>
                <p className="text-[10px] font-black text-[#CCD6F6]/50 uppercase tracking-widest mt-0.5">Dữ liệu được lưu vào Digital Source of Truth</p>
              </div>
            </div>
            
            <form onSubmit={handleAddDisciplinary} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest ml-1">Loại vi phạm</label>
                <select 
                   value={newAction.type}
                   onChange={e => setNewAction({...newAction, type: e.target.value})}
                   className="w-full px-5 py-4 bg-scmd-navy border border-white/5 rounded-2xl font-bold text-white appearance-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all cursor-pointer"
                >
                  <option value="LATE">Đi trễ / Về sớm</option>
                  <option value="ABANDON">Bỏ điểm trực / Ngủ trong ca</option>
                  <option value="UNIFORM">Sai quy định tác phong / Đồng phục</option>
                  <option value="BEHAVIOR">Thái độ không chuẩn mực</option>
                  <option value="OTHER">Vi phạm khác</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest ml-1">Mô tả sự việc</label>
                <textarea 
                  required
                  value={newAction.description}
                  onChange={e => setNewAction({...newAction, description: e.target.value})}
                  className="w-full p-5 bg-scmd-navy border border-white/5 rounded-2xl h-28 font-medium text-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-sm resize-none"
                  placeholder="Mô tả cụ thể hành vi vi phạm..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest ml-1">Mức độ</label>
                  <select 
                    value={newAction.severity}
                    onChange={e => setNewAction({...newAction, severity: e.target.value})}
                    className="w-full px-5 py-4 bg-scmd-navy border border-white/5 rounded-2xl font-bold text-white appearance-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all cursor-pointer"
                  >
                    <option value="LOW">NHẸ (Nhắc nhở)</option>
                    <option value="MEDIUM">TRUNG BÌNH</option>
                    <option value="HIGH">NGHIÊM TRỌNG</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest ml-1">Ngày xảy ra</label>
                  <input 
                    type="date"
                    value={newAction.occurredAt}
                    onChange={e => setNewAction({...newAction, occurredAt: e.target.value})}
                    className="w-full px-5 py-4 bg-scmd-navy border border-white/5 rounded-2xl font-bold text-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest ml-1">Hình thức xử lý</label>
                <input 
                  type="text"
                  value={newAction.actionTaken}
                  onChange={e => setNewAction({...newAction, actionTaken: e.target.value})}
                  className="w-full px-5 py-4 bg-scmd-navy border border-white/5 rounded-2xl font-bold text-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                  placeholder="Kỷ luật / Trừ lương..."
                />
              </div>

              <div className="pt-2">
                <SCMDButton 
                  type="submit" 
                  disabled={submitting}
                  className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-3 transition-all"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                  XÁC NHẬN GHI HỒ SƠ
                </SCMDButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
