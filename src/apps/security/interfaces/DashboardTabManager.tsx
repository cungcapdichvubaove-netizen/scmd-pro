import React, { lazy, Suspense } from 'react';
import { ActiveTab } from './types';

const OverviewTab = lazy(() => import('./OverviewTab').then(m => ({ default: m.OverviewTab })));
const SitesTab = lazy(() => import('./SitesTab').then(m => ({ default: m.SitesTab })));
const StaffTab = lazy(() => import('./StaffTab').then(m => ({ default: m.StaffTab })));
const IncidentsTab = lazy(() => import('./IncidentsTab').then(m => ({ default: m.IncidentsTab })));
const AuditTab = lazy(() => import('./AuditTab').then(m => ({ default: m.AuditTab })));
const TasksTab = lazy(() => import('./TasksTab').then(m => ({ default: m.TasksTab })));
const ReportsTab = lazy(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
const AttendanceTab = lazy(() => import('./AttendanceTab').then(m => ({ default: m.AttendanceTab })));
const VendorTab = lazy(() => import('./VendorTab').then(m => ({ default: m.VendorTab })));
const BillingTab = lazy(() => import('./BillingTab').then(m => ({ default: m.BillingTab })));
const SettingsTab = lazy(() => import('./SettingsTab').then(m => ({ default: m.SettingsTab })));
const ViolationsTab = lazy(() => import('./ViolationsTab').then(m => ({ default: m.ViolationsTab })));
const HelpTab = lazy(() => import('./HelpTab').then(m => ({ default: m.HelpTab })));
const MarketGrowthTab = lazy(() => import('./MarketGrowthTab').then(m => ({ default: m.MarketGrowthTab })));
const UsageAnalyticsTab = lazy(() => import('./UsageAnalyticsTab').then(m => ({ default: m.UsageAnalyticsTab })));
const FileManager = lazy(() => import('./components/FileManager').then(m => ({ default: m.FileManager })));

interface DashboardTabManagerProps {
  activeTab: ActiveTab;
  isPro: boolean;
  state: any; // All data from useTenantDashboard + stores
  actions: any; // All handlers from useTenantCheckpoints + useTenantStaff + useDashboardActions
}

/**
 * DashboardTabManager — Quản lý việc hiển thị các Tab trong Dashboard
 * Giúp giảm tải logic cho component cha (Orchestrator)
 */
export const DashboardTabManager: React.FC<DashboardTabManagerProps> = ({ 
  activeTab, 
  isPro,
  state,
  actions
}) => {
  return (
    <Suspense fallback={
      <div className="h-64 flex flex-col items-center justify-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-scmd-primary/20 animate-spin border-2 border-scmd-primary/30 border-t-scmd-primary" />
        <p className="text-[10px] font-black text-scmd-silver/30 uppercase tracking-[0.2em]">Đang tải dữ liệu mô-đun...</p>
      </div>
    }>
      {activeTab === 'overview' && (
        <OverviewTab 
          isPro={isPro}
          stats={state.stats}
          staff={state.staff}
          mapData={state.mapData}
          priorities={state.priorities}
          monthlyInsights={state.monthlyInsights}
          isLoadingMonthlyAI={state.isLoadingMonthlyAI}
          setActiveTab={actions.setActiveTab}
          setShowBugModal={actions.setShowBugModal}
          setShowUpgradeModal={actions.setShowUpgradeModal}
          setSelectedMapPoint={actions.setSelectedMapPoint}
          onExportPriorities={actions.onExportPriorities}
        />
      )}
      {activeTab === 'sites' && (
        <SitesTab
          checkpoints={state.checkpoints}
          checkpointsNextCursor={state.checkpointsNextCursor}
          hasMoreCheckpoints={state.hasMoreCheckpoints}
          loadMoreCheckpoints={actions.loadMoreCheckpoints}
          loadingMoreCheckpoints={state.loadingMoreCheckpoints}
          routes={state.routes}
          editingCheckpoint={state.editingCheckpoint}
          newCheckpoint={state.newCheckpoint}
          isSubmitting={state.isSubmittingCheckpoint}
          siteSubTab={state.siteSubTab}
          setSiteSubTab={actions.setSiteSubTab}
          setCheckpoints={actions.setCheckpoints}
          setNewCheckpoint={actions.setNewCheckpoint}
          setShowConfirmModal={actions.setShowConfirmModal}
          setShowQRModal={actions.setShowQRModal}
          setMessage={actions.setMessage}
          setActiveTab={actions.setActiveTab}
          startEditingCheckpoint={actions.startEditingCheckpoint}
          cancelEditing={actions.cancelEditingCheckpoint}
          handleAddCheckpoint={actions.handleAddCheckpoint}
          addCheckItem={actions.addCheckItem}
          removeCheckItem={actions.removeCheckItem}
          updateCheckItem={actions.updateCheckItem}
        />
      )}
      {activeTab === 'staff' && (
        <StaffTab
          staff={state.staff}
          editingStaff={state.editingStaff}
          selectedStaffDetail={state.selectedStaffDetail}
          staffModalTab={state.staffModalTab}
          newStaff={state.newStaff}
          isSubmitting={state.isSubmittingStaff}
          isLoading={state.loading}
          showPrintModal={state.showPrintModal}
          printFields={state.printFields}
          filters={state.staffFilters}
          onFilterChange={actions.setStaffFilters}
          setNewStaff={actions.setNewStaff}
          setStaffModalTab={actions.setStaffModalTab}
          setSelectedStaffDetail={actions.setSelectedStaffDetail}
          setShowConfirmModal={actions.setShowConfirmModal}
          setShowPrintModal={actions.setShowPrintModal}
          setPrintFields={actions.setPrintFields}
          startEditingStaff={actions.startEditingStaff}
          cancelEditingStaff={actions.cancelEditingStaff}
          handleAddStaff={actions.handleAddStaff}
          handlePrintStaffProfile={actions.handlePrintStaffProfile}
          tenantInfo={state.tenantInfo}
        />
      )}
      {activeTab === 'incidents' && <IncidentsTab />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'tasks' && <TasksTab />}
      {activeTab === 'reports' && (
        <ReportsTab
          isPro={isPro}
          patrolLogs={state.patrolLogs}
          setShowUpgradeModal={actions.setShowUpgradeModal}
          onViewLog={actions.onViewLog}
        />
      )}
      {activeTab === 'market-growth' && <MarketGrowthTab />}
      {activeTab === 'usage-analytics' && <UsageAnalyticsTab />}
      {activeTab === 'attendance' && <AttendanceTab />}
      {activeTab === 'attachments' && <FileManager />}
      {activeTab === 'vendors' && <VendorTab />}
      {activeTab === 'subscription' && <BillingTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'violations' && (
        <ViolationsTab
          isPro={isPro}
          setShowUpgradeModal={actions.setShowUpgradeModal}
          handleExportWatcherReport={actions.handleExportWatcherReport}
          handleAnomalyFeedback={actions.handleAnomalyFeedback}
        />
      )}
      {activeTab === 'help' && (
        <HelpTab
          showBugModal={state.showBugModal}
          bugReport={state.bugReport}
          isReportingBug={state.isReportingBug}
          setShowBugModal={actions.setShowBugModal}
          setBugReport={actions.setBugReport}
          handleSubmitBug={actions.handleSubmitBug}
        />
      )}
    </Suspense>
  );
};
