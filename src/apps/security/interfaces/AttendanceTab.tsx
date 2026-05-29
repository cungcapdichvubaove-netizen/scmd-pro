import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Calendar, CheckCircle2, Clock3, MapPinOff, RefreshCcw, ShieldAlert, ChevronRight, MapPin } from "lucide-react";
import { AttendanceReports } from "./components/AttendanceReports";
import { apiFetch } from "../../../lib/api";
import {
  DashboardErrorState,
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardSpinner,
  DashboardToolbarRow,
  dashboardInputClass,
} from "../../common/interfaces/components/DashboardUI";
import { opsTableClass, opsThClass, opsTdClass, opsRowClass, OpsStatusBadge, OpsIconButton } from "./components/OpsTableSystem";
import { cn } from "../../../lib/utils";

export interface AttendanceLog {
  id: string;
  tenantId: string;
  staffId: string;
  location?: { lat: number; lon: number } | null;
  type: string;
  createdAt: string;
  isValid: boolean;
  workedMinutes?: number | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  suspicionReason?: string | null;
  gpsStatus?: "valid" | "invalid" | "missing";
  checkInStatus?: "ok" | "late" | "missing-checkout";
  shiftScheduleId?: string | null;
  shiftLabel?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  shiftType?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  contractId?: string | null;
  contractCode?: string | null;
  contractName?: string | null;
  guardPostId?: string | null;
  guardPostName?: string | null;
  staff?: { fullName?: string; username?: string; id?: string };
  staffName?: string;
}

interface AttendanceSummaryItem {
  staffId: string;
  staffName: string;
  count: number;
  lastActive: string | null;
}

interface AttendanceResponse {
  records: AttendanceLog[];
  nextCursor: string | null;
  summary: AttendanceSummaryItem[];
}

export interface AttendanceOpsSummary {
  period: "today" | "current-shift" | "week" | "month";
  totals: {
    scheduledShifts: number;
    coveredShifts: number;
    understaffedShifts: number;
    missingCheckIn: number;
    missingCheckOut: number;
    lateCheckIn: number;
    invalidGps: number;
    validAttendanceRate: number;
  };
  urgentItems: Array<{
    id: string;
    severity: "CRITICAL" | "WARNING";
    type: "MISSING_CHECKIN" | "MISSING_CHECKOUT" | "LATE_CHECKIN" | "WRONG_GPS" | "UNDERSTAFFED";
    siteId?: string | null;
    siteName?: string | null;
    vendorId?: string | null;
    vendorName?: string | null;
    contractId?: string | null;
    shiftScheduleId?: string | null;
    shiftLabel?: string | null;
    guardName?: string | null;
    occurredAt: string;
    nextAction: string;
  }>;
  dailyTrend: Array<{
    date: string;
    scheduled: number;
    covered: number;
    exceptions: number;
  }>;
}

interface AttendanceTabProps {
  contextualFilters?: Record<string, string>;
}

const DEFAULT_ATTENDANCE_LIMIT = 200;

const toDateInputValue = (date: Date) => date.toISOString().split("T")[0] ?? date.toISOString().slice(0, 10);

const getDateRangeForShift = (shift?: string) => {
  const end = new Date();
  const start = new Date(end);

  if (shift === "week") {
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
  } else if (shift === "month") {
    start.setDate(1);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
};

const normalizeFilterValue = (value?: string) => {
  if (!value) return undefined;
  if (value === "all" || value.startsWith("all-")) return undefined;
  return value;
};

const buildAttendanceParams = (filters: Record<string, string>, startDate: string, endDate: string) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    limit: String(DEFAULT_ATTENDANCE_LIMIT),
  });

  const mappings: Array<[string, string | undefined]> = [
    ["shift", filters.shift],
    ["site", normalizeFilterValue(filters.site)],
    ["vendor", normalizeFilterValue(filters.vendor)],
    ["contractId", normalizeFilterValue(filters.contractId)],
    ["guard", filters.guard],
    ["checkInStatus", normalizeFilterValue(filters.checkInStatus)],
    ["gpsStatus", normalizeFilterValue(filters.gpsStatus)],
    ["coverageStatus", normalizeFilterValue(filters.coverageStatus)],
  ];

  mappings.forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return params;
};

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ contextualFilters = {} }) => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);
  const [opsSummary, setOpsSummary] = useState<AttendanceOpsSummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const activeShift = contextualFilters.shift ?? "current-shift";
  const defaultRange = useMemo(() => getDateRangeForShift(activeShift), [activeShift]);

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [lastAppliedShift, setLastAppliedShift] = useState(activeShift);

  useEffect(() => {
    if (activeShift === lastAppliedShift) return;
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
    setLastAppliedShift(activeShift);
  }, [activeShift, defaultRange.endDate, defaultRange.startDate, lastAppliedShift]);

  const fetchAttendance = async () => {
    setIsLoading(true);
    setAttendanceError(null);

    try {
      const params = buildAttendanceParams(contextualFilters, startDate, endDate);
      const [attendanceData, opsData] = await Promise.all([
        apiFetch<AttendanceResponse | AttendanceLog[]>(`/api/tenant/attendance?${params.toString()}`),
        apiFetch<AttendanceOpsSummary>(`/api/tenant/attendance/ops-summary?${params.toString()}`),
      ]);

      const normalized = Array.isArray(attendanceData)
        ? { records: attendanceData, nextCursor: null, summary: [] }
        : {
            records: Array.isArray(attendanceData?.records) ? attendanceData.records : [],
            nextCursor: attendanceData?.nextCursor ?? null,
            summary: Array.isArray(attendanceData?.summary) ? attendanceData.summary : [],
          };

      setAttendanceLogs(normalized.records);
      setAttendanceSummary(normalized.summary);
      setNextCursor(normalized.nextCursor);
      setOpsSummary(opsData ?? null);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error("Failed to fetch attendance logs", err);
      if (!hasLoadedOnce) {
        setAttendanceLogs([]);
        setAttendanceSummary([]);
        setOpsSummary(null);
        setNextCursor(null);
      }
      setAttendanceError(err instanceof Error && err.message ? err.message : "Không thể tải dữ liệu ca trực.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAttendance();
  }, [
    contextualFilters.checkInStatus,
    contextualFilters.contractId,
    contextualFilters.coverageStatus,
    contextualFilters.gpsStatus,
    contextualFilters.guard,
    contextualFilters.shift,
    contextualFilters.site,
    contextualFilters.vendor,
    endDate,
    startDate,
  ]);

  const fallbackMetrics = useMemo(() => {
    const total = attendanceLogs.length;
    const valid = attendanceLogs.filter((log) => log.isValid !== false).length;
    const missingCheckout = attendanceLogs.filter((log) => log.type === "CHECK_IN" && !log.checkOutAt).length;
    const riskyLogs = attendanceLogs.filter((log) => log.isValid === false || !log.location).length;
    const lateCheckIn = attendanceLogs.filter((log) => Number(log.lateMinutes ?? 0) > 0).length;
    return {
      total,
      valid,
      missingCheckout,
      riskyLogs,
      lateCheckIn,
      validRate: total > 0 ? Math.round((valid / total) * 100) : 0,
    };
  }, [attendanceLogs]);

  const operationalMetrics = useMemo(() => {
    if (!opsSummary) {
      return {
        actionRequired: fallbackMetrics.missingCheckout + fallbackMetrics.riskyLogs,
        understaffed: 0,
        missingCheckout: fallbackMetrics.missingCheckout,
        riskyLogs: fallbackMetrics.riskyLogs,
        validRate: fallbackMetrics.validRate,
      };
    }

    return {
      actionRequired:
        opsSummary.totals.understaffedShifts +
        opsSummary.totals.missingCheckOut +
        opsSummary.totals.invalidGps +
        opsSummary.totals.lateCheckIn,
      understaffed: opsSummary.totals.understaffedShifts,
      missingCheckout: opsSummary.totals.missingCheckOut,
      riskyLogs: opsSummary.totals.invalidGps,
      validRate: opsSummary.totals.validAttendanceRate,
    };
  }, [fallbackMetrics, opsSummary]);

  const reportType =
    activeShift === "week"
      ? "weekly"
      : activeShift === "month"
        ? "monthly"
        : activeShift === "current-shift"
          ? "shift"
          : "daily";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <DashboardToolbarRow>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end lg:max-w-xl">
          <label className="space-y-1.5">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <Calendar size={13} />
              Từ ngày
            </span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={dashboardInputClass} />
          </label>
          <span className="hidden pb-2 text-sm font-semibold text-slate-600 sm:block">-</span>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Đến ngày</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={dashboardInputClass} />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void fetchAttendance()}
          disabled={isLoading}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-white/8 bg-white/[0.035] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCcw size={15} className={isLoading ? "animate-spin" : undefined} />
          Tải lại
        </button>
      </DashboardToolbarRow>

      <DashboardMetricGrid>
        <DashboardMetricCard
          label="Cần xử lý ngay"
          value={operationalMetrics.actionRequired}
          tone={operationalMetrics.actionRequired > 0 ? "danger" : "success"}
          icon={<ShieldAlert size={18} />}
        />
        <DashboardMetricCard
          label="Ca thiếu người"
          value={operationalMetrics.understaffed}
          tone={operationalMetrics.understaffed > 0 ? "danger" : "success"}
          icon={<AlertTriangle size={18} />}
          description="Ca chưa đủ quân số theo hợp đồng/shift schedule"
        />
        <DashboardMetricCard
          label="Chưa check-out"
          value={operationalMetrics.missingCheckout}
          tone={operationalMetrics.missingCheckout > 0 ? "warning" : "success"}
          icon={<Clock3 size={18} />}
          description="Guard đã vào ca nhưng chưa có dấu mốc kết thúc ca"
        />
        <DashboardMetricCard
          label="GPS / log rủi ro"
          value={operationalMetrics.riskyLogs}
          tone={operationalMetrics.riskyLogs > 0 ? "danger" : "success"}
          icon={<MapPinOff size={18} />}
          description={opsSummary
            ? `${opsSummary.totals.lateCheckIn} lượt đi trễ, ${attendanceSummary.length} guard có dữ liệu`
            : `${attendanceSummary.length} guard có dữ liệu trong phạm vi lọc`}
        />
        <DashboardMetricCard
          label="Tỷ lệ hợp lệ"
          value={`${operationalMetrics.validRate}%`}
          tone={operationalMetrics.validRate >= 95 ? "success" : operationalMetrics.validRate >= 80 ? "warning" : "danger"}
          icon={<CheckCircle2 size={18} />}
          description={`${attendanceLogs.length} log đang hiển thị${nextCursor ? ", còn dữ liệu phía sau" : ""}`}
        />
      </DashboardMetricGrid>

      {/* 1. Urgent Queue Table: Ưu tiên xử lý ngoại lệ vận hành ngay lập tức */}
      {opsSummary?.urgentItems && opsSummary.urgentItems.length > 0 && (
        <section className="rounded-[14px] border border-red-500/20 bg-red-500/[0.02] overflow-hidden">
          <div className="border-b border-red-500/10 px-4 py-3 flex items-center justify-between bg-red-500/[0.03]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <h3 className="text-[12px] font-bold text-red-200 uppercase tracking-wider">Hàng đợi xử lý khẩn cấp ({opsSummary.urgentItems.length})</h3>
            </div>
            <p className="text-[11px] text-red-400/60 italic">Yêu cầu điều phối nhân sự hoặc xác minh GPS</p>
          </div>
          <div className="overflow-x-auto">
            <table className={cn(opsTableClass, "min-w-[1000px]")}>
              <thead>
                <tr>
                  <th className={opsThClass}>Mức độ</th>
                  <th className={opsThClass}>Loại vi phạm</th>
                  <th className={opsThClass}>Địa điểm / Ca</th>
                  <th className={opsThClass}>Nhân sự</th>
                  <th className={opsThClass}>Thời điểm</th>
                  <th className={cn(opsThClass, "text-right")}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {opsSummary.urgentItems.map((item) => (
                  <tr key={item.id} className={cn(opsRowClass, "hover:bg-red-500/[0.04]")}>
                    <td className={opsTdClass}>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                        item.severity === 'CRITICAL' ? "border-red-500/30 bg-red-500/20 text-red-400" : "border-amber-500/30 bg-amber-500/20 text-amber-400"
                      )}>
                        {item.severity === 'CRITICAL' ? 'Khẩn cấp' : 'Cảnh báo'}
                      </span>
                    </td>
                    <td className={cn(opsTdClass, "font-bold text-white")}>{item.type.replace('_', ' ')}</td>
                    <td className={opsTdClass}>
                      <p className="text-xs font-semibold">{item.siteName}</p>
                      <p className="text-[10px] text-slate-500">{item.shiftLabel}</p>
                    </td>
                    <td className={opsTdClass}>{item.guardName || '---'}</td>
                    <td className={opsTdClass}>{new Date(item.occurredAt).toLocaleTimeString('vi-VN')}</td>
                    <td className={cn(opsTdClass, "text-right")}>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                        {item.nextAction}
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!hasLoadedOnce && isLoading ? (
        <DashboardSpinner message="Đang tải dữ liệu ca trực..." />
      ) : !hasLoadedOnce && attendanceError ? (
        <DashboardErrorState title="Không thể tải dữ liệu ca trực" description={attendanceError} onRetry={fetchAttendance} className="py-20" />
      ) : (
        <>
          {attendanceError ? (
            <div className="rounded-[12px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Không thể tải lớp dữ liệu mới nhất. Hệ thống đang giữ nguyên dữ liệu bạn đang xem.
            </div>
          ) : null}
          
          {/* 2. Main Content: Bảng dữ liệu chấm công chi tiết */}
          <div className="pt-2">
            <div className="mb-4 flex items-center gap-2 px-1">
              <div className="h-4 w-1 bg-blue-600 rounded-full" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.1em]">Bảng nhật ký chấm công chi tiết</h3>
            </div>
          <AttendanceReports
            logs={attendanceLogs}
            opsSummary={opsSummary}
            initialReportType={reportType}
            selectedDate={endDate}
            showOperationalFirst={activeShift === "week" || activeShift === "current-shift"}
            summaryCount={attendanceSummary.length}
            hasMore={Boolean(nextCursor)}
          />
          </div>
        </>
      )}
    </motion.div>
  );
};

export default AttendanceTab;
