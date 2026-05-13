import { useCallback, useMemo } from 'react';
import { usePatrolData } from './usePatrolData';
import { useStaffData } from './useStaffData';
import { useNocData } from './useNocData';
import { useSocketEvents } from './useSocketEvents';

export function useTenantDashboard(setMessage: (msg: { text: string; type: 'success' | 'error' } | null) => void) {
  const patrolData = usePatrolData(setMessage);
  const staffData = useStaffData();
  const nocData = useNocData();

  const fetchData = useCallback(async () => {
    // We execute them in parallel just like before
    await Promise.all([
      nocData.fetchNocData(),
      patrolData.fetchPatrolData(),
      staffData.fetchStaff()
    ]);
  }, [nocData.fetchNocData, patrolData.fetchPatrolData, staffData.fetchStaff]);

  useSocketEvents(fetchData, []);

  return useMemo(() => ({
    ...patrolData,
    ...staffData,
    ...nocData,
    fetchData
  }), [patrolData, staffData, nocData, fetchData]);
}
