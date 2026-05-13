import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../../../../lib/api';
import { useDashboardStore } from '../../store/useDashboardStore';

export function useNocData() {
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
    try {
      const [feed, map, prio, trust, anom] = await Promise.all([
        apiFetch<any[]>('/api/tenant/command-center/feed').catch(() => []),
        apiFetch<any[]>('/api/tenant/command-center/map-data').catch(() => []),
        apiFetch<any[]>('/api/tenant/command-center/priorities').catch(() => []),
        apiFetch<any>('/api/tenant/monitor/trust-score').catch(() => ({
          averageScore: 100,
          status: 'EXCELLENT',
        })),
        apiFetch<any>('/api/tenant/monitor/anomalies').catch(() => ({
          anomalies: [],
          stats: null,
        })),
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
  }, [setNocFeed, setAnomalies, setAnomalyStats, setTrustScore]);

  return {
    mapData, setMapData,
    priorities, setPriorities,
    fetchNocData
  };
}
