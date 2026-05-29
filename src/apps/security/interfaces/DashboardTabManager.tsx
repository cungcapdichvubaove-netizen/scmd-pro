﻿import React, { lazy, Suspense } from 'react';
import { ActiveTab, Checkpoint, CheckItem, Staff, PatrolLog, PatrolRoute, Stats } from './types';
import { DashboardSpinner } from '../../common/interfaces/components/DashboardUI';

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

const OverviewTabView = OverviewTab as React.ComponentType<any>;
const SitesTabView = SitesTab as React.ComponentType<any>;
const StaffTabView = StaffTab as React.ComponentType<any>;
const ReportsTabView = ReportsTab as React.ComponentType<any>;
const ViolationsTabView = ViolationsTab as React.ComponentType<any>;
const HelpTabView = HelpTab as React.ComponentType<any>;

// ─── State & Actions contracts ─── //
export interface DashboardState {
  // Core data
  stats: Stats | null;
  staff: Staff[];
  patrolLogs: PatrolLog[];
  checkpoints: Checkpoint[];
  routes: PatrolRoute[];
  loading: boolean;
  // Checkpoint editing
  editingCheckpoint: Checkpoint | null;
  newCheckpoint: Partial<Checkpoint>;
  isSubmittingCheckpoint: boolean;
  checkpointsNextCursor: string | null;
  hasMoreCheckpoints: boolean;
  loadingMoreCheckpoints: boolean;
  siteSubTab: string;
  // Staff editing
  editingStaff: Staff | null;
  selectedStaffDetail: Staff | null;
  newStaff: Partial<Staff>;
  isSubmittingStaff: boolean;
  staffModalTab: string;
  staffFilters: Record<string, string>;
  staffError?: string | null;
  showPrintModal: boolean;
  printFields: Record<string, boolean>;
  // Map / AI
  mapData: unknown;
  priorities: unknown[];
  monthlyInsights: unknown;
  isLoadingMonthlyAI: boolean;
  // Modal state
  showBugModal: boolean;
  bugReport: string;
  isReportingBug: boolean;
  // Tenant
  tenantInfo: { name?: string; plan?: string; subscriptionPlan?: string; resolvedFeatures?: Record<string, boolean> } | null;
  isPro?: boolean;
}

export interface DashboardActions {
  // Navigation
  setActiveTab: (tab: ActiveTab, options?: { priorityOnly?: boolean; focusId?: string; focusType?: string }) => void;
  // Modal toggles
  setShowBugModal: (v: boolean) => void;
  setShowUpgradeModal: (v: boolean) => void;
  setShowConfirmModal: (v: boolean) => void;
  setShowQRModal: (v: boolean) => void;
  setShowPrintModal: (v: boolean) => void;
  // Checkpoint actions
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  setNewCheckpoint: (cp: Partial<Checkpoint>) => void;
  setSiteSubTab: (tab: string) => void;
  setSelectedMapPoint: (point: unknown) => void;
  startEditingCheckpoint: (cp: Checkpoint) => void;
  cancelEditingCheckpoint: () => void;
  handleAddCheckpoint: (event?: React.FormEvent) => Promise<void>;
  addCheckItem: () => void;
  removeCheckItem: (id: string) => void;
  updateCheckItem: (id: string, fieldOrUpdates: string | Partial<CheckItem>, value?: unknown) => void;
  loadMoreCheckpoints: () => Promise<void>;
  // Staff actions
  setNewStaff: (staff: Partial<Staff>) => void;
  setStaffModalTab: (tab: string) => void;
  setSelectedStaffDetail: (staff: Staff | null) => void;
  setPrintFields: (fields: Record<string, boolean> | string[]) => void;
  setStaffFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  startEditingStaff: (staff: Staff) => void;
  cancelEditingStaff: () => void;
  handleAddStaff: (event?: React.FormEvent) => Promise<void>;
  handlePrintStaffProfile: (staff: Staff) => Promise<void>;
  fetchStaff?: () => Promise<void>;
  // Reports & AI
  onExportPriorities: (format: 'print' | 'excel', tasks: any[]) => void;
  onViewLog: (log: PatrolLog) => void;
  handleExportWatcherReport: () => void;
  handleAnomalyFeedback: (logId: string, feedback: string) => void;
  // Bug report
  setBugReport: (text: string) => void;
  handleSubmitBug: (event?: React.FormEvent) => Promise<void>;
  // Misc
  refreshData?: () => Promise<void>;
  setMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void;
}

interface DashboardTabManagerProps {
  activeTab: ActiveTab;
  isPro: boolean;
  state: DashboardState;
  actions: DashboardActions;
  contextualFilters?: Record<string, string>;
}

/**
 * DashboardTabManager — Quản lý việc hiển thị các Tab trong Dashboard
 * Giúp giảm tải logic cho component cha (Orchestrator)
 */
export const DashboardTabManager: React.FC<DashboardTabManagerProps> = ({ 
  activeTab, 
  isPro,
  state,
  actions,
  contextualFilters = {},
}) => {
  return (
    <div className="ops-main-content">
      <Suspense key={activeTab} fallback={<DashboardSpinner message="Đang tải dữ liệu module..." className="h-64 py-0" />}> 
      {activeTab === 'overview' && (
        <OverviewTabView 
          isPro={isPro}
          stats={state.stats}
          staff={state.staff}
          mapData={state.mapData}
          priorities={state.priorities}
          filters={contextualFilters}
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
        <SitesTabView
          contextualFilters={contextualFilters}
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
        <StaffTabView
          staff={state.staff}
          editingStaff={state.editingStaff}
          selectedStaffDetail={state.selectedStaffDetail}
          staffModalTab={state.staffModalTab}
          newStaff={state.newStaff}
          isSubmitting={state.isSubmittingStaff}
          isLoading={state.loading}
          error={state.staffError}
          onRetry={actions.fetchStaff}
          showPrintModal={state.showPrintModal}
          printFields={state.printFields}
          filters={{
            search: contextualFilters.search ?? '',
            role: contextualFilters.role ?? 'all',
            status: contextualFilters.status ?? 'active',
          }}
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
      {activeTab === 'tasks' && <TasksTab embedded />}
      {activeTab === 'reports' && (
        <ReportsTabView
          isPro={isPro}
          setShowUpgradeModal={actions.setShowUpgradeModal}
        />
      )}
      {activeTab === 'market-growth' && <MarketGrowthTab />}
      {activeTab === 'usage-analytics' && <UsageAnalyticsTab />}
      {activeTab === 'attendance' && <AttendanceTab contextualFilters={contextualFilters} />}
      {activeTab === 'attachments' && <FileManager />}
      {activeTab === 'vendors' && <VendorTab embedded />}
      {activeTab === 'subscription' && <BillingTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'violations' && (
        <ViolationsTabView
          embedded
          isPro={isPro}
          setShowUpgradeModal={actions.setShowUpgradeModal}
          handleExportWatcherReport={actions.handleExportWatcherReport}
          handleAnomalyFeedback={actions.handleAnomalyFeedback}
        />
      )}
      {activeTab === 'help' && (
        <HelpTabView
          embedded
          showBugModal={state.showBugModal}
          bugReport={state.bugReport}
          isReportingBug={state.isReportingBug}
          setShowBugModal={actions.setShowBugModal}
          setBugReport={actions.setBugReport}
          handleSubmitBug={actions.handleSubmitBug}
        />
      )}
      </Suspense>
    </div>
  );
};
