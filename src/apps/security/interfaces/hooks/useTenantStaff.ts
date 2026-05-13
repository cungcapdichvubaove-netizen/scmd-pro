import { useState, useCallback } from 'react';
import { apiFetch } from '../../../../lib/api';
import type { Staff } from '../types';

export const useTenantStaff = (
  fetchData: () => Promise<void>, 
  setMessage: (msg: any) => void,
  staffFilters: { search: string; role: string; status: string },
  setStaffFilters: (v: any) => void
) => {
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<Staff | null>(null);
  const [staffModalTab, setStaffModalTab] = useState<'info' | 'performance' | 'history'>('info');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<Staff | null>(null);
  const [printFields, setPrintFields] = useState<string[]>([
    'name',
    'staffId',
    'role',
    'qualifications',
    'certificates',
    'rewards',
    'disciplines',
    'workHistory',
  ]);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  const [newStaff, setNewStaff] = useState({
    fullName: '',
    staffId: '',
    role: 'guard',
    username: '',
    password: '',
    qualifications: '',
    certificates: '',
    rewards: '',
    disciplines: '',
    workHistory: [] as any[],
    email: '',
    credentials: { idNumber: '', licenseNumber: '', expiryDate: '' },
  });

  const startEditingStaff = useCallback((s: Staff) => {
    setEditingStaff(s);
    const displayName = s.fullName ?? '';
    setNewStaff({
      fullName: displayName,
      staffId: s.staffId,
      role: s.role.toLowerCase() === 'admin' ? 'admin' : s.role.toLowerCase() === 'supervisor' ? 'supervisor' : 'guard',
      username: s.username || '',
      password: '',
      qualifications: Array.isArray(s.qualifications) ? s.qualifications.join(', ') : '',
      certificates: Array.isArray(s.certificates) ? s.certificates.join(', ') : '',
      rewards: s.rewards || '',
      disciplines: s.disciplines || '',
      workHistory: s.workHistory || [],
      email: s.email || '',
      credentials: s.credentials || { idNumber: '', licenseNumber: '', expiryDate: '' },
    });
    setTimeout(() => {
      document.getElementById('staff-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const cancelEditingStaff = useCallback(() => {
    setEditingStaff(null);
    setNewStaff({
      fullName: '', staffId: '', role: 'guard', username: '', password: '', 
      qualifications: '', certificates: '', rewards: '', disciplines: '', 
      workHistory: [], email: '', 
      credentials: { idNumber: '', licenseNumber: '', expiryDate: '' },
    });
  }, []);

  const handleAddStaff = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStaff(true);
    try {
      const payload = {
        ...newStaff,
        email: newStaff.email,
        qualifications: typeof newStaff.qualifications === 'string'
            ? newStaff.qualifications.split(',').map((s) => s.trim()).filter(Boolean)
            : newStaff.qualifications,
        certificates: typeof newStaff.certificates === 'string'
            ? newStaff.certificates.split(',').map((s) => s.trim()).filter(Boolean)
            : newStaff.certificates,
      };
      const url = editingStaff ? `/api/tenant/staff/${editingStaff.id}` : '/api/tenant/staff';
      await apiFetch(url, {
        method: editingStaff ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      await fetchData();
      cancelEditingStaff();
      setMessage({
        text: editingStaff ? 'Đã cập nhật hồ sơ nhân sự thành công!' : 'Đã kích hoạt hồ sơ nhân sự v2.0 thành công!',
        type: 'success',
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Mã nhân viên hoặc tên đăng nhập đã tồn tại!';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsSubmittingStaff(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [editingStaff, newStaff, fetchData, cancelEditingStaff, setMessage]);

  const handleDeleteStaff = useCallback(async (id: string, setShowConfirmModal: Function) => {
    try {
      await apiFetch(`/api/tenant/staff/${id}`, { method: 'DELETE' });
      setMessage({ text: 'Đã xóa nhân viên khỏi hệ thống!', type: 'success' });
      await fetchData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi xóa nhân viên!', type: 'error' });
    } finally {
      setShowConfirmModal(null);
      setTimeout(() => setMessage(null), 3000);
    }
  }, [fetchData, setMessage]);

  const handlePrintStaffProfile = useCallback(async (s: Staff) => {
    try {
      const fieldsQuery = printFields.join(',');
      const blob = await apiFetch(`/api/tenant/staff/${s.id}/cv-pdf?fields=${fieldsQuery}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `HoSo_${s.staffId || 'TEMP'}_${s.fullName.replace(/\s+/g, '_')}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowPrintModal(null);
      setMessage({ text: 'Hồ sơ PDF đã được tải xuống bộ nhớ!', type: 'success' });
    } catch (err: any) {
      console.error('PDF Download error:', err);
      setMessage({ text: `Lỗi khi xuất PDF: ${err.message}`, type: 'error' });
    }
  }, [printFields, setMessage]);

  return {
    selectedStaffDetail, setSelectedStaffDetail,
    staffModalTab, setStaffModalTab,
    editingStaff, setEditingStaff,
    showPrintModal, setShowPrintModal,
    printFields, setPrintFields,
    staffFilters, setStaffFilters,
    newStaff, setNewStaff,
    isSubmittingStaff,
    startEditingStaff,
    cancelEditingStaff,
    handleAddStaff,
    handleDeleteStaff,
    handlePrintStaffProfile
  };
};
