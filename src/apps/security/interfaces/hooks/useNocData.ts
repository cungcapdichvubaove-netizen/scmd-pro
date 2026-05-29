import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../../../../lib/api';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAuthStore } from '../../../common/store/useAuthStore';

export function useNocData() {
  const tenantId = useAuthStore((state) => state.tenantId);
  const tenantInfo = useDashboardStore((state) => state.tenantInfo);
  const [mapData, setMapData] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);

  const {
    setNocFeed,
    setAnomalies,
    setAnomalyStats,
    setTrustScore,
  } = useDashboardStore(useShallow(state => ({
    setNocFeed: state.setNocFeed,
    setAnomalies: state.setAnomalies,
    setAnomalyStats: state.setAnomalyStats,
    setTrustScore: state.setTrustScore
  })));

  const fetchNocData = useCallback(async () => {
    if (!tenantId) {
      setNocFeed([]);
      setMapData([]);
      setPriorities([]);
      setTrustScore({ averageScore: 0, status: 'NO_DATA', trend: [] });
      setAnomalies([]);
      setAnomalyStats(null);
      return;
    }

    const resolvedFeatures = tenantInfo?.resolvedFeatures ?? {};
    const canReadPatrol = resolvedFeatures.patrol_route !== false;
    const canReadPredictive = resolvedFeatures.predictive_guard !== false;

    try {
      const [feed, map, prio, trust, anom] = await Promise.all([
        apiFetch<any[]>('/api/tenant/command-center/feed', { suppressErrorToast: true }).catch(() => []),
        apiFetch<any[]>('/api/tenant/command-center/map-data', { suppressErrorToast: true }).catch(() => []),
        apiFetch<any[]>('/api/tenant/command-center/priorities', { suppressErrorToast: true }).catch(() => []),
        apiFetch<any>('/api/tenant/monitor/trust-score', { suppressErrorToast: true }).catch(() => ({
          averageScore: 0,
          status: 'NO_DATA',
          trend: [],
        })),
        canReadPatrol && canReadPredictive
          ? apiFetch<any>('/api/tenant/monitor/anomalies', { suppressErrorToast: true }).catch(() => ({
              anomalies: [],
              stats: null,
            }))
          : Promise.resolve({ anomalies: [], stats: null }),
      ]);
      setNocFeed(feed);
      setMapData(map);
      setPriorities(prio);
      setTrustScore(trust);
      setAnomalies(anom.anomalies || []);
      setAnomalyStats(anom.stats || null);
    } catch (err) {
      console.error('Error fetching NOC data:', err);
    }
  }, [setNocFeed, setAnomalies, setAnomalyStats, setTrustScore, tenantId, tenantInfo?.resolvedFeatures]);

  return {
    mapData, setMapData,
    priorities, setPriorities,
    fetchNocData
  };
}
