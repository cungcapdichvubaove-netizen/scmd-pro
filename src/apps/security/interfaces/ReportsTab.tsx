import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  FileCheck2,
  Loader2,
  Printer,
  RefreshCcw,
  Shield,
  Target,
  X,
  FileDown,
} from "lucide-react";
import { apiFetch } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { LEGACY_EXCEL_EXTENSION } from "./utils/reportExport";
import {
  DashboardToolbarRow,
  DashboardFilterGroup,
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardPageHeader,
  dashboardInputClass,
  dashboardSelectClass,
} from "../../common/interfaces/components/DashboardUI";
import { SCMDButton } from "../../common/interfaces/components/SCMDButton";
import { FeatureLock } from "../../common/interfaces/components/FeatureLock";
import { AnimatePresence, motion } from "motion/react";
import { opsTableClass, opsThClass, opsTdClass, opsRowClass, OpsStatusBadge, OpsIconButton } from "./components/OpsTableSystem";
import { useDashboardStore } from "../store/useDashboardStore";

interface ReportsTabProps {
  isPro: boolean;
  setShowUpgradeModal: (show: boolean) => void;
}

interface VendorOption {
  id: string;
  name: string;
  status?: string;
}

interface VendorScorecardRecord {
  id: string;
  vendorId: string;
  contractId?: string | null;
  siteId?: string | null;
  month: string;
  status: string;
  patrolRate: number;
  incidentRate: number;
  disciplineRate: number;
  totalScore: number;
  confirmedViolationsCount: number;
  pendingViolationsCount: number;
  violationsCount: number;
  totalPenaltySuggested: number | string;
  createdAt: string;
}

interface PenaltyItemRecord {
  id: string;
  type: string;
  status: string;
  amount: number | string;
  reason?: string | null;
}

interface ViolationDisputeRecord {
  id: string;
  status: string;
  resolution?: string | null;
  reason: string;
}

interface MonthlyAcceptanceReportRecord {
  id: string;
  vendorId: string;
  contractId?: string | null;
  siteId?: string | null;
  month: string;
  status: string;
  revisionNumber?: number;
  revisionRootId?: string | null;
  previousRevisionId?: string | null;
  supersededAt?: string | null;
  generatedDataHash?: string;
  totalPenaltyAmount: number | string;
  totalConfirmedViolations: number;
  totalPendingViolations: number;
  finalizedAt?: string | null;
  generatedAt: string;
  exportPdfAttachmentId?: string | null;
  exportExcelAttachmentId?: string | null;
  penaltyItems?: PenaltyItemRecord[];
  disputes?: ViolationDisputeRecord[];
}

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const unwrapCollection = <T,>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  return [];
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const scoreFormatter = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

const formatCurrency = (value: number | string | null | undefined) => {
  const normalized = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(normalized) ? normalized : 0);
};

const formatPercent = (value: number | string | null | undefined) => {
  const normalized = Number(value ?? 0);
  return `${percentFormatter.format(Number.isFinite(normalized) ? normalized : 0)}%`;
};

const formatScore = (value: number | string | null | undefined) => {
  const normalized = Number(value ?? 0);
  return scoreFormatter.format(Number.isFinite(normalized) ? normalized : 0);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateTimeFormatter.format(date);
};

export const ReportsTab: React.FC<ReportsTabProps> = React.memo(
  ({ isPro, setShowUpgradeModal }) => {
    const tenantInfo = useDashboardStore((state) => state.tenantInfo);
    const scorecardEnabled =
      tenantInfo?.resolvedFeatures?.vendor_scorecard !== false;
    const monthlyAcceptanceEnabled =
      tenantInfo?.resolvedFeatures?.monthly_acceptance_report !== false;
    const vendorManagementEnabled =
      tenantInfo?.resolvedFeatures?.vendor_management !== false;
    const canLoadReports =
      isPro && scorecardEnabled && monthlyAcceptanceEnabled;
    const canLoadVendors = canLoadReports && vendorManagementEnabled;
    const [month, setMonth] = useState(getCurrentMonth);
    const [vendorId, setVendorId] = useState("");
    const [vendors, setVendors] = useState<VendorOption[]>([]);
    const [scorecards, setScorecards] = useState<VendorScorecardRecord[]>([]);
    const [reports, setReports] = useState<MonthlyAcceptanceReportRecord[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [loadingReports, setLoadingReports] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [featureDependencyMissing, setFeatureDependencyMissing] =
      useState(false);
    const [selectedReport, setSelectedReport] = useState<MonthlyAcceptanceReportRecord | null>(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

    const isFeatureBlocked = !canLoadReports || featureDependencyMissing;

    const vendorMap = useMemo(() => {
      return new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
    }, [vendors]);

    const loadVendors = async () => {
      if (!canLoadVendors) {
        setVendors([]);
        return;
      }

      setLoadingVendors(true);
      try {
        const payload = await apiFetch<any>("/api/admin/vendors?limit=100", {
          suppressErrorToast: true,
        });
        setFeatureDependencyMissing(false);
        setVendors(
          unwrapCollection<VendorOption>(payload).filter(
            (vendor) => vendor?.id && vendor?.name,
          ),
        );
      } catch (error: any) {
        if (
          error?.status === 403 &&
          error?.message === "FEATURE_DEPENDENCY_MISSING"
        ) {
          setFeatureDependencyMissing(true);
        }
        setVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };

    const loadComplianceData = async () => {
      if (!canLoadReports) {
        setScorecards([]);
        setReports([]);
        return;
      }

      setLoadingReports(true);
      try {
        const params = new URLSearchParams({ month, limit: "50" });
        if (vendorId) params.set("vendorId", vendorId);

        const [scorecardPayload, reportPayload] = await Promise.all([
          apiFetch<any>(`/api/tenant/vendor-scorecards?${params.toString()}`, {
            suppressErrorToast: true,
          }),
          apiFetch<any>(
            `/api/tenant/monthly-acceptance-reports?${params.toString()}`,
            { suppressErrorToast: true },
          ),
        ]);

        setFeatureDependencyMissing(false);
        setScorecards(
          unwrapCollection<VendorScorecardRecord>(scorecardPayload),
        );
        setReports(
          unwrapCollection<MonthlyAcceptanceReportRecord>(reportPayload),
        );
      } catch (error: any) {
        if (
          error?.status === 403 &&
          (error?.message === "FEATURE_DEPENDENCY_MISSING" ||
            error?.message === "FEATURE_DISABLED")
        ) {
          setFeatureDependencyMissing(
            error?.message === "FEATURE_DEPENDENCY_MISSING",
          );
          setScorecards([]);
          setReports([]);
          return;
        }
        throw error;
      } finally {
        setLoadingReports(false);
      }
    };

    useEffect(() => {
      void loadVendors();
    }, [canLoadVendors]);

    useEffect(() => {
      void loadComplianceData();
    }, [canLoadReports, month, vendorId]);

    const handleGenerateReport = async () => {
      if (!vendorId) return;
      setGenerating(true);
      try {
        await apiFetch("/api/tenant/monthly-acceptance-reports/generate", {
          method: "POST",
          body: JSON.stringify({ month, vendorId }),
        });
        await loadComplianceData();
      } finally {
        setGenerating(false);
      }
    };

    const handleFinalizeReport = async (reportId: string) => {
      try {
        await apiFetch(
          `/api/tenant/monthly-acceptance-reports/${reportId}/finalize`,
          {
            method: "POST",
            body: JSON.stringify({
              notes: "Finalized from Command Center report workspace",
            }),
          },
        );
        await loadComplianceData();
      } finally {
      }
    };

    const handleCreateRevision = async (reportId: string) => {
      try {
        await apiFetch(
          `/api/tenant/monthly-acceptance-reports/${reportId}/revisions`,
          {
            method: "POST",
            body: JSON.stringify({
              notes: "Revision created from report workspace",
            }),
          },
        );
        await loadComplianceData();
      } finally {
      }
    };

    const handleQueueExport = async (
      reportId: string,
      format: "pdf" | "excel",
    ) => {
      try {
        await apiFetch(
          `/api/tenant/monthly-acceptance-reports/${reportId}/export`,
          {
            method: "POST",
            body: JSON.stringify({ format }),
          },
        );
        await loadComplianceData();
      } finally {
      }
    };

    const handleDownloadArtifact = async (
      reportId: string,
      attachmentId: string,
      format: "pdf" | "excel",
    ) => {
      try {
        const blob = await apiFetch<Blob>(
          `/api/tenant/monthly-acceptance-reports/${reportId}/artifacts/${attachmentId}/download`,
          { responseType: "blob" },
        );
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `monthly-acceptance-${reportId}.${format === "pdf" ? "pdf" : LEGACY_EXCEL_EXTENSION}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(objectUrl);
      } finally {
      }
    };

    const complianceSummary = useMemo(() => {
      const finalizedReports = reports.filter((r) => r.status === "FINALIZED").length;
      const draftReports = reports.filter((r) => r.status !== "FINALIZED" && r.status !== "SUPERSEDED").length;
      
      return {
        scorecards: scorecards.length,
        reports: reports.length,
        finalizedReports,
        draftReports,
        totalPenalty: reports.reduce(
          (sum, report) => sum + Number(report.totalPenaltyAmount ?? 0),
          0,
        ),
        pendingViolations: reports.reduce(
          (sum, report) => sum + Number(report.totalPendingViolations ?? 0),
          0,
        ),
      };
    }, [reports, scorecards]);

    const openReportDetail = (report: MonthlyAcceptanceReportRecord) => {
      setSelectedReport(report);
      setIsDetailDrawerOpen(true);
    };

    const matchingScorecard = useMemo(() => {
      if (!selectedReport) return null;
      return scorecards.find(s => s.vendorId === selectedReport.vendorId && s.month === selectedReport.month);
    }, [selectedReport, scorecards]);

    if (isFeatureBlocked) {
      return (
        <FeatureLock
          title="Báo cáo nghiệm thu và scorecard vendor"
          description={
            featureDependencyMissing
              ? "Tenant đang thiếu feature phụ thuộc trong Feature Flag Matrix nên backend chặn truy cập để giữ nhất quán."
              : "Tenant chưa bật Vendor Scorecard hoặc Monthly Acceptance Report."
          }
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Khu vực 1: Top Bar & Filters */}
        <DashboardPageHeader
          title="Đối soát & Nghiệm thu"
          eyebrow="Compliance reporting"
          description="Trung tâm điều hành đối soát chất lượng nhà thầu, quản lý vi phạm và chốt báo cáo nghiệm thu tháng."
        />

        <DashboardToolbarRow>
          <DashboardFilterGroup>
            <label className="min-w-[170px] flex-1">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                Kỳ đối soát
              </span>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className={dashboardInputClass}
              />
            </label>
            <label className="min-w-[210px] flex-1">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                Nhà thầu
              </span>
              <select
                value={vendorId}
                onChange={(event) => setVendorId(event.target.value)}
                className={dashboardSelectClass}
                disabled={loadingVendors}
              >
                <option value="">Tất cả nhà thầu</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </label>
          </DashboardFilterGroup>
          <SCMDButton variant="ghost" onClick={() => void loadComplianceData()} className="h-10 rounded-xl px-4 border-white/10" disabled={loadingReports}>
            {loadingReports ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          </SCMDButton>
          <SCMDButton onClick={handleGenerateReport} disabled={!vendorId || generating} className="h-10 rounded-xl px-5 bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
            <span className="ml-2 font-black uppercase tracking-widest text-[11px]">Tạo báo cáo tháng</span>
          </SCMDButton>
        </DashboardToolbarRow>

        {/* Khu vực 2: Micro-KPIs */}
        <DashboardMetricGrid className="md:grid-cols-4">
          <DashboardMetricCard
            label="Scorecard"
            value={complianceSummary.scorecards}
            description="Bản ghi trong kỳ lọc"
            icon={<BarChart3 size={18} />}
          />
          <DashboardMetricCard
            label="Báo cáo"
            value={complianceSummary.reports}
            description={`${complianceSummary.finalizedReports} đã chốt / ${complianceSummary.draftReports} đang xử lý`}
            icon={<FileCheck2 size={18} />}
            tone={complianceSummary.draftReports > 0 ? "warning" : "success"}
          />
          <DashboardMetricCard
            label="Phạt đề xuất"
            value={formatCurrency(complianceSummary.totalPenalty)}
            description="Tổng theo bộ lọc hiện tại"
            tone={complianceSummary.totalPenalty > 0 ? "danger" : "success"}
          />
          <DashboardMetricCard
            label="Vi phạm chờ xử lý"
            value={complianceSummary.pendingViolations}
            description="Cần review trước nghiệm thu"
            tone={complianceSummary.pendingViolations > 0 ? "warning" : "success"}
          />
        </DashboardMetricGrid>

        {/* Khu vực 3: Main Data - Single Source of Truth Table */}
        <div className="flex-1">
          <section className="rounded-2xl border border-white/5 bg-slate-900/20 overflow-hidden">
            <div className="bg-white/[0.02] px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[12px] font-black uppercase tracking-wider text-slate-400">Bảng báo cáo nghiệm thu tháng</h3>
              <span className="text-[10px] font-bold text-slate-500">{reports.length} bản ghi</span>
            </div>
            <div className="overflow-x-auto">
              <table className={cn(opsTableClass, "w-full")}>
                <thead>
                  <tr>
                    <th className={opsThClass}>Kỳ / Phiên bản</th>
                    <th className={opsThClass}>Nhà thầu</th>
                    <th className={opsThClass}>Trạng thái</th>
                    <th className={opsThClass}>Tổng phạt</th>
                    <th className={opsThClass}>Xác nhận / Pending</th>
                    <th className={cn(opsThClass, "text-right")}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-500 text-xs italic">Chưa có dữ liệu báo cáo</td></tr>
                  ) : (
                    reports.map(report => (
                      <tr key={report.id} className={cn(opsRowClass, "cursor-pointer")} onClick={() => openReportDetail(report)}>
                        <td className={opsTdClass}>
                          <span className="font-bold text-white uppercase">{report.month}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5">Rev.{report.revisionNumber ?? 1}</span>
                        </td>
                        <td className={cn(opsTdClass, "font-bold text-slate-300")}>{vendorMap.get(report.vendorId) || report.vendorId}</td>
                        <td className={opsTdClass}><OpsStatusBadge value={report.status} /></td>
                        <td className={cn(opsTdClass, "font-mono text-amber-400 font-bold")}>{formatCurrency(report.totalPenaltyAmount)}</td>
                        <td className={opsTdClass}>{report.totalConfirmedViolations} / {report.totalPendingViolations}</td>
                        <td className={cn(opsTdClass, "text-right")}>
                          <OpsIconButton label="Chi tiết" onClick={() => openReportDetail(report)}><ChevronRight size={14} /></OpsIconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right-side Detail Drawer (Master-Detail Flow) */}
        <AnimatePresence>
          {isDetailDrawerOpen && selectedReport && (
            <div className="fixed inset-0 z-[110] flex justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailDrawerOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) setIsDetailDrawerOpen(false);
              }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative flex h-full w-full sm:max-w-xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Quản lý Báo cáo</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{vendorMap.get(selectedReport.vendorId)} · {selectedReport.month}</p>
                  </div>
                  <button onClick={() => setIsDetailDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Section 1: Scorecard Basis - Chuyển từ màn hình chính vào đây */}
                {matchingScorecard && (
                  <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <Target size={14} /> Cơ sở tính toán (Scorecard)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Điểm hiệu suất</p>
                            <p className="text-3xl font-black text-white mt-1">{formatScore(matchingScorecard.totalScore)}</p>
                          </div>
                          <div className="text-right space-y-1">
                             <p className="text-[10px] font-medium text-slate-400">Tuần tra: {formatPercent(matchingScorecard.patrolRate)}</p>
                             <p className="text-[10px] font-medium text-slate-400">Sự cố: {formatPercent(matchingScorecard.incidentRate)}</p>
                             <p className="text-[10px] font-medium text-slate-400">Kỷ luật: {formatPercent(matchingScorecard.disciplineRate)}</p>
                          </div>
                       </div>
                    </div>
                  </section>
                )}

                  <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Kết quả nghiệm thu</h3>
                    <div className="grid grid-cols-2 gap-3">
                       <Metric label="Thời điểm chốt" value={formatDateTime(selectedReport.finalizedAt) || 'Chưa chốt'} />
                       <Metric label="Người tạo" value="Hệ thống" />
                       <Metric label="Vi phạm xác nhận" value={selectedReport.totalConfirmedViolations} />
                       <Metric label="Vi phạm tranh chấp" value={selectedReport.disputes?.length || 0} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Hành động khả dụng</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedReport.status !== "FINALIZED" ? (
                        <SCMDButton onClick={() => handleFinalizeReport(selectedReport.id)} className="h-12 bg-emerald-600 text-white"><Shield size={16} /> Chốt báo cáo</SCMDButton>
                      ) : (
                        <SCMDButton variant="ghost" onClick={() => handleCreateRevision(selectedReport.id)} className="h-12 border-white/10 text-slate-300"><RefreshCcw size={16} /> Tạo Revision</SCMDButton>
                      )}
                      <SCMDButton variant="ghost" onClick={() => handleQueueExport(selectedReport.id, "pdf")} className="h-12 border-white/10 text-slate-300"><Printer size={16} /> Xuất PDF</SCMDButton>
                    </div>
                  </section>

                  {selectedReport.exportPdfAttachmentId && (
                    <section className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <FileDown className="text-blue-400" size={20} />
                         <div>
                           <p className="text-sm font-bold text-white">Bản in sẵn sàng</p>
                           <p className="text-[10px] text-slate-500">Đã generate PDF artifact</p>
                         </div>
                       </div>
                       <SCMDButton variant="ghost" size="sm" onClick={() => handleDownloadArtifact(selectedReport.id, selectedReport.exportPdfAttachmentId!, "pdf")} className="text-blue-400">Tải xuống</SCMDButton>
                    </section>
                  )}
                </div>

                <div className="p-6 bg-slate-900/50 border-t border-white/10">
                   <p className="text-[10px] text-slate-500 italic">Mọi thay đổi đều được ghi nhật ký hệ thống (Audit Log).</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

const Metric = ({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) => (
  <div className="rounded-[10px] border border-white/8 bg-white/[0.025] px-3 py-2">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-white">{value}</p>
  </div>
);
