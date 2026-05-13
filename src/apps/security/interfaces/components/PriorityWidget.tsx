import React from 'react';
import { motion } from 'motion/react';
import { Zap, AlertTriangle, FileText, Download } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SCMDButton } from '../../../common/interfaces/components/SCMDButton';

interface PriorityTask {
  id: string;
  type: 'SOS' | 'MISSED';
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING';
}

interface PriorityWidgetProps {
  tasks: PriorityTask[];
  onExport: () => void;
}

export const PriorityWidget: React.FC<PriorityWidgetProps> = ({ tasks, onExport }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Priority Section */}
      <div className="bg-scmd-surface rounded-[32px] border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-scmd-alert/20 flex items-center justify-center text-scmd-alert">
            <Zap size={20} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Ưu tiên xử lý</h3>
        </div>
        
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-xs font-bold text-scmd-silver/40 uppercase tracking-widest">Hệ thống ổn định</p>
            </div>
          ) : (
            tasks.map((task) => (
              <motion.div
                key={task.id}
                whileHover={{ x: 4 }}
                className={cn(
                  "p-4 rounded-2xl border flex items-start gap-4",
                  task.severity === 'CRITICAL' 
                    ? "bg-scmd-alert/5 border-scmd-alert/20" 
                    : "bg-amber-500/5 border-amber-500/20"
                )}
              >
                <div className={cn(
                  "mt-1 shrink-0",
                  task.severity === 'CRITICAL' ? "text-scmd-alert" : "text-amber-500"
                )}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                  <p className="text-xs text-scmd-silver/60 mt-1">{task.description}</p>
                  <button className="mt-3 text-[10px] font-black uppercase tracking-widest text-scmd-cyber hover:underline">
                    Xử lý ngay
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-scmd-surface rounded-[32px] border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-scmd-cyber/20 flex items-center justify-center text-scmd-cyber">
            <FileText size={20} />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-scmd-silver/60">Báo cáo nhanh</h3>
        </div>
        
        <p className="text-xs text-scmd-silver/60 mb-6 leading-relaxed">
          Xuất dữ liệu ca trực hiện tại ra định dạng PDF/Excel chuyên nghiệp để gửi cho khách hàng hoặc lưu trữ.
        </p>
        
        <SCMDButton 
          onClick={onExport}
          className="w-full h-14 bg-scmd-navy/80 hover:bg-scmd-navy border-white/5 hover:border-scmd-primary/30"
        >
          <Download size={18} /> Tải báo cáo ca trực
        </SCMDButton>
      </div>
    </div>
  );
};
