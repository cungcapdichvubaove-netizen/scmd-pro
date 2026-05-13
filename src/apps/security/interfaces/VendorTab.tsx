import React from 'react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { FeatureLock } from './components/FeatureLock';
import { VendorContractManagement } from './components/VendorContractManagement';
import { useDashboardStore } from '../store/useDashboardStore';

export const VendorTab: React.FC = () => {
  const { isPro, setShowUpgradeModal } = useDashboardStore(useShallow(state => ({
    isPro: state.isPro,
    setShowUpgradeModal: state.setShowUpgradeModal
  })));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-in fade-in duration-500"
    >
      <header>
        <h2 className="text-4xl font-black tracking-tight text-white uppercase">Nhà thầu & SLA</h2>
        <p className="text-slate-400 mt-2 font-medium">
          Quản lý hợp đồng bảo vệ và theo dõi cam kết chất lượng dịch vụ.
        </p>
      </header>
      {!isPro ? (
        <FeatureLock
          title="Quản lý Nhà thầu & SLA"
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      ) : (
        <VendorContractManagement />
      )}
    </motion.div>
  );
};

export default VendorTab;
