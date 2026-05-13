import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import type { Staff } from '../types';

export function useStaffData() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [staffFilters, setStaffFilters] = useState({ search: '', role: 'all', status: 'all' });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchStaff = useCallback(async (overrides?: Partial<{ search: string; role: string; status: string }>, cursor?: string) => {
    setIsStaffLoading(true);
    try {
      const filters = overrides ? { ...staffFilters, ...overrides } : staffFilters;
      const query = new URLSearchParams();
      if (filters.search) query.append('search', filters.search);
      if (filters.role && filters.role !== 'all') query.append('role', filters.role);
      if (filters.status && filters.status !== 'all') query.append('status', filters.status);
      if (cursor) query.append('cursor', cursor);
      query.append('limit', '50');

      const staffData = await apiFetch<{ data: Staff[]; nextCursor: string | null; hasMore: boolean }>(`/api/tenant/staff?${query.toString()}`);
      const newData = Array.isArray(staffData) ? staffData : (staffData?.data || []);
      
      if (cursor) {
        setStaff(prev => [...prev, ...newData]);
      } else {
        setStaff(newData);
      }
      
      setNextCursor(staffData?.nextCursor || null);
      setHasMore(!!staffData?.nextCursor);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setIsStaffLoading(false);
    }
  }, [staffFilters]);

  const loadMoreStaff = useCallback(() => {
    if (nextCursor && !isStaffLoading) {
      fetchStaff(undefined, nextCursor);
    }
  }, [nextCursor, isStaffLoading, fetchStaff]);

  // Reactive fetch when filters change (resets list)
  useEffect(() => {
    fetchStaff();
  }, [staffFilters.search, staffFilters.role, staffFilters.status]);

  return { 
    staff, 
    setStaff, 
    isStaffLoading, 
    setIsStaffLoading, 
    fetchStaff, 
    loadMoreStaff, 
    staffFilters, 
    setStaffFilters,
    nextCursor,
    hasMore
  };
}
