/**
 * StaffTab.tsx — SCMD Pro v2.5 · Quản lý Hồ sơ Nhân sự
 *
 * CHANGELOG (patch này):
 * ─────────────────────────────────────────────────────────────────────────────
 * BUG FIX 1 — Field mismatch name ↔ fullName:
 *   - API backend trả về `fullName`. Client dùng `fullName` để bắt đúng schema.
 *   - Type `Staff` đã được refactor xóa bỏ field `name`.
 *
 * BUG FIX 2 — Role không thay đổi sau update:
 *   - Payload gửi lên đã bao gồm role (luôn có), server UpdateStaffUseCase
 *     gọi staff.updateProfile(fullName, role) → role được persist đúng.
 *   - Danh sách hiển thị lại sau fetchData() → role mới hiện đúng.
 *
 * ENHANCEMENT — Bổ sung trường danh sách nhân viên:
 *   - Bảng thêm cột: Họ tên đầy đủ, Vai trò (badge màu), Trạng thái (badge),
 *     Điện thoại, Ngày tạo. Tổng 6 cột.
 *   - Responsive: ẩn cột phụ ở mobile, giữ cột chính.
 *   - Search lọc theo fullName + staffId + username real-time.
 *   - Empty state rõ ràng.
 *
 * BRAND FIX — Tuân thủ NAVY THEME v1.1.5+ (AGENTS.md §5):
 *   - Background: #0D1324 (scmd-navy) — loại bỏ bg-white/95.
 *   - Primary action: #2563EB (scmd-cyber trong tailwind.config = Primary Blue).
 *   - Accent / link: #4285F4 (Blue 400).
 *   - Text phụ: #CCD6F6 (Light Silver).
 *   - Form input: nền slate-800/800, text white, border slate-700.
 *   - Không dùng italic ở bất kỳ đâu (tuân thủ typography rule).
 *   - Touch target button >= h-12 (48px).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Activity,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../lib/utils';
import type { Staff } from './types';
import { useDashboardStore } from '../store/useDashboardStore';

// ─── Sub-components & Utils ────────────────────────────────────────────────
import { 
  getDisplayName, 
} from './StaffTab.utils.js';
import { StaffForm } from './components/StaffForm.js';
import { StaffTable } from './components/StaffTable.js';
import { StaffCardList } from './components/StaffCardList.js';
import { StaffDetailModal } from './components/StaffDetailModal.js';
import { StaffPrintModal } from './components/StaffPrintModal.js';
// ─── Props ──────────────────────────────────────────────────────────────────
interface StaffTabProps {
  staff: Staff[];
  editingStaff: Staff | null;
  selectedStaffDetail: Staff | null;
  staffModalTab: 'info' | 'performance' | 'history';
  newStaff: {
    fullName: string;
    staffId: string;
    role: string;
    username: string;
    password: string;
    qualifications: string;
    certificates: string;
    rewards: string;
    disciplines: string;
    workHistory: any[];
    email: string;
    credentials: { idNumber: string; licenseNumber: string; expiryDate: string };
  };
  isSubmitting: boolean;
  isLoading?: boolean;
  showPrintModal: Staff | null;
  printFields: string[];
  filters?: { search: string; role: string; status: string };
  onFilterChange?: (filters: { search: string; role: string; status: string }) => void;
  setNewStaff: React.Dispatch<React.SetStateAction<any>>;
  setStaffModalTab: (v: 'info' | 'performance' | 'history') => void;
  setSelectedStaffDetail: (v: Staff | null) => void;
  setShowConfirmModal: (v: { id: string; type: 'checkpoint' | 'staff' | 'route'; name: string } | null) => void;
  setShowPrintModal: (v: Staff | null) => void;
  setPrintFields: (v: string[]) => void;
  startEditingStaff: (s: Staff) => void;
  cancelEditingStaff: () => void;
  handleAddStaff: (e: React.FormEvent) => void;
  handlePrintStaffProfile: (s: Staff) => void;
  tenantInfo?: any;
}

// ════════════════════════════════════════════════════════════════════════════
export const StaffTab: React.FC<StaffTabProps> = React.memo(({
  staff,
  editingStaff,
  selectedStaffDetail,
  staffModalTab,
  newStaff,
  isSubmitting,
  isLoading,
  showPrintModal,
  printFields,
  setNewStaff,
  setStaffModalTab,
  setSelectedStaffDetail,
  setShowConfirmModal,
  setShowPrintModal,
  setPrintFields,
  startEditingStaff,
  cancelEditingStaff,
  handleAddStaff,
  handlePrintStaffProfile,
  filters: externalFilters,
  onFilterChange,
  tenantInfo,
}) => {
  const { t } = useTranslation();
  const [internalSearch, setInternalSearch] = useState('');
  const [searchInputValue, setSearchInputValue] = useState(externalFilters?.search ?? '');
  const [internalRoleFilter, setInternalRoleFilter] = useState('all');
  const [internalStatusFilter, setInternalStatusFilter] = useState('all');

  // Sync searchInputValue if external search changes (rare, but for consistency)
  useEffect(() => {
    if (externalFilters?.search !== undefined && externalFilters.search !== searchInputValue) {
      setSearchInputValue(externalFilters.search);
    }
  }, [externalFilters?.search]);

  // Unified filter state (excluding immediate search input)
  const search = externalFilters?.search ?? internalSearch;
  const roleFilter = externalFilters?.role ?? internalRoleFilter;
  const statusFilter = externalFilters?.status ?? internalStatusFilter;

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Handle filter changes (Role/Status)
  const handleFilterUpdate = (newFilters: Partial<{ search: string; role: string; status: string }>) => {
    const updated = {
      search: newFilters.search !== undefined ? newFilters.search : search,
      role: newFilters.role !== undefined ? newFilters.role : roleFilter,
      status: newFilters.status !== undefined ? newFilters.status : statusFilter,
    };

    if (onFilterChange) {
      onFilterChange(updated);
    } else {
      if (newFilters.search !== undefined) {
        setInternalSearch(newFilters.search);
        setDebouncedSearch(newFilters.search);
      }
      if (newFilters.role !== undefined) setInternalRoleFilter(newFilters.role);
      if (newFilters.status !== undefined) setInternalStatusFilter(newFilters.status);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger if value actually changed and differs from current filter
      if (searchInputValue !== search) {
        handleFilterUpdate({ search: searchInputValue });
      }
      
      if (!onFilterChange) {
        setDebouncedSearch(searchInputValue);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInputValue, onFilterChange]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  // ── Lọc + tìm kiếm danh sách ──────────────────────────────────────────────
  // Nếu dùng onFilterChange (Server-side), filteredStaff có thể chính là staff prop
  const filteredStaff = useMemo(() => {
    if (!Array.isArray(staff)) return [];
    if (onFilterChange) return staff; // Server filter, just return staff list as is

    const q = debouncedSearch.toLowerCase().trim();
    return staff.filter((s) => {
      const name = getDisplayName(s).toLowerCase();
      const staffId = (s.staffId || '').toLowerCase();
      const username = (s.username || '').toLowerCase();
      const phone = (s.phone || '').toString().toLowerCase();
      const email = (s.email || '').toLowerCase();

      const matchQ = !q || 
        name.includes(q) || 
        staffId.includes(q) || 
        username.includes(q) || 
        phone.includes(q) || 
        email.includes(q);

      const matchRole = roleFilter === 'all' || s.role === roleFilter || s.role?.toLowerCase() === roleFilter;
      const matchStatus = statusFilter === 'all' || (s as any).status === statusFilter;
      
      return matchQ && matchRole && matchStatus;
    });
  }, [staff, debouncedSearch, roleFilter, statusFilter, !!onFilterChange]);

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const pagedStaff = useMemo(() => {
    return filteredStaff.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredStaff, page]);

  // Real-time online status from store
  const onlineUserIds = useDashboardStore((state) => state.onlineUserIds);

  // ── Thống kê nhanh ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!Array.isArray(staff)) return { total: 0, active: 0, guards: 0, admins: 0 };
    const total = staff.length;
    const onlineRealtimeCount = staff.filter(s => Array.isArray(onlineUserIds) && onlineUserIds.includes(s.id)).length;
    const guards = staff.filter((s) => s.role === 'guard' || s.role === 'Guard').length;
    const admins = staff.filter((s) => ['tenant-admin', 'Admin', 'supervisor', 'Supervisor'].includes(s.role)).length;
    return { total, active: onlineRealtimeCount, guards, admins };
  }, [staff, onlineUserIds]);

  return (
    <>
      <motion.div
        key="staff"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight text-white uppercase not-italic">{t('staff.title')}</h2>
              <div className="px-3 py-1 bg-scmd-primary/10 border border-scmd-primary/20 rounded-full">
                <span className="text-[10px] font-black text-scmd-primary uppercase tracking-[0.2em]">VERIFIED V2.5</span>
              </div>
            </div>
            <p className="text-xs font-bold text-scmd-silver/40 uppercase tracking-widest">
              Digital Command Center — Personnel Management System
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'TỔNG QUÂN SỐ', value: stats.total, color: 'text-white' },
              { label: 'TRỰC TUYẾN', value: stats.active, color: 'text-emerald-400' },
              { label: 'AN NINH', value: stats.guards, color: 'text-scmd-primary' },
              { label: 'QUẢN LÝ', value: stats.admins, color: 'text-amber-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-start px-5 py-2.5 bg-scmd-surface/40 border border-white/5 rounded-2xl min-w-[100px] shadow-sm"
              >
                <span className="text-[9px] text-scmd-silver/40 font-black uppercase tracking-[0.15em] mb-1">{stat.label}</span>
                <span className={cn('text-xl font-black font-mono leading-none', stat.color)}>{stat.value.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Form thêm / sửa nhân viên ─────────────────────────── */}
          <div className="lg:col-span-4">
            <StaffForm 
              editingStaff={editingStaff}
              newStaff={newStaff}
              isSubmitting={isSubmitting}
              setNewStaff={setNewStaff}
              cancelEditingStaff={cancelEditingStaff}
              handleAddStaff={handleAddStaff}
              tenantInfo={tenantInfo}
              staffCount={stats.total}
            />
          </div>

          {/* ── RIGHT: Danh sách nhân viên ───────────────────────────────── */}
          <div className="lg:col-span-8">
            <div className="bg-scmd-surface border border-white/5 rounded-2xl shadow-xl overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-white/5 bg-scmd-navy/20 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h3 className="text-[10px] font-black text-scmd-silver/60 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={14} className="text-scmd-primary" />
                  Danh sách nhân sự
                  <span className="text-scmd-primary">({filteredStaff.length})</span>
                </h3>

                <div className="flex gap-2 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:w-52">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-scmd-silver/20"
                      size={13}
                    />
                    <input
                      type="text"
                      value={searchInputValue}
                      onChange={(e) => setSearchInputValue(e.target.value)}
                      placeholder="Tìm theo tên, mã, login, SĐT..."
                      className="w-full pl-8 pr-3 py-2 bg-scmd-navy/80 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-scmd-silver/20 focus:ring-2 focus:ring-scmd-primary focus:border-scmd-primary outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Role filter */}
                  <div className="relative">
                    <Filter
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-scmd-silver/40"
                      size={12}
                    />
                    <select
                      value={roleFilter}
                      onChange={(e) => handleFilterUpdate({ role: e.target.value })}
                      className="pl-7 pr-3 py-2 bg-scmd-navy/80 border border-white/5 rounded-xl text-[10px] font-black uppercase text-scmd-silver/80 appearance-none outline-none focus:ring-2 focus:ring-scmd-primary cursor-pointer shadow-inner"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="guard">Bảo vệ</option>
                      <option value="supervisor">Giám sát</option>
                      <option value="tenant-admin">Quản trị</option>
                      <option value="technician">Kỹ thuật</option>
                    </select>
                  </div>

                  {/* Status filter */}
                  <div className="relative">
                    <Activity
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-scmd-silver/40"
                      size={12}
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => handleFilterUpdate({ status: e.target.value })}
                      className="pl-7 pr-3 py-2 bg-scmd-navy/80 border border-white/5 rounded-xl text-[10px] font-black uppercase text-scmd-silver/80 appearance-none outline-none focus:ring-2 focus:ring-scmd-primary cursor-pointer shadow-inner"
                    >
                      <option value="all">Tất cả Trạng thái</option>
                      <option value="active">Hoạt động</option>
                      <option value="inactive">Tạm nghỉ</option>
                      <option value="suspended">Bị đình chỉ</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hybrid Responsive Staff List */}
              <StaffTable 
                pagedStaff={pagedStaff}
                onlineUserIds={onlineUserIds}
                isLoading={isLoading || false}
                staff={staff}
                itemsPerPage={itemsPerPage}
                setSelectedStaffDetail={setSelectedStaffDetail}
                startEditingStaff={startEditingStaff}
                setShowPrintModal={setShowPrintModal}
                setShowConfirmModal={setShowConfirmModal}
              />

              <StaffCardList 
                pagedStaff={pagedStaff}
                onlineUserIds={onlineUserIds}
                isLoading={isLoading || false}
                staff={staff}
                itemsPerPage={itemsPerPage}
                setSelectedStaffDetail={setSelectedStaffDetail}
                startEditingStaff={startEditingStaff}
                setShowConfirmModal={setShowConfirmModal}
              />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-scmd-navy/20">
                    <p className="text-[10px] font-black text-scmd-silver/40 uppercase tracking-widest">
                      Hiển thị 1-<span className="text-scmd-primary">{pagedStaff.length}</span> trên <span className="text-white">{filteredStaff.length}</span> nhân sự
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-scmd-navy border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="rotate-180" size={14} />
                      </button>
                      
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                          // Show only current, first, last and surrounding pages if many
                          const shouldShow = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                          if (!shouldShow) {
                            if (p === 2 || p === totalPages - 1) {
                              return <span key={p} className="text-scmd-silver/20 px-1">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={cn(
                                "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                page === p 
                                  ? "bg-scmd-primary text-white shadow-lg shadow-scmd-primary/20" 
                                  : "text-scmd-silver/40 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-scmd-navy border border-white/5 text-scmd-silver/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {filteredStaff.length === 0 && (
                  <div className="py-20 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-scmd-navy/50 flex items-center justify-center border border-white/5 shadow-inner">
                      <Users size={32} className="text-scmd-silver/20" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-scmd-silver/60 uppercase tracking-tight">
                        {search || roleFilter !== 'all'
                          ? 'Mục tiêu không nằm trong phạm vi quét'
                          : 'Hệ thống nhân sự đang trống'}
                      </p>
                      <p className="text-[10px] font-bold text-scmd-silver/20 uppercase tracking-[0.15em] max-w-xs mx-auto">
                        {search || roleFilter !== 'all'
                          ? 'Thử thay đổi bộ lọc hoặc từ khóa để mở rộng phạm vi tìm kiếm'
                          : 'Sử dụng bảng điều khiển bên trái để bắt đầu khởi tạo hồ sơ nhân sự'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <StaffDetailModal 
        selectedStaffDetail={selectedStaffDetail}
        staffModalTab={staffModalTab}
        setStaffModalTab={setStaffModalTab}
        setSelectedStaffDetail={setSelectedStaffDetail}
        startEditingStaff={startEditingStaff}
      />


      <StaffPrintModal 
        showPrintModal={showPrintModal}
        printFields={printFields}
        setShowPrintModal={setShowPrintModal}
        setPrintFields={setPrintFields}
        handlePrintStaffProfile={handlePrintStaffProfile}
      />
    </>
  );
});
