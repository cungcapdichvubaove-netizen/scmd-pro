import React, { useEffect, useMemo, useState } from 'react';
import { Eye, FileWarning, RefreshCcw } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  OpsDetailDrawer,
  OpsDetailGrid,
  OpsIconButton,
  OpsSavedViews,
  OpsStatusBadge,
  opsPanelClass,
  opsRowClass,
  opsTableClass,
  opsTdClass,
  opsThClass,
} from './OpsTableSystem';

type Severity = 'critical' | 'warning' | 'ok';

type ViolationRow = {
  id: string;
  severity: Severity;
  code: string;
  type: string;
  site: string;
  vendor: string;
  contract: string;
  time?: string;
  evidence: number;
  status: string;
  summary: string;
};

const formatTime = (value?: string) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const severityOf = (value?: string): Severity => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized.includes('BREACH') || normalized.includes('OVERDUE')) return 'critical';
  if (normalized === 'WARNING' || normalized === 'MEDIUM' || normalized.includes('DUE') || normalized.includes('PENDING')) return 'warning';
  return 'ok';
};

const severityStatus = (severity: Severity) => (severity === 'critical' ? 'HIGH' : severity === 'warning' ? 'WARNING' : 'OK');

const BulkBar = ({ selectedCount, onClear, children }: { selectedCount: number; onClear: () => void; children: React.ReactNode }) => {
  if (selectedCount === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-b border-white/8 bg-blue-500/[0.045] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] font-semibold text-blue-100">Đã chọn {selectedCount} dòng để xử lý hàng loạt.</p>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <button type="button" onClick={onClear} className="h-8 rounded-[9px] border border-white/10 px-3 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.05]">
          Bỏ chọn
        </button>
      </div>
    </div>
  );
};

const EmptyRow = ({ colSpan, title, description }: { colSpan: number; title: string; description: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center">
      <FileWarning size={26} className="mx-auto text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-[12px] text-slate-500">{description}</p>
    </td>
  </tr>
);

const TableShell = ({ title, description, children, right }: { title: string; description: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className={opsPanelClass}>
    <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        <p className="mt-1 text-[12px] text-slate-500">{description}</p>
      </div>
      {right}
    </div>
    {children}
  </section>
);


const PaginationBar = ({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col gap-2 border-t border-white/8 px-4 py-3 text-[12px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>Hiển thị {start}-{end} / {total} dòng</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-8 rounded-[9px] border border-white/10 px-3 font-semibold text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
        <span className="font-semibold text-slate-300">Trang {page}/{totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-8 rounded-[9px] border border-white/10 px-3 font-semibold text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
      </div>
    </div>
  );
};

const detailText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Chưa rõ';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

export const ViolationsMainTable: React.FC<{
  onFeedback?: (alertId: string, verdict: unknown, notes?: string) => void;
  onExportReport?: () => void;
}> = ({ onFeedback, onExportReport }) => {
  const { anomalies, nocFeed } = useDashboardStore(
    useShallow((state) => ({ anomalies: state.anomalies, nocFeed: state.nocFeed })),
  );
  const rows = useMemo<ViolationRow[]>(() => {
    const anomalyRows = (Array.isArray(anomalies) ? anomalies : []).map((item: any, index) => ({
      id: String(item?.id ?? `anomaly-${index}`),
      severity: severityOf(item?.severity),
      code: item?.code ?? item?.type ?? 'WATCHER',
      type: item?.type ?? item?.category ?? 'Bất thường',
      site: item?.siteName ?? item?.locationName ?? 'Chưa gắn mục tiêu',
      vendor: item?.vendorName ?? item?.owner ?? 'Đội vận hành',
      contract: item?.contractCode ?? item?.contractId ?? 'Chưa gắn hợp đồng',
      time: item?.timestamp ?? item?.createdAt,
      evidence: item?.evidenceCount ?? item?.evidences?.length ?? 0,
      status: item?.reviewStatus ?? item?.status ?? 'NEW',
      summary: item?.reason ?? item?.summary ?? item?.message ?? 'Cần review trước khi đưa vào đối soát.',
    }));
    const feedRows = (Array.isArray(nocFeed) ? nocFeed : [])
      .filter((item: any) => String(item?.status || '').toUpperCase() !== 'OK')
      .map((item: any, index) => ({
        id: String(item?.id ?? `feed-${index}`),
        severity: severityOf(item?.status),
        code: item?.type ?? 'NOC',
        type: item?.title ?? item?.type ?? 'Tín hiệu NOC',
        site: item?.siteName ?? item?.locationName ?? item?.subtitle ?? 'Command center',
        vendor: item?.vendorName ?? item?.owner ?? 'Đội vận hành',
        contract: item?.contractCode ?? 'Chưa gắn hợp đồng',
        time: item?.timestamp,
        evidence: item?.evidenceCount ?? 0,
        status: 'NEW',
        summary: item?.message ?? item?.subtitle ?? 'Tín hiệu cần xác minh.',
      }));
    const rank: Record<Severity, number> = { critical: 3, warning: 2, ok: 1 };
    return [...anomalyRows, ...feedRows].sort((a, b) => (rank[b.severity] - rank[a.severity]) || new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
  }, [anomalies, nocFeed]);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailRow, setDetailRow] = useState<ViolationRow | null>(null);
  const pageSize = 25;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); setSelected([]); }, [rows.length]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <>
      <TableShell
        title="Bảng review vi phạm dịch vụ"
        description="Bảng chính để xác nhận, miễn trừ hoặc đưa vi phạm vào báo cáo đối soát/phạt nhà thầu."
        right={<button type="button" onClick={onExportReport} className="h-9 rounded-[10px] border border-white/10 px-3 text-[12px] font-semibold text-slate-300 hover:bg-white/[0.05]">Xuất báo cáo</button>}
      >
        <OpsSavedViews storageKey="scmd.ops.views.violations" defaultViews={["Tất cả", "Cao", "Chờ review", "Thiếu bằng chứng"]} />
        <BulkBar selectedCount={selected.length} onClear={() => setSelected([])}>
          <button type="button" onClick={() => selected.forEach((id) => onFeedback?.(id, 'ACCEPTED', 'Bulk accept from violation table'))} className="h-8 rounded-[9px] bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500">Xác nhận vi phạm</button>
          <button type="button" onClick={() => selected.forEach((id) => onFeedback?.(id, 'WAIVED', 'Bulk waive from violation table'))} className="h-8 rounded-[9px] border border-amber-400/20 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/16">Miễn trừ</button>
        </BulkBar>
        <div className="overflow-x-auto">
          <table className={cn(opsTableClass, 'min-w-[1160px]')}>
            <thead className="bg-slate-950/30">
              <tr>
                <th className={cn(opsThClass, 'w-10')}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : pageRows.map((row) => row.id))} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></th>
                <th className={opsThClass}>Mức độ</th>
                <th className={opsThClass}>Mã / loại</th>
                <th className={opsThClass}>Site</th>
                <th className={opsThClass}>Vendor</th>
                <th className={opsThClass}>Hợp đồng</th>
                <th className={opsThClass}>Thời điểm</th>
                <th className={opsThClass}>Bằng chứng</th>
                <th className={opsThClass}>Review</th>
                <th className={opsThClass}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? <EmptyRow colSpan={10} title="Chưa có vi phạm cần review" description="Không có cảnh báo Watcher/NOC phù hợp với dữ liệu hiện tại." /> : pageRows.map((row) => (
                <tr key={row.id} className={cn(opsRowClass, selected.includes(row.id) && 'bg-blue-500/[0.045]')}>
                  <td className={opsTdClass}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></td>
                  <td className={opsTdClass}><OpsStatusBadge value={severityStatus(row.severity)} /></td>
                  <td className={opsTdClass}><p className="font-semibold text-white">{row.code}</p><p className="mt-1 max-w-[260px] truncate text-[11px] text-slate-500">{row.type} · {row.summary}</p></td>
                  <td className={opsTdClass}>{row.site}</td>
                  <td className={opsTdClass}>{row.vendor}</td>
                  <td className={opsTdClass}>{row.contract}</td>
                  <td className={opsTdClass}>{formatTime(row.time)}</td>
                  <td className={opsTdClass}>{row.evidence}</td>
                  <td className={opsTdClass}><OpsStatusBadge value={row.status} /></td>
                  <td className={opsTdClass}><OpsIconButton label="Mở khay review" onClick={() => setDetailRow(row)}><Eye size={14} /></OpsIconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </TableShell>
      <OpsDetailDrawer
        open={Boolean(detailRow)}
        title={detailRow?.code ?? 'Chi tiết vi phạm'}
        subtitle={detailRow?.summary}
        onClose={() => setDetailRow(null)}
        actions={detailRow ? (
          <>
            <button type="button" onClick={() => { onFeedback?.(detailRow.id, 'ACCEPTED', 'Drawer accept'); setDetailRow(null); }} className="h-9 rounded-[10px] bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-500">Xác nhận vi phạm</button>
            <button type="button" onClick={() => { onFeedback?.(detailRow.id, 'WAIVED', 'Drawer waive'); setDetailRow(null); }} className="h-9 rounded-[10px] border border-amber-400/20 bg-amber-500/10 px-3 text-[12px] font-semibold text-amber-100 hover:bg-amber-500/16">Miễn trừ</button>
          </>
        ) : null}
      >
        {detailRow ? <OpsDetailGrid items={[
          { label: 'Mức độ', value: <OpsStatusBadge value={severityStatus(detailRow.severity)} /> },
          { label: 'Loại vi phạm', value: detailRow.type },
          { label: 'Site', value: detailRow.site },
          { label: 'Vendor', value: detailRow.vendor },
          { label: 'Hợp đồng', value: detailRow.contract },
          { label: 'Thời điểm', value: formatTime(detailRow.time) },
          { label: 'Bằng chứng', value: detailRow.evidence },
          { label: 'Trạng thái', value: <OpsStatusBadge value={detailRow.status} /> },
        ]} /> : null}
      </OpsDetailDrawer>
    </>
  );
};

export const IncidentsMainTable: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<any>('/api/tenant/incidents?limit=25&sortBy=date&sortOrder=desc');
      setRows(Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải sự cố.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRows(); }, []);
  const pageSize = 25;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); setSelected([]); }, [rows.length]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <>
      <TableShell
        title="Bảng điều phối sự cố & SLA"
        description="Bảng chính để quét nhanh sự cố mở, trạng thái SLA, owner, vendor, site và bằng chứng."
        right={<button type="button" onClick={() => void fetchRows()} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 px-3 text-[12px] font-semibold text-slate-300 hover:bg-white/[0.05]"><RefreshCcw size={14} className={loading ? 'animate-spin' : undefined} />Làm mới</button>}
      >
        <OpsSavedViews storageKey="scmd.ops.views.incidents" defaultViews={["Tất cả", "Quá SLA", "Chờ nhà thầu", "Chưa phân công"]} />
        <BulkBar selectedCount={selected.length} onClear={() => setSelected([])}>
          <button type="button" className="h-8 rounded-[9px] bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500">Giao xử lý</button>
          <button type="button" className="h-8 rounded-[9px] border border-amber-400/20 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/16">Yêu cầu bằng chứng</button>
        </BulkBar>
        <div className="overflow-x-auto">
          <table className={cn(opsTableClass, 'min-w-[1160px]')}>
            <thead className="bg-slate-950/30">
              <tr>
                <th className={cn(opsThClass, 'w-10')}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : pageRows.map((row) => row.id))} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></th>
                <th className={opsThClass}>Mức độ</th>
                <th className={opsThClass}>Sự cố</th>
                <th className={opsThClass}>Site</th>
                <th className={opsThClass}>Vendor</th>
                <th className={opsThClass}>Hợp đồng</th>
                <th className={opsThClass}>SLA</th>
                <th className={opsThClass}>Owner</th>
                <th className={opsThClass}>Trạng thái</th>
                <th className={opsThClass}>Bằng chứng</th>
                <th className={opsThClass}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {error ? <EmptyRow colSpan={11} title="Không thể tải sự cố" description={error} /> : rows.length === 0 ? <EmptyRow colSpan={11} title={loading ? 'Đang tải sự cố...' : 'Chưa có sự cố'} description="Không có sự cố phù hợp hoặc dữ liệu đang được đồng bộ." /> : pageRows.map((row) => {
                const severity = severityOf(row?.severity || (row?.slaBreached ? 'BREACH' : ''));
                return (
                  <tr key={row.id} className={cn(opsRowClass, selected.includes(row.id) && 'bg-blue-500/[0.045]')}>
                    <td className={opsTdClass}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></td>
                    <td className={opsTdClass}><OpsStatusBadge value={severityStatus(severity)} /></td>
                    <td className={opsTdClass}><p className="font-semibold text-white">{row?.type || 'Sự cố'}</p><p className="mt-1 max-w-[260px] truncate text-[11px] text-slate-500">{row?.description || row?.id}</p></td>
                    <td className={opsTdClass}>{row?.site?.siteName || row?.siteName || row?.siteId || 'Chưa gắn site'}</td>
                    <td className={opsTdClass}>{row?.vendor?.name || row?.vendorName || row?.vendorId || 'Chưa gắn vendor'}</td>
                    <td className={opsTdClass}>{row?.contract?.contractCode || row?.contractCode || row?.contractId || 'Chưa gắn hợp đồng'}</td>
                    <td className={opsTdClass}>{row?.slaBreached ? 'Quá hạn' : row?.resolutionDueAt ? `Hạn ${formatTime(row.resolutionDueAt)}` : 'Theo rule'}</td>
                    <td className={opsTdClass}>{row?.assignee?.fullName || row?.assignedToName || 'Chưa phân công'}</td>
                    <td className={opsTdClass}><OpsStatusBadge value={row?.status} /></td>
                    <td className={opsTdClass}>{row?.evidences?.length ?? row?.resolutionImages?.length ?? 0}</td>
                    <td className={opsTdClass}><OpsIconButton label="Mở chi tiết sự cố" onClick={() => setDetailRow(row)}><Eye size={14} /></OpsIconButton></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </TableShell>
      <OpsDetailDrawer
        open={Boolean(detailRow)}
        title={detailRow?.type || 'Chi tiết sự cố'}
        subtitle={detailRow?.description || detailRow?.id}
        onClose={() => setDetailRow(null)}
        actions={detailRow ? (
          <>
            <button type="button" className="h-9 rounded-[10px] bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-500">Giao xử lý</button>
            <button type="button" className="h-9 rounded-[10px] border border-amber-400/20 bg-amber-500/10 px-3 text-[12px] font-semibold text-amber-100 hover:bg-amber-500/16">Yêu cầu bằng chứng</button>
          </>
        ) : null}
      >
        {detailRow ? <OpsDetailGrid items={[
          { label: 'Mức độ', value: <OpsStatusBadge value={severityStatus(severityOf(detailRow?.severity || (detailRow?.slaBreached ? 'BREACH' : '')))} /> },
          { label: 'Site', value: detailRow?.site?.siteName || detailRow?.siteName || detailRow?.siteId || 'Chưa gắn site' },
          { label: 'Vendor', value: detailRow?.vendor?.name || detailRow?.vendorName || detailRow?.vendorId || 'Chưa gắn vendor' },
          { label: 'Hợp đồng', value: detailRow?.contract?.contractCode || detailRow?.contractCode || detailRow?.contractId || 'Chưa gắn hợp đồng' },
          { label: 'SLA', value: detailRow?.slaBreached ? 'Quá hạn' : detailRow?.resolutionDueAt ? `Hạn ${formatTime(detailRow.resolutionDueAt)}` : 'Theo rule' },
          { label: 'Owner', value: detailRow?.assignee?.fullName || detailRow?.assignedToName || 'Chưa phân công' },
          { label: 'Trạng thái', value: <OpsStatusBadge value={detailRow?.status} /> },
          { label: 'Bằng chứng', value: detailRow?.evidences?.length ?? detailRow?.resolutionImages?.length ?? 0 },
        ]} /> : null}
      </OpsDetailDrawer>
    </>
  );
};

export const TasksMainTable: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any>('/api/tenant/tasks');
      setRows(Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchRows(); }, []);
  const pageSize = 25;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); setSelected([]); }, [rows.length]);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const isOverdue = (row: any) => row?.dueDate && row?.status !== 'COMPLETED' && new Date(row.dueDate).getTime() < Date.now();

  return (
    <>
      <TableShell
        title="Bảng nhiệm vụ xử lý"
        description="Bảng chính để theo dõi owner, deadline, SLA và trạng thái đóng việc từ sự cố/vi phạm/audit."
        right={onCreate ? <button type="button" onClick={onCreate} className="h-9 rounded-[10px] bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-500">Tạo nhiệm vụ</button> : null}
      >
        <OpsSavedViews storageKey="scmd.ops.views.tasks" defaultViews={["Tất cả", "Quá hạn", "Của tôi", "Đang chặn"]} />
        <BulkBar selectedCount={selected.length} onClear={() => setSelected([])}>
          <button type="button" className="h-8 rounded-[9px] bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500">Chuyển owner</button>
          <button type="button" className="h-8 rounded-[9px] border border-emerald-400/20 bg-emerald-500/10 px-3 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/16">Đánh dấu hoàn tất</button>
        </BulkBar>
        <div className="overflow-x-auto">
          <table className={cn(opsTableClass, 'min-w-[1080px]')}>
            <thead className="bg-slate-950/30">
              <tr>
                <th className={cn(opsThClass, 'w-10')}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : pageRows.map((row) => row.id))} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></th>
                <th className={opsThClass}>Ưu tiên</th>
                <th className={opsThClass}>Nhiệm vụ</th>
                <th className={opsThClass}>Nguồn</th>
                <th className={opsThClass}>Site/Vendor</th>
                <th className={opsThClass}>Owner</th>
                <th className={opsThClass}>Deadline</th>
                <th className={opsThClass}>SLA</th>
                <th className={opsThClass}>Trạng thái</th>
                <th className={opsThClass}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <EmptyRow colSpan={10} title={loading ? 'Đang tải nhiệm vụ...' : 'Chưa có nhiệm vụ'} description="Nhiệm vụ sẽ phát sinh từ sự cố, vi phạm, audit hoặc tạo thủ công." /> : pageRows.map((row) => (
                <tr key={row.id} className={cn(opsRowClass, selected.includes(row.id) && 'bg-blue-500/[0.045]')}>
                  <td className={opsTdClass}><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></td>
                  <td className={opsTdClass}><OpsStatusBadge value={row?.priority || 'LOW'} /></td>
                  <td className={opsTdClass}><p className="font-semibold text-white">{row?.title || 'Nhiệm vụ'}</p><p className="mt-1 max-w-[300px] truncate text-[11px] text-slate-500">{row?.description || 'Không có mô tả'}</p></td>
                  <td className={opsTdClass}>{row?.sourceType || row?.source || 'Manual'}</td>
                  <td className={opsTdClass}>{row?.siteName || row?.vendorName || 'Chưa gắn'}</td>
                  <td className={opsTdClass}>{row?.assignee?.fullName || row?.assigneeName || row?.assigneeId || 'Chưa phân công'}</td>
                  <td className={opsTdClass}>{formatTime(row?.dueDate)}</td>
                  <td className={opsTdClass}><OpsStatusBadge value={isOverdue(row) ? 'OVERDUE' : 'OK'} /></td>
                  <td className={opsTdClass}><OpsStatusBadge value={row?.status} /></td>
                  <td className={opsTdClass}><OpsIconButton label="Mở chi tiết nhiệm vụ" onClick={() => setDetailRow(row)}><Eye size={14} /></OpsIconButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      </TableShell>
      <OpsDetailDrawer
        open={Boolean(detailRow)}
        title={detailRow?.title || 'Chi tiết nhiệm vụ'}
        subtitle={detailRow?.description || detailRow?.id}
        onClose={() => setDetailRow(null)}
        actions={detailRow ? (
          <>
            <button type="button" className="h-9 rounded-[10px] bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-500">Chuyển owner</button>
            <button type="button" className="h-9 rounded-[10px] border border-emerald-400/20 bg-emerald-500/10 px-3 text-[12px] font-semibold text-emerald-100 hover:bg-emerald-500/16">Đánh dấu hoàn tất</button>
          </>
        ) : null}
      >
        {detailRow ? <OpsDetailGrid items={[
          { label: 'Ưu tiên', value: <OpsStatusBadge value={detailRow?.priority || 'LOW'} /> },
          { label: 'Nguồn', value: detailText(detailRow?.sourceType || detailRow?.source || 'Manual') },
          { label: 'Site/Vendor', value: detailText(detailRow?.siteName || detailRow?.vendorName || 'Chưa gắn') },
          { label: 'Owner', value: detailText(detailRow?.assignee?.fullName || detailRow?.assigneeName || detailRow?.assigneeId || 'Chưa phân công') },
          { label: 'Deadline', value: formatTime(detailRow?.dueDate) },
          { label: 'SLA', value: <OpsStatusBadge value={isOverdue(detailRow) ? 'OVERDUE' : 'OK'} /> },
          { label: 'Trạng thái', value: <OpsStatusBadge value={detailRow?.status} /> },
          { label: 'Mã nhiệm vụ', value: detailText(detailRow?.id) },
        ]} /> : null}
      </OpsDetailDrawer>
    </>
  );
};
