import { useState, useCallback, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';
import type { Checkpoint, PatrolRoute, PatrolLog, Stats, Notification } from '../types';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAuthStore } from '../../../common/store/useAuthStore';

export function usePatrolData(setMessage: (msg: any) => void) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const setDashboardTenantInfo = useDashboardStore((state) => state.setTenantInfo);
  const setDashboardIsPro = useDashboardStore((state) => state.setIsPro);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [checkpointsNextCursor, setCheckpointsNextCursor] = useState<string | null>(null);
  const [hasMoreCheckpoints, setHasMoreCheckpoints] = useState<boolean>(false);
  const [loadingMoreCheckpoints, setLoadingMoreCheckpoints] = useState(false);
  const [routes, setRoutes] = useState<PatrolRoute[]>([]);
  const [patrolLogs, setPatrolLogs] = useState<PatrolLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    completionRate: 0,
    totalCheckpoints: 0,
    completedCheckpoints: 0,
    dailyStats: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [monthlyInsights, setMonthlyInsights] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [isLoadingMonthlyAI, setIsLoadingMonthlyAI] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const fetchPatrolData = useCallback(async () => {
    if (!tenantId) {
      setCheckpoints([]);
      setCheckpointsNextCursor(null);
      setHasMoreCheckpoints(false);
      setRoutes([]);
      setPatrolLogs([]);
      setNotifications([]);
      setTenantInfo(null);
      setMonthlyInsights(null);
      setDashboardTenantInfo(null as any);
      setDashboardIsPro(false);
      setLoading(false);
      setIsLoadingMonthlyAI(false);
      return;
    }

    setLoading(true);
    setIsLoadingMonthlyAI(true);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    try {
      const fetchInitialCheckpoints = async (): Promise<{ data: Checkpoint[], nextCursor: string | null, hasMore: boolean }> => {
        const url = `/api/tenant/checkpoints?limit=50`;
        const result = await apiFetch<any>(url, { suppressErrorToast: true });
        return {
          data: Array.isArray(result) ? result : (result?.data || []),
          nextCursor: result?.nextCursor || null,
          hasMore: result?.hasMore || false,
        };
      };

      await Promise.race([
        (async () => {
          const meData = await apiFetch<any>('/api/v1/me', { suppressErrorToast: true });
          const resolvedTenantInfo = meData?.tenant ?? null;
          const resolvedFeatures = resolvedTenantInfo?.resolvedFeatures ?? {};
          const subscriptionPlan = String(
            resolvedTenantInfo?.subscriptionPlan || resolvedTenantInfo?.plan || ''
          ).toUpperCase();
          const resolvedIsPro = subscriptionPlan === 'PRO' || subscriptionPlan === 'ENTERPRISE';
          const canReadPatrol = resolvedFeatures.patrol_route !== false;
          const canReadMonthlyInsights = resolvedFeatures.usage_analytics === true;

          const [cpData, statsData, notifData, logsData, routesData] = await Promise.all([
            fetchInitialCheckpoints().catch(() => ({ data: [], nextCursor: null, hasMore: false })),
            apiFetch<Stats>('/api/tenant/stats', { suppressErrorToast: true }).catch(() => ({
              completionRate: 0,
              totalCheckpoints: 0,
              completedCheckpoints: 0,
              dailyStats: [],
            })),
            apiFetch<Notification[]>('/api/tenant/notifications', { suppressErrorToast: true }).catch(() => []),
            apiFetch<any>('/api/tenant/patrol-logs?limit=50', { suppressErrorToast: true }).catch(() => ({ data: [] })),
            canReadPatrol
              ? apiFetch<PatrolRoute[]>('/api/tenant/routes', { suppressErrorToast: true }).catch(() => [])
              : Promise.resolve([]),
          ]);

          const monthlyAiData = canReadMonthlyInsights
            ? await apiFetch<any>(
                `/api/reports/smart-monthly?month=${new Date().toISOString().substring(0, 7)}`,
                { suppressErrorToast: true },
              ).catch(() => null)
            : null;

          const cpState = cpData as { data: Checkpoint[], nextCursor: string | null, hasMore: boolean };
          setCheckpoints(cpState.data);
          setCheckpointsNextCursor(cpState.nextCursor);
          setHasMoreCheckpoints(cpState.hasMore);
          setStats(statsData);
          setNotifications(notifData);
          setTenantInfo(resolvedTenantInfo);
          setDashboardTenantInfo(resolvedTenantInfo);
          setDashboardIsPro(resolvedIsPro);
          setPatrolLogs(Array.isArray(logsData) ? logsData : (logsData as any)?.data || []);
          setRoutes(Array.isArray(routesData) ? routesData : []);
          setMonthlyInsights(monthlyAiData);

          if (resolvedTenantInfo?.is_new) setShowWelcomeModal(true);
        })(),
        timeoutPromise
      ]);
    } catch (err: any) {
      console.error('Error fetching patrol data:', err);
      if (err.message === 'TIMEOUT') {
        setMessage({ text: 'Kết nối mạng yếu, hệ thống đang hiển thị dữ liệu đệm (Offline Mode)', type: 'error' });
      }
      if (err.message?.includes('401')) {
        setDashboardTenantInfo(null as any);
        setDashboardIsPro(false);
        localStorage.removeItem('scmd_user_role');
        localStorage.removeItem('scmd_jwt');
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
      setIsLoadingMonthlyAI(false);
    }
  }, [setDashboardIsPro, setDashboardTenantInfo, setMessage, tenantId]);

  const loadMoreCheckpoints = useCallback(async () => {
    if (!hasMoreCheckpoints || !checkpointsNextCursor || loadingMoreCheckpoints) return;
    
    setLoadingMoreCheckpoints(true);
    try {
      const url = `/api/tenant/checkpoints?limit=50&cursor=${checkpointsNextCursor}`;
      const result = await apiFetch<any>(url);
      const newData = Array.isArray(result) ? result : (result?.data || []);
      
      setCheckpoints(prev => {
        // filter out potential duplicates
        const existingIds = new Set(prev.map(c => c.id));
        const filteredNewData = newData.filter((c: any) => !existingIds.has(c.id));
        return [...prev, ...filteredNewData];
      });
      setCheckpointsNextCursor(result?.nextCursor || null);
      setHasMoreCheckpoints(result?.hasMore || false);
    } catch (err) {
      console.error('Failed to load more checkpoints:', err);
      setMessage({ text: 'Lỗi tải thêm điểm tuần tra', type: 'error' });
    } finally {
      setLoadingMoreCheckpoints(false);
    }
  }, [hasMoreCheckpoints, checkpointsNextCursor, loadingMoreCheckpoints, setMessage]);

  return useMemo(() => ({
    checkpoints, setCheckpoints,
    checkpointsNextCursor, hasMoreCheckpoints,
    loadMoreCheckpoints, loadingMoreCheckpoints,
    routes, setRoutes,
    patrolLogs, setPatrolLogs,
    stats, setStats,
    notifications, setNotifications,
    tenantInfo, setTenantInfo,
    monthlyInsights, setMonthlyInsights,
    loading, setLoading,
    isLoadingMonthlyAI, setIsLoadingMonthlyAI,
    showWelcomeModal, setShowWelcomeModal,
    fetchPatrolData
  }), [
    checkpoints, checkpointsNextCursor, hasMoreCheckpoints, loadMoreCheckpoints, loadingMoreCheckpoints, routes, patrolLogs, stats, notifications, tenantInfo,
    monthlyInsights, loading, isLoadingMonthlyAI, showWelcomeModal, fetchPatrolData
  ]);
}
