import { useState, useCallback } from 'react';
import { apiFetch } from '../../../../lib/api';
import type { Checkpoint, CheckItem } from '../types';

export const useTenantCheckpoints = (fetchData: () => Promise<void>, setMessage: (msg: any) => void) => {
  const [siteSubTab, setSiteSubTab] = useState<'manage' | 'benchmark' | 'field'>('manage');
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [newCheckpoint, setNewCheckpoint] = useState({
    name: '',
    qr_hash: '',
    latitude: 10.762622,
    longitude: 106.660172,
    check_items: [] as CheckItem[],
  });
  const [isSubmittingCheckpoint, setIsSubmittingCheckpoint] = useState(false);

  const startEditingCheckpoint = useCallback((cp: Checkpoint) => {
    setEditingCheckpoint(cp);
    setNewCheckpoint({ 
      name: cp.name, 
      qr_hash: cp.qr_hash || '', 
      latitude: cp.latitude, 
      longitude: cp.longitude, 
      check_items: cp.check_items || [] 
    });
    setTimeout(() => {
      document.getElementById('checkpoint-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const cancelEditingCheckpoint = useCallback(() => {
    setEditingCheckpoint(null);
    setNewCheckpoint({ name: '', qr_hash: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
  }, []);

  const addCheckItem = useCallback(() => {
    setNewCheckpoint((prev) => ({
      ...prev,
      check_items: [
        ...prev.check_items,
        { id: Math.random().toString(36).substring(2, 9), task: '', required: true, type: 'toggle' as const },
      ],
    }));
  }, []);

  const removeCheckItem = useCallback((id: string) => {
    setNewCheckpoint((prev) => ({
      ...prev,
      check_items: prev.check_items.filter((i) => i.id !== id),
    }));
  }, []);

  const updateCheckItem = useCallback((id: string, updates: Partial<CheckItem>) => {
    setNewCheckpoint((prev) => ({
      ...prev,
      check_items: prev.check_items.map((i) => (i.id === id ? { ...i, ...updates as CheckItem } : i)),
    }));
  }, []);

  const handleAddCheckpoint = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCheckpoint(true);
    try {
      const url = editingCheckpoint
        ? `/api/tenant/checkpoints/${editingCheckpoint.id}`
        : '/api/tenant/checkpoints';
      await apiFetch(url, {
        method: editingCheckpoint ? 'PUT' : 'POST',
        body: JSON.stringify({
          name: newCheckpoint.name,
          qr_hash: newCheckpoint.qr_hash,
          latitude: newCheckpoint.latitude,
          longitude: newCheckpoint.longitude,
          check_items: newCheckpoint.check_items,
        }),
      });
      await fetchData();
      setNewCheckpoint({ name: '', qr_hash: '', latitude: 10.762622, longitude: 106.660172, check_items: [] });
      setEditingCheckpoint(null);
      setMessage({
        text: editingCheckpoint ? 'Đã cập nhật điểm tuần tra!' : 'Đã lưu điểm tuần tra. Hãy in mã QR!',
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi lưu dữ liệu. Hãy kiểm tra lại!', type: 'error' });
    } finally {
      setIsSubmittingCheckpoint(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [editingCheckpoint, newCheckpoint, fetchData, setMessage]);

  const handleDeleteCheckpoint = useCallback(async (id: string, setShowConfirmModal: Function) => {
    try {
      await apiFetch(`/api/tenant/checkpoints/${id}`, { method: 'DELETE' });
      setMessage({ text: 'Đã xóa điểm tuần tra!', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi xóa điểm!', type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetchData, setMessage]);

  const handleDeleteRoute = useCallback(async (id: string, setShowConfirmModal: Function) => {
    try {
      await apiFetch(`/api/tenant/routes/${id}`, { method: 'DELETE' });
      setMessage({ text: 'Đã xóa lộ trình!', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi xóa lộ trình!', type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetchData, setMessage]);

  return {
    siteSubTab, setSiteSubTab,
    editingCheckpoint, setEditingCheckpoint,
    newCheckpoint, setNewCheckpoint,
    isSubmittingCheckpoint,
    startEditingCheckpoint,
    cancelEditingCheckpoint,
    addCheckItem,
    removeCheckItem,
    updateCheckItem,
    handleAddCheckpoint,
    handleDeleteCheckpoint,
    handleDeleteRoute
  };
};
