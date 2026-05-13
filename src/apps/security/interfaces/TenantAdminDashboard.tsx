// @ts-nocheck
/**
 * TenantAdminDashboard — Orchestrator V4.0.2
 * Phiên bản tinh gọn, phân tách module theo chuẩn SCMD Pro.
 */

import React, { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardModals } from './DashboardModals';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardTabManager } from './DashboardTabManager';

import { useModalStore } from '../store/useModalStore';

import { useTenantCheckpoints } from './hooks/useTenantCheckpoints';
import { useTenantStaff } from './hooks/useTenantStaff';
import { useTenantDashboard } from './hooks/useTenantDashboard';
import { useDashboardActions } from './hooks/useDashboardActions';
import { ActiveTab } from './types';

export function TenantAdminDashboard() {
  const [message, setMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [siteSubTab, setSiteSubTab] = useState<'manage' | 'benchmark' | 'field'>('manage');
  
  // 1. Data Fetching & Core State
  const dashboardState = useTenantDashboard(setMessage);
  const { tenantInfo, loading } = dashboardState;

  // 2. Specialized Domain Hooks
  const checkpointActions = useTenantCheckpoints(dashboardState.fetchData, setMessage);
  const staffActions = useTenantStaff(
    dashboardState.fetchData, 
    setMessage, 
    dashboardState.staffFilters, 
    dashboardState.setStaffFilters
  );
  const dashboardActions = useDashboardActions(setMessage);

  // 3. Global Store State
  const { setShowConfirmModal, setSelectedMapPoint, setSelectedLog, setSelectedStaffDetail } = useModalStore();

  const isPro = tenantInfo?.subscriptionPlan === 'PRO' || tenantInfo?.subscriptionPlan === 'ENTERPRISE';

  // 4. Aggregate State & Actions for Tab Manager
  const combinedState = {
    ...dashboardState,
    ...checkpointActions,
    ...staffActions,
    ...dashboardActions,
    siteSubTab,
    isPro
  };

  const combinedActions = {
    ...checkpointActions,
    ...staffActions,
    ...dashboardActions,
    setActiveTab,
    setSiteSubTab,
    setSelectedMapPoint,
    setSelectedLog,
    onViewStaff: setSelectedStaffDetail,
    setShowConfirmModal,
    setMessage
  };

  return (
    <>
      <DashboardModals
        handleDeleteCheckpoint={checkpointActions.handleDeleteCheckpoint}
        handleDeleteStaff={staffActions.handleDeleteStaff}
        handleDeleteRoute={checkpointActions.handleDeleteRoute}
        setActiveTab={setActiveTab}
        handleAnalyzeLog={async (id: string) => { console.log('Analyze log:', id); }} 
      />

      <div className="flex h-screen overflow-hidden bg-scmd-navy">
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          tenantInfo={tenantInfo}
          loading={loading}
          isPro={isPro}
        />

        <main className="flex-1 overflow-y-auto p-8 relative bg-scmd-navy/30 no-scrollbar">
          <DashboardHeader user={{ name: "Admin" }} role="TENANT_ADMIN" />

          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-scmd-primary/10 border-t-scmd-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-scmd-primary/20 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <DashboardTabManager 
                activeTab={activeTab}
                isPro={isPro}
                state={combinedState}
                actions={combinedActions}
              />
            </div>
          )}
        </main>
      </div>

      {message && (
        <div className="fixed bottom-8 right-8 z-[500] animate-in slide-in-from-right-10">
          <div className={cn(
            "px-6 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest border flex items-center gap-3 backdrop-blur-xl",
            message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            <div className={cn("w-2 h-2 rounded-full", message.type === 'success' ? "bg-emerald-500" : "bg-red-500")} />
            {message.text}
          </div>
        </div>
      )}
    </>
  );
}

export default TenantAdminDashboard;
