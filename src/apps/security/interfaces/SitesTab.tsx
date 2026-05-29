import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  QrCode,
  Search,
  Sparkles,
  X,
  Target,
  Trash2,
  Zap,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { getAuthHeaders } from '../../common/utils/auth';
import {
  DashboardErrorState,
  DashboardMetricCard,
  DashboardMetricGrid,
  DashboardSpinner,
  dashboardTabButtonClass,
  dashboardInputClass,
} from '../../common/interfaces/components/DashboardUI';
import { BenchmarkLearningMode } from './components/BenchmarkLearningMode';
import { TacticalMap, type MapPoint } from './components/TacticalMap';
import { AdminBenchmarkRecorder } from './AdminBenchmarkRecorder';
import type { AttendanceOpsSummary } from './AttendanceTab';
import type { Checkpoint, CheckItem, PatrolRoute } from './types';
import { opsTableClass, opsThClass, opsTdClass, opsRowClass, OpsStatusBadge, OpsIconButton, opsPanelClass } from './components/OpsTableSystem';

interface SitesTabProps {
  contextualFilters?: Record<string, string>;
  checkpoints: Checkpoint[];
  checkpointsNextCursor: string | null;
  hasMoreCheckpoints: boolean;
  loadMoreCheckpoints: () => void;
  loadingMoreCheckpoints: boolean;
  routes: PatrolRoute[];
  editingCheckpoint: Checkpoint | null;
  newCheckpoint: { name: string; qr_hash: string; latitude: number; longitude: number; check_items: CheckItem[] };
  isSubmitting: boolean;
  siteSubTab: 'manage' | 'benchmark' | 'field' | 'map';
  setSiteSubTab: (v: 'manage' | 'benchmark' | 'field' | 'map') => void;
  setCheckpoints: React.Dispatch<React.SetStateAction<Checkpoint[]>>;
  setNewCheckpoint: React.Dispatch<
    React.SetStateAction<{ name: string; qr_hash: string; latitude: number; longitude: number; check_items: CheckItem[] }>
  >;
  setShowConfirmModal: (v: { id: string; type: 'checkpoint' | 'staff' | 'route'; name: string } | null) => void;
  setShowQRModal: (v: Checkpoint | null) => void;
  setMessage: (v: { text: string; type: 'success' | 'error' } | null) => void;
  setActiveTab: (tab: any) => void;
  startEditingCheckpoint: (cp: Checkpoint) => void;
  cancelEditing: () => void;
  handleAddCheckpoint: (e: React.FormEvent) => void;
  addCheckItem: () => void;
  removeCheckItem: (id: string) => void;
  updateCheckItem: (id: string, updates: Partial<CheckItem>) => void;
}

type SiteRecord = {
  id: string;
  siteName: string;
  status?: string;
  type?: string | null;
  siteType?: string | null;
  vendorId?: string | null;
  vendor?: { id: string; name: string; status?: string | null; riskLevel?: string | null } | null;
  guardPosts?: Array<{ id: string; postName: string; status?: string | null; requiredGuardCount?: number | null }>;
  contracts?: Array<{ id: string; contractName?: string | null; contractCode?: string | null; vendorId?: string | null; status?: string | null }>;
};

type ContractRecord = {
  id: string;
  contractName?: string;
  contractCode?: string;
  vendorId?: string | null;
  siteId?: string;
  status: string;
};

type AssignmentRecord = {
  id: string;
  status: string;
  route?: { id?: string; name?: string; siteId?: string | null; contractId?: string | null; vendorId?: string | null };
  staff?: { fullName?: string; username?: string };
};

type ExceptionRecord = {
  id: string;
  status: string;
  complianceScore?: number;
  route?: { id?: string; name?: string; siteId?: string | null; contractId?: string | null; vendorId?: string | null };
  staff?: { fullName?: string; username?: string };
};

type ExtendedCheckpoint = Checkpoint & { siteId?: string | null; guardPostId?: string | null };

const normalizeFilterValue = (value?: string) => {
  if (!value) return undefined;
  if (value === 'all' || value.startsWith('all-')) return undefined;
  return value;
};

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const slugify = (value?: string | null) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const matchesFilterToken = (token: string | undefined, candidates: Array<string | null | undefined>) => {
  if (!token) return true;
  const normalizedToken = normalizeText(token);
  const slugToken = slugify(token);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeText(candidate);
    return normalizedCandidate === normalizedToken || slugify(candidate) === slugToken;
  });
};

export const SitesTab: React.FC<SitesTabProps> = React.memo(({
  contextualFilters = {},
  checkpoints,
  routes,
  editingCheckpoint,
  newCheckpoint,
  isSubmitting,
  siteSubTab,
  setSiteSubTab,
  setCheckpoints,
  setNewCheckpoint,
  setShowConfirmModal,
  setShowQRModal,
  setMessage,
  setActiveTab: _setActiveTab,
  startEditingCheckpoint,
  cancelEditing,
  handleAddCheckpoint,
  addCheckItem,
  removeCheckItem,
  updateCheckItem,
  hasMoreCheckpoints,
  loadMoreCheckpoints,
  loadingMoreCheckpoints,
}) => {
  const [selectedRouteId, setSelectedRouteId] = React.useState<string | null>(null);
  const [sites, setSites] = React.useState<SiteRecord[]>([]);
  const [contracts, setContracts] = React.useState<ContractRecord[]>([]);
  const [assignments, setAssignments] = React.useState<AssignmentRecord[]>([]);
  const [exceptions, setExceptions] = React.useState<ExceptionRecord[]>([]);
  const [opsSummary, setOpsSummary] = React.useState<AttendanceOpsSummary | null>(null);
  const [isLoadingSupportData, setIsLoadingSupportData] = React.useState(true);
  const [supportDataError, setSupportDataError] = React.useState<string | null>(null);
  const [isLoadingOpsData, setIsLoadingOpsData] = React.useState(true);
  const [opsDataError, setOpsDataError] = React.useState<string | null>(null);
  const [routeForm, setRouteForm] = React.useState({
    routeName: '',
    siteId: '',
    contractId: '',
    expectedDurationMinutes: 30,
    requiredCompletionPercent: 95,
    status: 'DRAFT',
    scheduleStartTime: '08:00',
    scheduleEndTime: '18:00',
    repeatIntervalMinutes: 120,
  });
  const [routeCheckpointIds, setRouteCheckpointIds] = React.useState<string[]>([]);
  const [isSavingRoute, setIsSavingRoute] = React.useState(false);
  const routeFormRef = React.useRef<HTMLFormElement | null>(null);
  const [poolSearch, setPoolSearch] = React.useState('');

  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = React.useState(false);
  const [isCheckpointDrawerOpen, setIsCheckpointDrawerOpen] = React.useState(false);

  const checkpointRecords = checkpoints as ExtendedCheckpoint[];
  const normalizedVendorFilter = normalizeFilterValue(contextualFilters.vendor);
  const normalizedContractFilter = normalizeFilterValue(contextualFilters.contractId);
  const normalizedSiteStatusFilter = normalizeFilterValue(contextualFilters.siteStatus);
  const normalizedSiteTypeFilter = normalizeFilterValue(contextualFilters.siteType);
  const normalizedPostCountFilter = normalizeFilterValue(contextualFilters.postCount);
  const normalizedRiskLevelFilter = normalizeFilterValue(contextualFilters.riskLevel);
  const normalizedGpsFilter = normalizeFilterValue(contextualFilters.gpsStatus);

  const loadSupportData = React.useCallback(async () => {
    setIsLoadingSupportData(true);
    setSupportDataError(null);
    try {
      const [sitePayload, contractPayload, assignmentPayload, exceptionPayload] = await Promise.all([
        fetch('/api/admin/sites?limit=100', { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : { data: [] })),
        fetch('/api/admin/contracts?limit=100', { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : { data: [] })),
        fetch('/api/tenant/patrol-assignments', { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : [])),
        fetch('/api/tenant/patrol-exceptions', { headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : [])),
      ]);

      setSites(Array.isArray(sitePayload) ? sitePayload : sitePayload?.data || []);
      setContracts(Array.isArray(contractPayload) ? contractPayload : contractPayload?.data || []);
      setAssignments(Array.isArray(assignmentPayload) ? assignmentPayload : assignmentPayload?.data || []);
      setExceptions(Array.isArray(exceptionPayload) ? exceptionPayload : exceptionPayload?.data || []);
    } catch {
      setSites([]);
      setContracts([]);
      setAssignments([]);
      setExceptions([]);
      setSupportDataError('Không tải được dữ liệu mục tiêu, tuyến tuần tra hoặc hợp đồng.');
    } finally {
      setIsLoadingSupportData(false);
    }
  }, []);

  React.useEffect(() => {
    void loadSupportData();
  }, [loadSupportData]);

  const resolvedVendorId = React.useMemo(() => {
    if (!normalizedVendorFilter) return undefined;
    const matchedSite = sites.find((site) => matchesFilterToken(normalizedVendorFilter, [site.vendorId, site.vendor?.id, site.vendor?.name]));
    if (matchedSite?.vendor?.id) return matchedSite.vendor.id;
    const matchedContract = contracts.find((contract) => matchesFilterToken(normalizedVendorFilter, [contract.vendorId]));
    return matchedContract?.vendorId ?? undefined;
  }, [contracts, normalizedVendorFilter, sites]);

  const resolvedContractId = React.useMemo(() => {
    if (!normalizedContractFilter) return undefined;
    const matchedContract = contracts.find((contract) =>
      matchesFilterToken(normalizedContractFilter, [contract.id, contract.contractCode, contract.contractName]),
    );
    return matchedContract?.id ?? undefined;
  }, [contracts, normalizedContractFilter]);

  const loadOpsSummary = React.useCallback(async () => {
    setIsLoadingOpsData(true);
    setOpsDataError(null);
    try {
      const params = new URLSearchParams({ shift: 'current-shift' });
      if (resolvedVendorId) params.set('vendor', resolvedVendorId);
      if (resolvedContractId) params.set('contractId', resolvedContractId);

      const response = await fetch(`/api/tenant/attendance/ops-summary?${params.toString()}`, { headers: getAuthHeaders() });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'OPS_SUMMARY_FETCH_FAILED');
      }

      setOpsSummary((await response.json()) ?? null);
    } catch (error: any) {
      setOpsSummary(null);
      setOpsDataError(error?.message || 'Không tải được dữ liệu vận hành theo site.');
    } finally {
      setIsLoadingOpsData(false);
    }
  }, [resolvedContractId, resolvedVendorId]);

  React.useEffect(() => {
    void loadOpsSummary();
  }, [loadOpsSummary]);

  const getRouteCheckpointId = (item: PatrolRoute['checkpoints'][number]) => (typeof item === 'string' ? item : item.id);

  const getRouteScheduleLabel = (route: PatrolRoute) => {
    const schedule = route.complianceConfig?.schedule as any;
    if (schedule?.startTime && schedule?.endTime) {
      const repeat = schedule.repeatIntervalMinutes || route.repeatIntervalMinutes;
      return `${schedule.startTime}-${schedule.endTime}${repeat ? ` · lặp ${repeat}p` : ''}`;
    }
    if (route.repeatIntervalMinutes) return `Lặp mỗi ${route.repeatIntervalMinutes} phút`;
    return route.schedule || 'Chưa cấu hình lịch';
  };

  const createRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingRoute(true);
    try {
      const selectedContract = contracts.find((contract) => contract.id === routeForm.contractId);
      const response = await fetch('/api/tenant/routes', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...routeForm,
          complianceConfig: {
            schedule: {
              type: 'DAILY_TIME_WINDOW',
              startTime: routeForm.scheduleStartTime,
              endTime: routeForm.scheduleEndTime,
              repeatIntervalMinutes: routeForm.repeatIntervalMinutes,
            },
            requirements: { requireGps: true, requirePhotoFirstCheckpoint: true },
            sla: { requiredCompletionPercent: routeForm.requiredCompletionPercent },
          },
          vendorId: selectedContract?.vendorId,
          checkpoints: routeCheckpointIds.map((checkpointId, index) => ({
            checkpointId,
            sequenceNo: index + 1,
            required: true,
            gpsRequired: true,
            photoRequired: index === 0,
            noteRequired: false,
            geoRadiusMeters: 50,
          })),
        }),
      });

      if (!response.ok) throw new Error((await response.json())?.error || 'CREATE_ROUTE_FAILED');
      setMessage({ text: 'Đã tạo tuyến tuần tra.', type: 'success' });
      setRouteForm({
        routeName: '',
        siteId: '',
        contractId: '',
        expectedDurationMinutes: 30,
        requiredCompletionPercent: 95,
        status: 'DRAFT',
        scheduleStartTime: '08:00',
        scheduleEndTime: '18:00',
        repeatIntervalMinutes: 120,
      });
      setRouteCheckpointIds([]);
      setIsRouteDrawerOpen(false);
    } catch (error: any) {
      setMessage({ text: error?.message || 'Không thể tạo tuyến tuần tra.', type: 'error' });
    } finally {
      setIsSavingRoute(false);
    }
  };

  const filteredSites = React.useMemo(() => {
    return sites.filter((site) => {
      if (normalizedSiteStatusFilter && normalizeText(site.status) !== normalizeText(normalizedSiteStatusFilter)) return false;
      if (normalizedSiteTypeFilter && !matchesFilterToken(normalizedSiteTypeFilter, [site.type, site.siteType])) return false;
      if (!matchesFilterToken(normalizedVendorFilter, [site.vendorId, site.vendor?.id, site.vendor?.name])) return false;
      if (normalizedContractFilter) {
        const hasContract = (site.contracts ?? []).some((contract) =>
          matchesFilterToken(normalizedContractFilter, [contract.id, contract.contractCode, contract.contractName]),
        );
        if (!hasContract) return false;
      }
      if (normalizedRiskLevelFilter && normalizeText(site.vendor?.riskLevel) !== normalizeText(normalizedRiskLevelFilter)) return false;

      const guardPostCount = site.guardPosts?.length ?? 0;
      if (normalizedPostCountFilter === 'missing-posts' && guardPostCount > 0) return false;
      if (normalizedPostCountFilter === 'many-posts' && guardPostCount < 3) return false;

      const siteCheckpoints = checkpointRecords.filter((checkpoint) => checkpoint.siteId === site.id);
      if (normalizedGpsFilter === 'missing-gps' && siteCheckpoints.length > 0 && !siteCheckpoints.some((checkpoint) => !checkpoint.latitude || !checkpoint.longitude)) return false;
      if (normalizedGpsFilter === 'has-gps' && siteCheckpoints.some((checkpoint) => !checkpoint.latitude || !checkpoint.longitude)) return false;

      return true;
    });
  }, [
    checkpointRecords,
    normalizedContractFilter,
    normalizedGpsFilter,
    normalizedPostCountFilter,
    normalizedRiskLevelFilter,
    normalizedSiteStatusFilter,
    normalizedSiteTypeFilter,
    normalizedVendorFilter,
    sites,
  ]);

  const filteredSiteIds = React.useMemo(() => new Set(filteredSites.map((site) => site.id)), [filteredSites]);

  const filteredCheckpoints = React.useMemo(
    () => checkpointRecords.filter((checkpoint) => !checkpoint.siteId || filteredSiteIds.has(checkpoint.siteId)),
    [checkpointRecords, filteredSiteIds],
  );

  const filteredRoutes = React.useMemo(
    () => routes.filter((route) => !route.siteId || filteredSiteIds.has(route.siteId)),
    [filteredSiteIds, routes],
  );

  const filteredPool = React.useMemo(() => {
    const q = normalizeText(poolSearch);
    return filteredCheckpoints.filter(cp => 
      !q || normalizeText(cp.name).includes(q)
    );
  }, [filteredCheckpoints, poolSearch]);

  const moveCheckpoint = (index: number, direction: 'up' | 'down') => {
    const newIds = [...routeCheckpointIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newIds.length) return;
    [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
    setRouteCheckpointIds(newIds);
  };

  const filteredAssignments = React.useMemo(
    () => assignments.filter((assignment) => !assignment.route?.siteId || filteredSiteIds.has(assignment.route.siteId)),
    [assignments, filteredSiteIds],
  );

  const filteredExceptions = React.useMemo(
    () => exceptions.filter((exception) => !exception.route?.siteId || filteredSiteIds.has(exception.route.siteId)),
    [exceptions, filteredSiteIds],
  );

  const filteredUrgentItems = React.useMemo(
    () => (opsSummary?.urgentItems ?? []).filter((item) => !item.siteId || filteredSiteIds.has(item.siteId)),
    [filteredSiteIds, opsSummary],
  );

  const urgentCountsBySite = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filteredUrgentItems) {
      if (!item.siteId) continue;
      map.set(item.siteId, (map.get(item.siteId) ?? 0) + 1);
    }
    return map;
  }, [filteredUrgentItems]);

  const exceptionCountsBySite = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const exception of filteredExceptions) {
      const siteId = exception.route?.siteId;
      if (!siteId) continue;
      map.set(siteId, (map.get(siteId) ?? 0) + 1);
    }
    return map;
  }, [filteredExceptions]);

  const routeCountsBySite = React.useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    for (const route of filteredRoutes) {
      if (!route.siteId) continue;
      const current = map.get(route.siteId) ?? { total: 0, active: 0 };
      current.total += 1;
      if ((route.status ?? 'ACTIVE') === 'ACTIVE') current.active += 1;
      map.set(route.siteId, current);
    }
    return map;
  }, [filteredRoutes]);

  const checkpointsBySite = React.useMemo(() => {
    const map = new Map<string, { total: number; missingGps: number }>();
    for (const checkpoint of filteredCheckpoints) {
      if (!checkpoint.siteId) continue;
      const current = map.get(checkpoint.siteId) ?? { total: 0, missingGps: 0 };
      current.total += 1;
      if (!checkpoint.latitude || !checkpoint.longitude) current.missingGps += 1;
      map.set(checkpoint.siteId, current);
    }
    return map;
  }, [filteredCheckpoints]);

  const siteHealthRows = React.useMemo(() => {
    return filteredSites.map((site) => {
      const guardPostCount = site.guardPosts?.length ?? 0;
      const activeGuardPostCount = (site.guardPosts ?? []).filter((guardPost) => guardPost.status === 'ACTIVE').length;
      const activeContractCount = site.contracts?.length ?? 0;
      const routeStats = routeCountsBySite.get(site.id) ?? { total: 0, active: 0 };
      const checkpointStats = checkpointsBySite.get(site.id) ?? { total: 0, missingGps: 0 };
      const urgentCount = urgentCountsBySite.get(site.id) ?? 0;
      const exceptionCount = exceptionCountsBySite.get(site.id) ?? 0;
      const topUrgentItem = filteredUrgentItems.find((item) => item.siteId === site.id) ?? null;
      const riskReasons = [
        activeContractCount === 0 ? 'Thiếu hợp đồng active' : null,
        guardPostCount === 0 ? 'Chưa có chốt' : null,
        routeStats.active === 0 ? 'Không có tuyến active' : null,
        checkpointStats.missingGps > 0 ? 'Có checkpoint thiếu GPS' : null,
        urgentCount > 0 ? `${urgentCount} việc cần xử lý` : null,
        exceptionCount > 0 ? `${exceptionCount} ngoại lệ tuần tra` : null,
      ].filter(Boolean) as string[];

      return {
        site,
        activeContractCount,
        guardPostCount,
        activeGuardPostCount,
        checkpointCount: checkpointStats.total,
        activeRouteCount: routeStats.active,
        totalRouteCount: routeStats.total,
        urgentCount,
        exceptionCount,
        nextAction:
          topUrgentItem?.nextAction ??
          (activeContractCount === 0
            ? 'Gắn hợp đồng active'
            : routeStats.active === 0
              ? 'Tạo tuyến active'
              : guardPostCount === 0
                ? 'Tạo chốt bảo vệ'
                : 'Kiểm tra chi tiết site'),
        riskReasons,
      };
    });
  }, [checkpointsBySite, exceptionCountsBySite, filteredSites, filteredUrgentItems, routeCountsBySite, urgentCountsBySite]);

  const operationalMetrics = React.useMemo(() => {
    return [
      {
        label: 'Site có rủi ro',
        value: siteHealthRows.filter((row) => row.riskReasons.length > 0).length,
        tone: siteHealthRows.some((row) => row.riskReasons.length > 0) ? 'danger' as const : 'success' as const,
        description: 'Thiếu hợp đồng, thiếu chốt, thiếu tuyến hoặc có cảnh báo vận hành',
      },
      {
        label: 'Ca thiếu người',
        value: opsSummary?.totals.understaffedShifts ?? 0,
        tone: (opsSummary?.totals.understaffedShifts ?? 0) > 0 ? 'danger' as const : 'success' as const,
        description: 'Ca trực chưa đủ quân số theo hợp đồng đang active',
      },
      {
        label: 'Sai GPS',
        value: opsSummary?.totals.invalidGps ?? 0,
        tone: (opsSummary?.totals.invalidGps ?? 0) > 0 ? 'warning' as const : 'success' as const,
        description: 'Attendance có bằng chứng GPS rủi ro trong ca hiện tại',
      },
      {
        label: 'Tuyến trễ / ngoại lệ',
        value: filteredExceptions.length,
        tone: filteredExceptions.length > 0 ? 'warning' as const : 'success' as const,
        description: 'Ngoại lệ tuần tra đang cần supervisor hoặc vendor review',
      },
      {
        label: 'Chưa check-out',
        value: opsSummary?.totals.missingCheckOut ?? 0,
        tone: (opsSummary?.totals.missingCheckOut ?? 0) > 0 ? 'warning' as const : 'success' as const,
        description: 'Guard đã vào ca nhưng chưa có dấu mốc kết thúc ca',
      },
    ];
  }, [filteredExceptions.length, opsSummary, siteHealthRows]);

  const mapPoints: MapPoint[] = React.useMemo(() => {
    if (selectedRouteId) {
      const route = filteredRoutes.find((item) => item.id === selectedRouteId);
      if (route) {
        return route.checkpoints
          .map((item) => checkpointRecords.find((checkpoint) => checkpoint.id === getRouteCheckpointId(item)))
          .filter((checkpoint): checkpoint is ExtendedCheckpoint => Boolean(checkpoint))
          .map((checkpoint) => ({
            id: checkpoint.id,
            name: checkpoint.name,
            lat: checkpoint.latitude,
            lon: checkpoint.longitude,
            status: (checkpoint.status === 'active' ? 'ACTIVE' : 'INACTIVE') as any,
            type: 'CHECKPOINT',
          }));
      }
    }

    return filteredCheckpoints.map((checkpoint) => ({
      id: checkpoint.id,
      name: checkpoint.name,
      lat: checkpoint.latitude,
      lon: checkpoint.longitude,
      status: (checkpoint.status === 'active' ? 'ACTIVE' : 'INACTIVE') as any,
      type: 'CHECKPOINT',
    }));
  }, [checkpointRecords, filteredCheckpoints, filteredRoutes, selectedRouteId]);

  return (
    <motion.div key="sites" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* 1. Thanh điều hướng Tab tinh gọn - Loại bỏ các nút action rời rạc */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex gap-4">
          {[
            { id: 'manage', label: 'Điều hành Site', icon: MapPin },
            { id: 'map', label: 'Bản đồ thực địa', icon: Navigation },
            { id: 'benchmark', label: 'Tiêu chuẩn (Benchmark)', icon: Target },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSiteSubTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 pb-2 text-[13px] font-bold transition-all border-b-2",
                siteSubTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
           {/* Gộp các hành động "Kho" vào một chỗ duy nhất */}
           <button onClick={() => setIsCheckpointDrawerOpen(true)} className="text-[11px] font-black uppercase text-slate-400 hover:text-white transition-colors">
             Kho Checkpoint ➔
           </button>
        </div>
      </div>

      {siteSubTab === 'map' ? (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-500">Lọc theo lộ trình</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedRouteId(null)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider transition-all',
                      !selectedRouteId ? 'border-white/20 bg-white/10 text-white shadow-lg' : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300',
                    )}
                  >
                    Tất cả điểm kiểm soát
                  </button>
                  {filteredRoutes.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider transition-all',
                        selectedRouteId === route.id
                          ? 'border-sky-400/50 bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                          : 'border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{route.name}</span>
                        <Zap size={12} className={selectedRouteId === route.id ? 'text-white' : 'text-slate-700'} />
                      </div>
                      <div className="mt-1 text-[8px] font-medium normal-case opacity-60">
                        {route.checkpoints.length} điểm · {getRouteScheduleLabel(route)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/5 bg-scmd-surface p-6">
                <p className="text-[10px] font-medium leading-relaxed text-scmd-silver/40">
                  <strong className="text-scmd-silver/60">Chú ý:</strong> Bản đồ điểm kiểm soát dùng dữ liệu tọa độ hiện có trong hệ thống.
                </p>
              </div>
            </div>

            <div className="relative h-[600px] overflow-hidden rounded-[2.5rem] border border-slate-800 shadow-2xl lg:col-span-3">
              <TacticalMap
                points={mapPoints}
                showRouteLine={Boolean(selectedRouteId)}
                onPointClick={(point) => {
                  const checkpoint = checkpointRecords.find((item) => item.id === point.id);
                  if (checkpoint) startEditingCheckpoint(checkpoint);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {siteSubTab === 'field' ? (
        <div className="animate-in fade-in duration-500">
          <AdminBenchmarkRecorder />
        </div>
      ) : null}

      {siteSubTab === 'benchmark' ? (
        <BenchmarkLearningMode checkpoints={checkpointRecords as any} onCheckpointsUpdate={(updated: any) => setCheckpoints(updated)} />
      ) : null}

      {siteSubTab === 'manage' ? (
        <>
          {/* 2. Micro-metrics Row: Loại bỏ card cồng kềnh, chuyển sang thanh trạng thái */}
          <div className="flex flex-wrap gap-6 rounded-xl bg-white/[0.02] border border-white/5 p-4">
            {operationalMetrics.map(m => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{m.label}</span>
                <span className={cn("text-xl font-black", m.tone === 'danger' ? "text-red-400" : m.tone === 'warning' ? "text-amber-400" : "text-emerald-400")}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* 3. Site Health Command Table: Xương sống của dữ liệu */}
          <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-slate-900/20">
            <table className={cn(opsTableClass, "w-full")}>
              <thead className="bg-slate-900/50">
                <tr>
                  <th className={opsThClass}>Site / Mục tiêu</th>
                  <th className={opsThClass}>Vendor</th>
                  <th className={opsThClass}>Chốt/CP</th>
                  <th className={opsThClass}>Tuyến Active</th>
                  <th className={opsThClass}>Rủi ro vận hành</th>
                  <th className={cn(opsThClass, "text-right")}>Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {siteHealthRows.map((row) => (
                  <tr key={row.site.id} className={opsRowClass}>
                    <td className={cn(opsTdClass, "font-bold text-white")}>{row.site.siteName}</td>
                    <td className={opsTdClass}>{row.site.vendor?.name || '---'}</td>
                    <td className={opsTdClass}>
                      <span className="font-mono text-[11px]">{row.guardPostCount} chốt · {row.checkpointCount} CP</span>
                    </td>
                    <td className={opsTdClass}>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-12 bg-white/10 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(row.activeRouteCount / (row.totalRouteCount || 1)) * 100}%` }} /></div>
                        <span className="text-[11px] font-bold">{row.activeRouteCount}/{row.totalRouteCount}</span>
                      </div>
                    </td>
                    <td className={opsTdClass}>
                      {row.riskReasons.length > 0 ? (
                        <span className="text-amber-400 font-bold text-[10px] uppercase">{row.riskReasons[0]}</span>
                      ) : (
                        <span className="text-emerald-500 font-bold text-[10px] uppercase">Ổn định</span>
                      )}
                    </td>
                    <td className={cn(opsTdClass, "text-right")}>
                      <button onClick={() => setIsRouteDrawerOpen(true)} className="text-[11px] font-black text-blue-400 hover:underline uppercase">Quản lý ➔</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {/* Split-View Route Builder Drawer */}
      <AnimatePresence>
        {isRouteDrawerOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRouteDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex h-full w-full max-w-2xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">Thiết lập tuyến tuần tra</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mô hình Split-View Builder v2.5</p>
                </div>
                <button onClick={() => setIsRouteDrawerOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tên tuyến</label>
                    <input value={routeForm.routeName} onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })} placeholder="VD: Tuần tra kho đêm" className={dashboardInputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Site vận hành</label>
                    <select value={routeForm.siteId} onChange={(e) => setRouteForm({ ...routeForm, siteId: e.target.value })} className={dashboardInputClass}>
                      <option value="">Chọn site</option>
                      {filteredSites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
                    </select>
                  </div>
                </div>

                {/* Block 1: Select Pool */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">KHỐI 1: TÌM & CHỌN CHECKPOINT (Select Pool)</h3>
                    <div className="relative w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input placeholder="Tìm nhanh checkpoint..." className={cn(dashboardInputClass, "h-8 pl-9 text-[11px]")} value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
                    </div>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto rounded-xl border border-white/5 bg-slate-950/50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-4 py-3 w-12">Chọn</th>
                          <th className="px-4 py-3">Tên Checkpoint</th>
                          <th className="px-4 py-3">Vị trí</th>
                          <th className="px-4 py-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[12px]">
                        {filteredPool.map(cp => {
                          const selected = routeCheckpointIds.includes(cp.id);
                          return (
                            <tr key={cp.id} className={cn("hover:bg-white/[0.03] transition-colors", selected && "bg-blue-600/10")}>
                              <td className="px-4 py-2">
                                <input type="checkbox" checked={selected} onChange={() => {
                                  if (selected) setRouteCheckpointIds(prev => prev.filter(id => id !== cp.id));
                                  else setRouteCheckpointIds(prev => [...prev, cp.id]);
                                }} className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-600" />
                              </td>
                              <td className="px-4 py-2 font-bold text-white">{cp.name}</td>
                              <td className="px-4 py-2 text-slate-400">{cp.siteId ? sites.find(s => s.id === cp.siteId)?.siteName : '---'}</td>
                              <td className="px-4 py-2">
                                <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase border", cp.status === 'active' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-slate-500/20 bg-slate-500/10 text-slate-400")}>
                                  {cp.status === 'active' ? 'Đang hoạt động' : 'Bảo trì'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Block 2: Ordered Route */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">KHỐI 2: LỘ TRÌNH ĐI TUẦN (Ordered Route - {routeCheckpointIds.length} điểm)</h3>
                  <div className="rounded-xl border border-white/5 bg-slate-950/50">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900/90 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="px-4 py-3 w-24">Sắp xếp</th>
                          <th className="px-4 py-3 w-12 text-center">STT</th>
                          <th className="px-4 py-3">Tên Checkpoint</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[12px]">
                        {routeCheckpointIds.map((id, index) => {
                          const cp = checkpoints.find(c => c.id === id);
                          if (!cp) return null;
                          return (
                            <tr key={id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <button type="button" disabled={index === 0} onClick={() => moveCheckpoint(index, 'up')} className="p-1.5 rounded bg-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"><ArrowUp size={14} /></button>
                                  <button type="button" disabled={index === routeCheckpointIds.length - 1} onClick={() => moveCheckpoint(index, 'down')} className="p-1.5 rounded bg-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-colors"><ArrowDown size={14} /></button>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center font-mono font-black text-slate-500">{index + 1}</td>
                              <td className="px-4 py-2 font-bold text-white">{cp.name}</td>
                              <td className="px-4 py-2 text-right">
                                <button type="button" onClick={() => setRouteCheckpointIds(prev => prev.filter(cid => cid !== id))} className="px-2 py-1 rounded bg-red-500/10 text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all">Bỏ chọn ✕</button>
                              </td>
                            </tr>
                          );
                        })}
                        {routeCheckpointIds.length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500 italic">Lộ trình đang trống. Hãy tick chọn checkpoint ở Khối 1.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-8 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mục tiêu SLA (%)</label>
                      <input type="number" value={routeForm.requiredCompletionPercent} onChange={(e) => setRouteForm({ ...routeForm, requiredCompletionPercent: Number(e.target.value) })} className={dashboardInputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tần suất lặp (phút)</label>
                      <input type="number" value={routeForm.repeatIntervalMinutes} onChange={(e) => setRouteForm({ ...routeForm, repeatIntervalMinutes: Number(e.target.value) })} className={dashboardInputClass} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bắt đầu</label><input type="time" value={routeForm.scheduleStartTime} onChange={(e) => setRouteForm({ ...routeForm, scheduleStartTime: e.target.value })} className={dashboardInputClass} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kết thúc</label><input type="time" value={routeForm.scheduleEndTime} onChange={(e) => setRouteForm({ ...routeForm, scheduleEndTime: e.target.value })} className={dashboardInputClass} /></div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trạng thái vận hành</label>
                      <select value={routeForm.status} onChange={(e) => setRouteForm({ ...routeForm, status: e.target.value })} className={dashboardInputClass}>
                        <option value="DRAFT">DRAFT (Nháp)</option>
                        <option value="ACTIVE">ACTIVE (Kích hoạt)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-slate-900/50 p-6">
                <button onClick={createRoute} disabled={isSavingRoute || !routeForm.routeName || routeCheckpointIds.length === 0} className="h-14 w-full rounded-2xl bg-blue-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50">
                  {isSavingRoute ? <Loader2 className="mx-auto animate-spin" /> : 'Xác nhận & Tạo tuyến tuần tra'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkpoint Management Drawer (Refactored from Main screen) */}
      <AnimatePresence>
        {isCheckpointDrawerOpen && (
          <div className="fixed inset-0 z-[110] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCheckpointDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative flex h-full w-full max-w-xl flex-col bg-scmd-navy border-l border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/50 p-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">{editingCheckpoint ? 'Sửa điểm kiểm soát' : 'Kho điểm Checkpoint'}</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Quản lý định danh thực địa QR/GPS</p>
                </div>
                <button onClick={() => { setIsCheckpointDrawerOpen(false); cancelEditing(); }} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Quick Add/Edit Form */}
                <form onSubmit={handleAddCheckpoint} className="space-y-5 rounded-2xl border border-white/5 bg-slate-950/40 p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tên điểm</label>
                      <input required value={newCheckpoint.name} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name: e.target.value })} className={dashboardInputClass} placeholder="VD: Cổng Alpha" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vĩ độ (Lat)</label>
                      <input type="number" step="any" required value={newCheckpoint.latitude} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, latitude: parseFloat(e.target.value) })} className={dashboardInputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kinh độ (Lon)</label>
                      <input type="number" step="any" required value={newCheckpoint.longitude} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, longitude: parseFloat(e.target.value) })} className={dashboardInputClass} />
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Checklist ({newCheckpoint.check_items.length})</span>
                      <button type="button" onClick={addCheckItem} className="text-[10px] font-black uppercase text-emerald-400 hover:underline">Thêm đầu việc</button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                      {newCheckpoint.check_items.map(item => (
                        <div key={item.id} className="flex gap-2">
                          <input value={item.task} onChange={(e) => updateCheckItem(item.id, { task: e.target.value })} className={cn(dashboardInputClass, "h-8 text-xs flex-1")} placeholder="Nhiệm vụ..." />
                          <button type="button" onClick={() => removeCheckItem(item.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl bg-emerald-600 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500">
                    {isSubmitting ? <Loader2 className="mx-auto animate-spin" /> : editingCheckpoint ? 'Cập nhật điểm' : 'Lưu điểm mới'}
                  </button>
                </form>

                {/* Search & List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">DANH SÁCH CHECKPOINT ({filteredCheckpoints.length})</h3>
                  </div>
                  <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-slate-950/20 overflow-hidden">
                    {filteredCheckpoints.map(cp => (
                      <div key={cp.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{cp.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{cp.latitude.toFixed(5)}, {cp.longitude.toFixed(5)}</p>
                          <div className="mt-1 flex gap-2">
                             <span className="text-[8px] font-black uppercase text-slate-600">{cp.check_items?.length || 0} Task</span>
                             {cp.latitude && cp.longitude ? <span className="text-[8px] font-black uppercase text-blue-500">GPS OK</span> : <span className="text-[8px] font-black uppercase text-amber-500">Missing GPS</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditingCheckpoint(cp)} className="p-2 text-slate-500 hover:text-white transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setShowQRModal(cp)} className="p-2 text-slate-500 hover:text-emerald-400 transition-colors"><QrCode size={14} /></button>
                          <button onClick={() => setShowConfirmModal({ id: cp.id, type: 'checkpoint', name: cp.name })} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    {hasMoreCheckpoints && (
                      <button onClick={loadMoreCheckpoints} disabled={loadingMoreCheckpoints} className="w-full py-4 text-[10px] font-black uppercase text-slate-500 hover:bg-white/5 transition-all">
                        {loadingMoreCheckpoints ? 'Đang tải...' : 'Tải thêm điểm...'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default SitesTab;
