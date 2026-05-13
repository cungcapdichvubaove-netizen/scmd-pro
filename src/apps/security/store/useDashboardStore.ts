import { create } from 'zustand';

// Định nghĩa các loại Modal trong Dashboard
export type DashboardModalType = 'NONE' | 'INCIDENT_DETAIL' | 'STAFF_PROFILE' | 'CHECKPOINT_QR' | 'ADD_TASK';

export interface DashboardTenantInfo {
  id?: string;
  name?: string;
  subscriptionPlan?: string;
  maxGuards?: number;
  hasPendingUpgrade?: boolean;
}

export interface ActiveSOS {
  staffId: string;
  location: {
    lat: number;
    lon: number;
  };
  message?: string;
}

interface DashboardState {
  // Modal State
  activeModal: DashboardModalType;
  modalPayload: any | null; // Có thể chứa ID hoặc data của item cần parse
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;

  // Actions
  openModal: (type: DashboardModalType, payload?: any) => void;
  closeModal: () => void;
  
  // Tenant & Plan Info
  isPro: boolean;
  setIsPro: (isPro: boolean) => void;
  tenantInfo: DashboardTenantInfo | null;
  setTenantInfo: (info: DashboardTenantInfo) => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  handleUpgrade: (plan: string) => void;
  setHandleUpgrade: (fn: (plan: string) => void) => void;

  // Real-time Global Event Notifications
  hasNewAlert: boolean;
  setHasNewAlert: (status: boolean) => void;

  // Real-time Data (NOC & Anomalies) to optimize re-renders
  nocFeed: any[];
  setNocFeed: (feed: any[] | ((prev: any[]) => any[])) => void;
  anomalies: any[];
  setAnomalies: (anomalies: any[] | ((prev: any[]) => any[])) => void;
  anomalyStats: any | null;
  setAnomalyStats: (stats: any | null) => void;
  activeSOS: ActiveSOS | null;
  setActiveSOS: (sos: ActiveSOS | null) => void;

  // Patrol Real-time State
  patrolState: {
    currentLocation: { lat: number; lon: number } | null;
    activeCheckpoint: any | null;
    isOffline: boolean;
    pendingCount: number;
    lastCheckpointTime: number;
  };
  setPatrolLocation: (loc: { lat: number; lon: number } | null) => void;
  setActiveCheckpoint: (cp: any | null) => void;
  setPatrolOfflineStatus: (v: boolean) => void;
  setPatrolPendingCount: (n: number) => void;
  setPatrolTimes: (times: Partial<{ lastCheckpointTime: number }>) => void;

  trustScore: {
    averageScore: number;
    status: string;
    trend?: { date: string; score: number }[];
  };
  setTrustScore: (score: {
    averageScore: number;
    status: string;
    trend?: { date: string; score: number }[];
  }) => void;

  // Real-time Online Status
  onlineUserIds: string[];
  setOnlineUserIds: (ids: string[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeModal: 'NONE',
  modalPayload: null,
  showUpgradeModal: false,
  setShowUpgradeModal: (show) => set({ showUpgradeModal: show }),
  
  openModal: (type, payload = null) => set({ activeModal: type, modalPayload: payload }),
  closeModal: () => set({ activeModal: 'NONE', modalPayload: null }),

  isPro: false,
  setIsPro: (isPro) => set({ isPro }),
  tenantInfo: null,
  setTenantInfo: (info) => set({ tenantInfo: info }),
  isSubmitting: false,
  setIsSubmitting: (v) => set({ isSubmitting: v }),
  handleUpgrade: () => {},
  setHandleUpgrade: (fn) => set({ handleUpgrade: fn }),

  hasNewAlert: false,
  setHasNewAlert: (status) => set({ hasNewAlert: status }),

  nocFeed: [],
  setNocFeed: (feed) => set((state) => ({ nocFeed: typeof feed === 'function' ? feed(state.nocFeed) : feed })),
  
  anomalies: [],
  setAnomalies: (anomalies) => set((state) => ({ anomalies: typeof anomalies === 'function' ? anomalies(state.anomalies) : anomalies })),

  anomalyStats: null,
  setAnomalyStats: (stats) => set({ anomalyStats: stats }),

  activeSOS: null,
  setActiveSOS: (sos) => set({ activeSOS: sos }),

  patrolState: {
    currentLocation: null,
    activeCheckpoint: null,
    isOffline: !navigator.onLine,
    pendingCount: 0,
    lastCheckpointTime: Date.now(),
  },
  setPatrolLocation: (loc) => set((s) => ({ patrolState: { ...s.patrolState, currentLocation: loc } })),
  setActiveCheckpoint: (cp) => set((s) => ({ patrolState: { ...s.patrolState, activeCheckpoint: cp } })),
  setPatrolOfflineStatus: (v) => set((s) => ({ patrolState: { ...s.patrolState, isOffline: v } })),
  setPatrolPendingCount: (n) => set((s) => ({ patrolState: { ...s.patrolState, pendingCount: n } })),
  setPatrolTimes: (times) => set((s) => ({ patrolState: { ...s.patrolState, ...times } })),

  trustScore: { averageScore: 100, status: 'EXCELLENT' },
  setTrustScore: (score) => set({ trustScore: score }),

  onlineUserIds: [],
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
}));
