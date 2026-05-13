import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Printer 
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { Staff } from '../types';
import { getDisplayName } from '../StaffTab.utils.js';

interface StaffPrintModalProps {
  showPrintModal: Staff | null;
  printFields: string[];
  setShowPrintModal: (v: Staff | null) => void;
  setPrintFields: (v: string[]) => void;
  handlePrintStaffProfile: (s: Staff) => void;
}

export const StaffPrintModal: React.FC<StaffPrintModalProps> = ({
  showPrintModal,
  printFields,
  setShowPrintModal,
  setPrintFields,
  handlePrintStaffProfile,
}) => {
  if (!showPrintModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPrintModal(null)}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-scmd-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-scmd-navy/20">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Xuất hồ sơ PDF</h3>
                <p className="text-[10px] text-scmd-primary font-black uppercase tracking-widest mt-0.5">
                  {getDisplayName(showPrintModal)}
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-scmd-navy border border-white/10 text-scmd-silver/40 hover:text-white transition-all shadow-sm"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[10px] font-black text-scmd-silver/20 uppercase tracking-widest mb-3">
              Chọn thông tin xuất
            </p>

            <div className="space-y-2">
              {[
                { key: 'name', label: 'Họ và tên' },
                { key: 'staffId', label: 'Mã nhân viên' },
                { key: 'role', label: 'Vai trò' },
                { key: 'qualifications', label: 'Bằng cấp' },
                { key: 'certificates', label: 'Chứng chỉ' },
                { key: 'rewards', label: 'Khen thưởng' },
                { key: 'disciplines', label: 'Kỷ luật' },
              ].map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-3 p-3 bg-scmd-navy/40 hover:bg-scmd-navy border border-white/5 rounded-xl cursor-pointer transition-all shadow-inner group"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      printFields.includes(field.key)
                        ? 'bg-scmd-primary border-scmd-primary shadow-lg shadow-scmd-primary/20'
                        : 'border-white/10 group-hover:border-white/20',
                    )}
                  >
                    {printFields.includes(field.key) && (
                      <Check size={10} strokeWidth={4} className="text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={printFields.includes(field.key)}
                    onChange={(e) =>
                      setPrintFields(
                        e.target.checked
                          ? [...printFields, field.key]
                          : printFields.filter((f) => f !== field.key),
                      )
                    }
                    className="hidden"
                  />
                  <span className="text-sm font-black text-scmd-silver/80 uppercase tracking-tight">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 flex gap-3 bg-scmd-navy/40 border-t border-white/5">
            <button
              onClick={() => handlePrintStaffProfile(showPrintModal)}
              className="flex-1 h-11 flex items-center justify-center gap-2 bg-scmd-primary hover:bg-scmd-primary/80 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-scmd-primary/25 uppercase tracking-tighter"
            >
              <Printer size={15} /> Xuất PDF
            </button>
            <button
              onClick={() => setShowPrintModal(null)}
              className="flex-1 h-11 flex items-center justify-center font-black text-sm text-scmd-silver/40 hover:text-white rounded-xl bg-scmd-surface hover:bg-scmd-navy transition-all border border-white/10 uppercase tracking-tighter"
            >
              Hủy
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
