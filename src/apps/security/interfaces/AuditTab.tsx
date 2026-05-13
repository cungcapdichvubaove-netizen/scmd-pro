import React from 'react';
import { motion } from 'motion/react';
import { SurpriseAudit } from './components/SurpriseAudit';

export const AuditTab: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <SurpriseAudit />
    </motion.div>
  );
};
