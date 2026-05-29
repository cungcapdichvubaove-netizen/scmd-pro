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
    assignedVendorId: '',
    assignedSiteId: '',
    assignedContractId: '',
    credentials: { idNumber: '', licenseNumber: '', expiryDate: '' },
  });

  const startEditingStaff = useCallback((s: Staff) => {
    setEditingStaff(s);
    const displayName = s.fullName ?? '';
    setNewStaff({
      fullName: displayName,
      staffId: s.staffId || '',
      // FIX [BUG-ROLE]: Map đúng 1-1 tất cả role từ backend về form.
      // Code cũ dùng fallback 'guard' cho mọi role không phải 'admin'/'supervisor',
      // khiến 'tenant-admin', 'technician', 'super-admin' bị map sai thành 'guard'.
      // Ngoài ra 'admin' không tồn tại trong Zod enum của backend — chỉ có 'tenant-admin'.
      role: (['super-admin', 'tenant-admin', 'supervisor', 'guard', 'technician', 'vendor-commander', 'vendor-representative'] as const).includes(s.role as any)
        ? s.role as any
        : 'guard',
      username: s.username || '',
      password: '',
      qualifications: Array.isArray(s.qualifications) ? s.qualifications.join(', ') : '',
      certificates: Array.isArray(s.certificates) ? s.certificates.join(', ') : '',
      rewards: s.rewards || '',
      disciplines: s.disciplines || '',
      workHistory: s.workHistory || [],
      email: s.email || '',
      assignedVendorId: s.assignedVendorId || '',
      assignedSiteId: s.assignedSiteId || '',
      assignedContractId: s.assignedContractId || '',
      // FIX [BUG-1]: Populate credentials từ flat fields của Staff (idNumber, licenseNumber, idExpiry)
      // Staff type dùng nested credentials object ở frontend, nhưng DB trả về flat fields
      credentials: {
        idNumber: s.credentials?.idNumber ?? (s as any).idNumber ?? '',
        licenseNumber: s.credentials?.licenseNumber ?? (s as any).licenseNumber ?? '',
        expiryDate: s.credentials?.expiryDate ?? (s as any).idExpiry?.split('T')[0] ?? '',
      },
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
      workHistory: [], email: '', assignedVendorId: '', assignedSiteId: '', assignedContractId: '',
      credentials: { idNumber: '', licenseNumber: '', expiryDate: '' },
    });
  }, []);

  const handleAddStaff = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStaff(true);
    try {
      // FIX [BUG-1]: Flatten credentials object → top-level fields trước khi gửi lên server
      // Backend updateStaffSchema kỳ vọng idNumber/licenseNumber/idExpiry ở cấp cao nhất,
      // không phải lồng trong credentials: { idNumber, licenseNumber, expiryDate }
      const { credentials, ...rest } = newStaff;
      const payload = {
        ...rest,
        email: newStaff.email,
        qualifications: typeof newStaff.qualifications === 'string'
            ? newStaff.qualifications.split(',').map((s) => s.trim()).filter(Boolean)
            : newStaff.qualifications,
        certificates: typeof newStaff.certificates === 'string'
            ? newStaff.certificates.split(',').map((s) => s.trim()).filter(Boolean)
            : newStaff.certificates,
        // Flat fields theo đúng schema backend
        idNumber: credentials?.idNumber?.trim() || null,
        licenseNumber: credentials?.licenseNumber?.trim() || null,
        idExpiry: credentials?.expiryDate || null,
        assignedVendorId: rest.assignedVendorId || null,
        assignedSiteId: rest.assignedSiteId || null,
        assignedContractId: rest.assignedContractId || null,
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
