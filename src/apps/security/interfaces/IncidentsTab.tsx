import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { IncidentLifecycleManager } from './components/IncidentLifecycleManager';
import { IncidentReport } from './IncidentReport';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';

export const IncidentsTab: React.FC = () => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReportSuccess = () => {
    setShowReportForm(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            Quản lý vòng đời Sự cố
          </h2>
          <p className="text-[10px] text-scmd-silver/40 font-bold uppercase tracking-widest mt-1">
            Hệ đồng điều phối & đo lường SLA MTTR
          </p>
        </div>

        <SCMDButton 
          onClick={() => setShowReportForm(true)}
          className="h-12 px-6 flex items-center gap-2 rounded-2xl bg-scmd-cyber text-scmd-navy font-black"
        >
          <AlertCircle size={18} />
          BÁO CÁO SỰ CỐ MỚI
        </SCMDButton>
      </div>

      <IncidentLifecycleManager key={refreshKey} />

      {/* Report Modal */}
      <AnimatePresence>
        {showReportForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportForm(false)}
              className="absolute inset-0 bg-scmd-navy/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-scmd-surface border border-white/10 rounded-[32px] shadow-huge overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-scmd-navy/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-scmd-cyber/10 rounded-xl flex items-center justify-center text-scmd-cyber">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Khu vực báo cáo sự cố</h3>
                    <p className="text-[9px] text-scmd-silver/40 font-bold uppercase tracking-widest">Trung tâm chỉ huy trực tuyến</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportForm(false)}
                  className="w-10 h-10 rounded-xl bg-scmd-navy flex items-center justify-center text-scmd-silver/40 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <IncidentReport isModal onSuccess={handleReportSuccess} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
