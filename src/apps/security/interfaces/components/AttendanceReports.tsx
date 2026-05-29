import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Download, FileText, LogIn, LogOut, MapPinOff, ShieldAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exportReport, formatVietnamDate, formatVietnamDateTime, type ReportColumn } from "../utils/reportExport";
import type { AttendanceLog, AttendanceOpsSummary } from "../AttendanceTab";

interface AttendanceReportsProps {
  logs: AttendanceLog[];
  opsSummary?: AttendanceOpsSummary | null;
  initialReportType?: "shift" | "daily" | "weekly" | "monthly";
  selectedDate?: string;
  showOperationalFirst?: boolean;
  summaryCount?: number;
  hasMore?: boolean;
}

type AttendanceReportRow = {
  key: string;
  date: string;
  shiftLabel: string;
  siteName: string;
  guardPostName: string;
  vendorName: string;
  contractCode: string;
  staffId: string;
  staffName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  lateMinutes: number;
  gpsStatus: "valid" | "invalid" | "missing";
  status: "Đủ dữ liệu" | "Thiếu check-out" | "Sai GPS/log" | "Đi trễ";
  logs: AttendanceLog[];
};

const toDateInputValue = (date: Date) => date.toISOString().split("T")[0] ?? date.toISOString().slice(0, 10);

const formatWorkedMinutes = (minutes?: number | null) => {
  const safeMinutes = Math.max(0, Number(minutes ?? 0));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
};

const buildReportRows = (logs: AttendanceLog[]) => {
  const grouped = new Map<string, AttendanceLog[]>();

  for (const log of logs) {
    const logicalDate = log.shiftLabel?.split(" • ")[0] || toDateInputValue(new Date(log.createdAt));
    const key = `${log.shiftScheduleId || logicalDate}:${log.staffId}:${logicalDate}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(log);
    grouped.set(key, bucket);
  }

  return Array.from(grouped.entries()).map(([key, groupedLogs]) => {
    const ordered = [...groupedLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const first = ordered[0];
    const checkInLog = ordered.find((item) => item.type === "CHECK_IN");
    const checkOutLog = [...ordered].reverse().find((item) => item.type === "CHECK_OUT");
    const gpsStatus = ordered.some((item) => item.isValid === false)
      ? "invalid"
      : ordered.every((item) => item.location)
        ? "valid"
        : "missing";

    let status: AttendanceReportRow["status"] = "Đủ dữ liệu";
    if (ordered.some((item) => item.type === "CHECK_IN" && !item.checkOutAt)) status = "Thiếu check-out";
    else if (gpsStatus === "invalid") status = "Sai GPS/log";
    else if (ordered.some((item) => Number(item.lateMinutes ?? 0) > 0)) status = "Đi trễ";

    return {
      key,
      date: first?.shiftLabel?.split(" • ")[0] || toDateInputValue(new Date(first?.createdAt || new Date())),
      shiftLabel: first?.shiftLabel || "Không có ca",
      siteName: first?.siteName || "Chưa gắn site",
      guardPostName: first?.guardPostName || "Chưa gắn chốt",
      vendorName: first?.vendorName || "Chưa gắn vendor",
      contractCode: first?.contractCode || first?.contractName || "Chưa gắn hợp đồng",
      staffId: first?.staffId || "unknown",
      staffName: first?.staffName || first?.staff?.fullName || first?.staff?.username || first?.staffId || "Chưa rõ nhân sự",
      checkInAt: checkInLog?.checkInAt || checkInLog?.createdAt || null,
      checkOutAt: checkOutLog?.checkOutAt || checkOutLog?.createdAt || null,
      workedMinutes: Number(checkOutLog?.workedMinutes ?? checkInLog?.workedMinutes ?? 0),
      lateMinutes: Number(checkInLog?.lateMinutes ?? 0),
      gpsStatus,
      status,
      logs: ordered,
    };
  });
};

const getStatusTone = (status: AttendanceReportRow["status"]) => {
  if (status === "Thiếu check-out" || status === "Sai GPS/log") return "text-red-200 border-red-500/20 bg-red-500/10";
  if (status === "Đi trễ") return "text-amber-200 border-amber-500/20 bg-amber-500/10";
  return "text-emerald-200 border-emerald-500/20 bg-emerald-500/10";
};

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
  logs,
  opsSummary,
  initialReportType = "daily",
  selectedDate: initialSelectedDate,
  showOperationalFirst = false,
  summaryCount = 0,
  hasMore = false,
}) => {
  const [reportType, setReportType] = useState<"shift" | "daily" | "weekly" | "monthly">(initialReportType);
  const [selectedDate, setSelectedDate] = useState(() => initialSelectedDate || toDateInputValue(new Date()));

  useEffect(() => {
    setReportType(initialReportType);
  }, [initialReportType]);

  useEffect(() => {
    if (initialSelectedDate) setSelectedDate(initialSelectedDate);
  }, [initialSelectedDate]);

  const reportRows = useMemo(() => buildReportRows(logs), [logs]);

  const filteredRows = useMemo(() => {
    return reportRows.filter((row) => {
      if (reportType === "weekly") {
        const rowDate = new Date(row.date).getTime();
        const end = new Date(selectedDate).getTime();
        return rowDate <= end && rowDate > end - 7 * 24 * 60 * 60 * 1000;
      }
      if (reportType === "monthly") {
        return row.date.startsWith(selectedDate.slice(0, 7));
      }
      return row.date === selectedDate;
    });
  }, [reportRows, reportType, selectedDate]);

  const fallbackUrgentItems = useMemo(() => {
    return filteredRows
      .filter((row) => row.status !== "Đủ dữ liệu")
      .map((row) => ({
        id: row.key,
        severity: row.status === "Thiếu check-out" || row.status === "Sai GPS/log" ? "CRITICAL" : "WARNING",
        type: row.status === "Thiếu check-out" ? "MISSING_CHECKOUT" : row.status === "Đi trễ" ? "LATE_CHECKIN" : "WRONG_GPS",
        siteName: row.siteName,
        vendorName: row.vendorName,
        contractId: row.contractCode,
        shiftLabel: row.shiftLabel,
        guardName: row.staffName,
        occurredAt: row.checkInAt || row.logs[0]?.createdAt || new Date().toISOString(),
        nextAction: row.status === "Thiếu check-out" ? "Xác nhận check-out" : row.status === "Đi trễ" ? "Liên hệ chỉ huy ca" : "Kiểm tra GPS / bằng chứng",
      }));
  }, [filteredRows]);

  const visibleUrgentItems = (opsSummary?.urgentItems?.length ? opsSummary.urgentItems : fallbackUrgentItems).slice(
    0,
    showOperationalFirst ? 5 : 12,
  );

  const trendData = opsSummary?.dailyTrend?.length
    ? opsSummary.dailyTrend.map((item) => ({
        label: item.date.slice(5),
        covered: item.covered,
        exceptions: item.exceptions,
      }))
    : [];

  const reportPeriodLabel =
    reportType === "shift"
      ? `Ca trực ngày ${formatVietnamDate(selectedDate)}`
      : reportType === "daily"
        ? `Ngày ${formatVietnamDate(selectedDate)}`
        : reportType === "weekly"
          ? `Tuần kết thúc ngày ${formatVietnamDate(selectedDate)}`
          : `Tháng ${selectedDate.substring(0, 7)}`;

  const exportRows: Array<Record<string, unknown>> = filteredRows.map((row) => ({
    date: formatVietnamDate(row.date),
    shift: row.shiftLabel,
    site: row.siteName,
    guardPost: row.guardPostName,
    vendor: row.vendorName,
    contract: row.contractCode,
    staffName: row.staffName,
    checkInAt: row.checkInAt ? formatVietnamDateTime(row.checkInAt) : "Chưa có",
    checkOutAt: row.checkOutAt ? formatVietnamDateTime(row.checkOutAt) : "Chưa có",
    worked: formatWorkedMinutes(row.workedMinutes),
    gpsStatus: row.gpsStatus,
    status: row.status,
  }));

  const exportColumns: ReportColumn<Record<string, unknown>>[] = [
    { key: "date", header: "Ngày", width: "88px", align: "center" },
    { key: "shift", header: "Ca" },
    { key: "site", header: "Site" },
    { key: "guardPost", header: "Chốt" },
    { key: "vendor", header: "Vendor" },
    { key: "contract", header: "Hợp đồng" },
    { key: "staffName", header: "Bảo vệ" },
    { key: "checkInAt", header: "Check-in", width: "120px", align: "center" },
    { key: "checkOutAt", header: "Check-out", width: "120px", align: "center" },
    { key: "worked", header: "Giờ làm", width: "86px", align: "center" },
    { key: "gpsStatus", header: "GPS", width: "80px", align: "center" },
    { key: "status", header: "Trạng thái", width: "120px", align: "center" },
  ];

  const exportAttendanceReport = (format: "print" | "excel") => {
    exportReport(
      format,
      {
        title: "Báo cáo chấm công bảo vệ",
        subtitle: "Bảng điều hành ca trực gắn theo site, chốt, vendor, contract và bằng chứng chấm công thực tế",
        organizationName: "SCMD Pro",
        unitName: "Phân hệ ca trực / đối soát quân số",
        reportPeriod: reportPeriodLabel,
        generatedBy: "Tenant Admin",
      },
      exportColumns,
      exportRows,
      [
        { label: "Dòng đối soát", value: exportRows.length },
        { label: "Guard có dữ liệu", value: summaryCount },
        { label: "Cảnh báo", value: visibleUrgentItems.length },
        { label: "Tỷ lệ hợp lệ", value: `${opsSummary?.totals.validAttendanceRate ?? 0}%` },
      ],
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[14px] border border-white/10 bg-scmd-navy/45 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-[12px] border border-white/6 bg-scmd-navy/30 p-1 no-scrollbar">
          {(["shift", "daily", "weekly", "monthly"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`min-h-11 rounded-[10px] px-4 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
                reportType === type ? "bg-scmd-primary text-white" : "text-scmd-silver/55 hover:text-white"
              }`}
            >
              {type === "shift" ? "Theo ca" : type === "daily" ? "Theo ngày" : type === "weekly" ? "Theo tuần" : "Theo tháng"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="min-h-11 rounded-[10px] border border-white/10 bg-scmd-navy/55 pl-4 pr-10 text-sm font-semibold text-white"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-scmd-silver/45" size={16} />
          </div>
          <button
            type="button"
            onClick={() => exportAttendanceReport("print")}
            className="min-h-11 rounded-[10px] bg-scmd-primary px-4 text-sm font-bold text-white transition-colors hover:bg-scmd-primary/85"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> In / PDF
            </span>
          </button>
          <button
            type="button"
            onClick={() => exportAttendanceReport("excel")}
            className="min-h-11 rounded-[10px] bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <span className="inline-flex items-center gap-2">
              <Download size={16} /> Excel
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold text-scmd-silver/60">
        <span className="rounded-[10px] border border-white/8 bg-scmd-navy/45 px-3 py-2 text-white">{reportPeriodLabel}</span>
        <span>{filteredRows.length} dòng đối soát</span>
        <span>{summaryCount} guard có dữ liệu</span>
        {hasMore ? <span className="text-amber-300">Còn dữ liệu phía sau, cần thu hẹp bộ lọc hoặc tải tiếp ở phase sau</span> : null}
      </div>

      {showOperationalFirst && visibleUrgentItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <div id="urgent-attendance-items" className="rounded-[14px] border border-red-500/20 bg-red-500/5 p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="text-red-300" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-red-200">Việc cần xử lý ngay</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {visibleUrgentItems.map((item) => (
                <div key={item.id} className="rounded-[12px] border border-white/8 bg-scmd-navy/65 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-[8px] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        item.severity === "CRITICAL" ? "bg-red-500 text-white" : "bg-amber-500/15 text-amber-200"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-[11px] font-semibold text-scmd-silver/45">{formatVietnamDateTime(item.occurredAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-white">{item.guardName || item.siteName || "Ca trực cần xử lý"}</p>
                  <p className="mt-1 text-xs leading-5 text-scmd-silver/60">
                    {[item.siteName, item.vendorName, item.shiftLabel].filter(Boolean).join(" • ")}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-scmd-silver/55">{item.nextAction}</span>
                    <span className="rounded-[8px] border border-white/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      Ưu tiên xử lý
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-white/10 bg-scmd-navy/45 p-4">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-scmd-primary" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white">Nhịp độ tuần</h3>
            </div>
            {trendData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "rgba(204,214,246,0.55)", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(204,214,246,0.55)", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0d1324", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Area type="monotone" dataKey="covered" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#coverageGradient)" />
                    <Area type="monotone" dataKey="exceptions" stroke="#F97316" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-[12px] border border-dashed border-white/10 text-sm text-scmd-silver/45">
                Chưa có dữ liệu xu hướng cho bộ lọc hiện tại.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!showOperationalFirst && visibleUrgentItems.length > 0 ? (
        <div className="rounded-[14px] border border-red-500/20 bg-red-500/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="text-red-300" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-red-200">Cảnh báo bất thường ({visibleUrgentItems.length})</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {visibleUrgentItems.map((item) => (
              <div key={item.id} className="rounded-[12px] border border-white/8 bg-scmd-navy/65 p-3">
                <p className="text-sm font-bold text-white">{item.guardName || item.siteName || "Ca trực cần xử lý"}</p>
                <p className="mt-1 text-xs text-scmd-silver/60">{[item.siteName, item.shiftLabel].filter(Boolean).join(" • ")}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div id="attendance-detail-table" className="overflow-hidden rounded-[14px] border border-white/10 bg-scmd-navy/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="border-b border-white/5 bg-scmd-navy/20 p-4">
          <h3 className="text-lg font-bold uppercase tracking-[0.04em] text-white">
            <span className="inline-flex items-center gap-2">
              <FileText size={18} className="text-emerald-400" />
              Bảng điều hành chấm công
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="bg-scmd-navy/40 text-[10px] font-bold uppercase tracking-[0.16em] text-scmd-silver/45">
                <th className="px-4 py-3">Ngày / ca</th>
                <th className="px-4 py-3">Site / chốt</th>
                <th className="px-4 py-3">Vendor / hợp đồng</th>
                <th className="px-4 py-3">Bảo vệ</th>
                <th className="px-4 py-3">Vào / ra</th>
                <th className="px-4 py-3">Giờ làm</th>
                <th className="px-4 py-3">GPS</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRows.map((row) => (
                <tr key={row.key} className="align-top hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{formatVietnamDate(row.date)}</p>
                      <p className="text-xs text-scmd-silver/55">{row.shiftLabel}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{row.siteName}</p>
                      <p className="text-xs text-scmd-silver/55">{row.guardPostName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{row.vendorName}</p>
                      <p className="text-xs text-scmd-silver/55">{row.contractCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{row.staffName}</p>
                      <p className="text-xs font-mono text-scmd-silver/45">{row.staffId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-2 text-emerald-200">
                        <LogIn size={12} />
                        {row.checkInAt ? formatVietnamDateTime(row.checkInAt) : "Chưa check-in"}
                      </p>
                      <p className="flex items-center gap-2 text-scmd-silver/60">
                        <LogOut size={12} />
                        {row.checkOutAt ? formatVietnamDateTime(row.checkOutAt) : "Chưa check-out"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">{formatWorkedMinutes(row.workedMinutes)}</p>
                      {row.lateMinutes > 0 ? <p className="text-xs text-amber-300">Trễ {row.lateMinutes} phút</p> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-[8px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        row.gpsStatus === "valid"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : row.gpsStatus === "invalid"
                            ? "border-red-500/20 bg-red-500/10 text-red-200"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {row.gpsStatus === "valid" ? "Đúng vị trí" : row.gpsStatus === "invalid" ? "Sai GPS" : "Thiếu GPS"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-[8px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getStatusTone(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.logs.map((log) => (
                        <span
                          key={log.id}
                          className={`inline-flex items-center gap-1 rounded-[8px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            log.type === "CHECK_IN"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                              : log.type === "CHECK_OUT"
                                ? "border-white/10 bg-white/[0.04] text-white"
                                : "border-scmd-primary/20 bg-scmd-primary/10 text-scmd-cyber"
                          }`}
                        >
                          {log.type}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16">
                    <div className="mx-auto max-w-xl rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                      <MapPinOff className="mx-auto mb-3 text-scmd-silver/35" size={28} />
                      <p className="text-sm font-bold text-white">Không có dữ liệu chấm công cho bộ lọc hiện tại.</p>
                      <p className="mt-2 text-xs leading-5 text-scmd-silver/50">
                        Kiểm tra lại khoảng ngày, site, vendor, hợp đồng hoặc chuyển sang kỳ khác để xem dữ liệu điều hành.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
