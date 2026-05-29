import React from 'react';
import { DashboardSpinner } from './DashboardUI';

interface SCMDSuspenseProps {
  message?: string;
  fullHeight?: boolean;
}

export const SCMDSuspense: React.FC<SCMDSuspenseProps> = ({ 
  message = "Đang tải dữ liệu...", 
  fullHeight = true 
}) => {
  return <DashboardSpinner message={message} fullHeight={fullHeight} className={fullHeight ? undefined : 'py-12'} />;
};
