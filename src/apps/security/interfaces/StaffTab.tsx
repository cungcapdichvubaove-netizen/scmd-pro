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

import React, { useState, useMemo, useEffect } from "react";
import { Users, Search, Activity, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import type { Staff } from "./types";
import { useDashboardStore } from "../store/useDashboardStore";
import { EmptyState } from "../../superadmin/interfaces/components/EmptyState.js";
import {
  DashboardErrorState,
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardToolbarRow,
  dashboardInputClass,
  dashboardSelectClass,
} from "../../common/interfaces/components/DashboardUI";

// ─── Sub-components & Utils ────────────────────────────────────────────────
import { getDisplayName } from "./StaffTab.utils.js";
import { StaffForm } from "./components/StaffForm.js";
import { StaffTable } from "./components/StaffTable.js";
import { AnimatePresence } from "motion/react";
import { StaffDetailModal } from "./components/StaffDetailModal.js";
import { StaffPrintModal } from "./components/StaffPrintModal.js";
// ─── Props ──────────────────────────────────────────────────────────────────
interface StaffTabProps {
  staff: Staff[];
  editingStaff: Staff | null;
  selectedStaffDetail: Staff | null;
  staffModalTab: "info" | "performance" | "history";
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
    assignedVendorId?: string;
    assignedSiteId?: string;
    assignedContractId?: string;
    credentials: {
      idNumber: string;
      licenseNumber: string;
      expiryDate: string;
    };
  };
  isSubmitting: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  showPrintModal: Staff | null;
  printFields: string[];
  filters?: { search: string; role: string; status: string };
  onFilterChange?: (filters: {
    search: string;
    role: string;
    status: string;
  }) => void;
  setNewStaff: React.Dispatch<React.SetStateAction<any>>;
  setStaffModalTab: (v: "info" | "performance" | "history") => void;
  setSelectedStaffDetail: (v: Staff | null) => void;
  setShowConfirmModal: (
    v: {
      id: string;
      type: "checkpoint" | "staff" | "route";
      name: string;
    } | null,
  ) => void;
  setShowPrintModal: (v: Staff | null) => void;
  setPrintFields: (v: string[]) => void;
  startEditingStaff: (s: Staff) => void;
  cancelEditingStaff: () => void;
  handleAddStaff: (e: React.FormEvent) => void;
  handlePrintStaffProfile: (s: Staff) => void;
  tenantInfo?: any;
}

// ════════════════════════════════════════════════════════════════════════════
export const StaffTab: React.FC<StaffTabProps> = React.memo(
  ({
    staff,
    editingStaff,
    selectedStaffDetail,
    staffModalTab,
    newStaff,
    isSubmitting,
    isLoading,
    error,
    onRetry,
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

    // Action 1: Xử lý kích hoạt Drawer "Thêm nhân sự" từ Header thông qua URL param
    useEffect(() => {
      if (searchParams.get('action') === 'add-staff') {
        setIsAddDrawerOpen(true);
        // Dọn dẹp param sau khi mở để tránh lặp lại hành động
        const next = new URLSearchParams(searchParams);
        next.delete('action');
        setSearchParams(next, { replace: true });
      }
    }, [searchParams, setSearchParams]);

    const search = externalFilters?.search || "";
    const roleFilter = externalFilters?.role || "all";
    const statusFilter = externalFilters?.status || "all";

    const [page, setPage] = useState(1);
    const itemsPerPage = 8;

    // Reset page on filter change
    useEffect(() => {
      setPage(1);
    }, [search, roleFilter, statusFilter]);

    // ── Lọc + tìm kiếm danh sách ──────────────────────────────────────────────
    // Nếu dùng onFilterChange (Server-side), filteredStaff có thể chính là staff prop
    const filteredStaff = useMemo(() => {
      if (!Array.isArray(staff)) return [];
      if (onFilterChange) return staff; // Server filter, just return staff list as is

      const q = search.toLowerCase().trim();
      return staff.filter((s) => {
        const name = getDisplayName(s).toLowerCase();
        const staffId = (s.staffId || "").toLowerCase();
        const username = (s.username || "").toLowerCase();
        const phone = (s.phone || "").toString().toLowerCase();
        const email = (s.email || "").toLowerCase();

        const matchQ =
          !q ||
          name.includes(q) ||
          staffId.includes(q) ||
          username.includes(q) ||
          phone.includes(q) ||
          email.includes(q);

        const matchRole =
          roleFilter === "all" ||
          s.role === roleFilter ||
          s.role?.toLowerCase() === roleFilter;
        const matchStatus =
          statusFilter === "all" || (s as any).status === statusFilter;

        return matchQ && matchRole && matchStatus;
      });
    }, [staff, search, roleFilter, statusFilter, !!onFilterChange]);

    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const pagedStaff = useMemo(() => {
      return filteredStaff.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage,
      );
    }, [filteredStaff, page]);

    // Real-time online status from store
    const onlineUserIds = useDashboardStore((state) => state.onlineUserIds);

    // ── Thống kê nhanh ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
      if (!Array.isArray(staff))
        return { total: 0, active: 0, guards: 0, admins: 0 };
      const total = staff.length;
      const onlineRealtimeCount = staff.filter(
        (s) => Array.isArray(onlineUserIds) && onlineUserIds.includes(s.id),
      ).length;
      const guards = staff.filter(
        (s) => s.role === "guard" || s.role === "Guard",
      ).length;
      const admins = staff.filter((s) =>
        [
          "tenant-admin",
          "Admin",
          "supervisor",
          "Supervisor",
          "vendor-commander",
          "vendor-representative",
        ].includes(s.role),
      ).length;
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
          {/* Action 2: Hợp nhất Tiêu đề - Thông tin định danh đã được Dashboard Chrome quản lý */}

          <DashboardMetricGrid className="grid-cols-2 md:grid-cols-4 gap-3">
            <DashboardMetricCard label="Tổng" value={stats.total.toString().padStart(2, "0")} icon={<Users size={18} />} />
            <DashboardMetricCard label="Online" value={stats.active.toString().padStart(2, "0")} tone="success" icon={<Activity size={18} />} />
            <DashboardMetricCard label="Bảo vệ" value={stats.guards.toString().padStart(2, "0")} tone="primary" />
            <DashboardMetricCard label="Quản lý" value={stats.admins.toString().padStart(2, "0")} tone="warning" />
          </DashboardMetricGrid>

          {/* Action 3 & 4: Đơn giản hóa Table Container - Table nằm trực tiếp trên background, mật độ cao */}
          <div className="w-full">
                {error && !isLoading ? (
                  <div className="p-5">
                    <DashboardErrorState
                      title="Không thể tải danh sách nhân sự"
                      description={error}
                      onRetry={onRetry}
                      className="py-14"
                    />
                  </div>
                ) : (
                  <>
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

                    {totalPages > 1 && (
                      <div className="flex flex-col gap-3 border-t border-white/5 bg-scmd-navy/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-scmd-silver/45">
                          Hiển thị{" "}
                          <span className="text-scmd-primary">
                            {pagedStaff.length}
                          </span>{" "}
                          /{" "}
                          <span className="text-white">
                            {filteredStaff.length}
                          </span>{" "}
                          nhân sự
                        </p>
                        <div className="flex items-center gap-1 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-scmd-navy text-scmd-silver/50 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Trang trước"
                          >
                            <ChevronRight className="rotate-180" size={14} />
                          </button>

                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1,
                          ).map((p) => {
                            const shouldShow =
                              p === 1 ||
                              p === totalPages ||
                              Math.abs(p - page) <= 1;
                            if (!shouldShow) {
                              if (p === 2 || p === totalPages - 1) {
                                return (
                                  <span
                                    key={p}
                                    className="px-1 text-scmd-silver/20"
                                  >
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            }
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPage(p)}
                                className={cn(
                                  "h-10 w-10 shrink-0 rounded-xl text-[10px] font-black transition-all",
                                  page === p
                                    ? "bg-scmd-primary text-white shadow-lg shadow-scmd-primary/20"
                                    : "text-scmd-silver/50 hover:bg-white/5 hover:text-white",
                                )}
                              >
                                {p}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page === totalPages}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-scmd-navy text-scmd-silver/50 transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Trang sau"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {!isLoading && filteredStaff.length === 0 && (
                      <div className="p-5">
                        <EmptyState
                          icon={<Users size={32} />}
                          title={
                            search ||
                            roleFilter !== "all" ||
                            statusFilter !== "all"
                              ? "Không tìm thấy nhân sự phù hợp"
                              : "Hệ thống nhân sự đang trống"
                          }
                          description={
                            search ||
                            roleFilter !== "all" ||
                            statusFilter !== "all"
                              ? "Thử thay đổi bộ lọc hoặc từ khóa để mở rộng phạm vi tìm kiếm."
                              : "Tạo hồ sơ đầu tiên bằng biểu mẫu bên trái để bắt đầu vận hành."
                          }
                          className="bg-scmd-navy/20"
                        />
                      </div>
                    )}
                  </>
                )}
            </div>
        </motion.div>

        {/* ── Add Staff Drawer ───────────────────────────────────────────── */}
        <AnimatePresence>
          {isAddDrawerOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddDrawerOpen(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative h-full w-full max-w-md bg-scmd-navy border-l border-white/10 shadow-2xl"
              >
                <StaffForm
                  editingStaff={editingStaff}
                  newStaff={newStaff}
                  isSubmitting={isSubmitting}
                  setNewStaff={setNewStaff}
                  cancelEditingStaff={() => {
                    cancelEditingStaff();
                    setIsAddDrawerOpen(false);
                  }}
                  handleAddStaff={(e) => {
                    handleAddStaff(e);
                    setIsAddDrawerOpen(false);
                  }}
                  tenantInfo={tenantInfo}
                  staffCount={stats.total}
                  isDrawer // Prop mới để StaffForm render tối ưu cho Drawer
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
  },
);
