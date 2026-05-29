﻿import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileWarning,
  MapPinned,
  RefreshCcw,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { SCMDButton } from '../../common/interfaces/components/SCMDButton';
import { SCMDCard } from '../../common/interfaces/components/SCMDCard';
import { cn } from '../../../lib/utils';
import type { ActiveTab, Staff, Stats } from './types';
import { OpsSavedViews, OpsStatusBadge, opsRowClass, opsTableClass, opsTdClass, opsThClass } from './components/OpsTableSystem';

interface OverviewTabProps {
  isPro: boolean;
  stats: Stats;
  staff: Staff[];
  mapData: any[];
  priorities: any[];
  monthlyInsights: any;
  isLoadingMonthlyAI: boolean;
  filters?: Record<string, string>;
  setActiveTab: (
    tab: ActiveTab,
    options?: {
      priorityOnly?: boolean;
      focusId?: string;
      focusType?: 'incident' | 'violation' | 'audit' | 'site' | 'attendance';
    },
  ) => void;
  setShowBugModal: (show: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setSelectedMapPoint: (point: any) => void;
  onExportPriorities: (format: 'print' | 'excel', tasks: any[]) => void;
}

type Severity = 'critical' | 'warning' | 'ok';

type QueueRow = {
  id: string;
  priority: 'Cao' | 'Trung bình' | 'Theo dõi';
  issue: string;
  details: string;
  siteShift: string;
  sla: string;
  owner: string;
  action: string;
  tab: ActiveTab;
  focusType: 'incident' | 'violation' | 'audit' | 'site' | 'attendance';
  severity: Severity;
  siteKey: string;
  vendorKey: string;
  statusKey: 'breach' | 'warning' | 'ok';
  timestamp?: number;
  ageLabel: string;
  entityKey: string;
  targetRoute?: string;
  source: 'priority' | 'feed';
};


const severityClass: Record<Severity, string> = {
  critical: 'border-red-500/20 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  ok: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
};

const surfaceToneClass: Record<Severity, string> = {
  critical: 'border-red-500/18 bg-red-500/[0.08] text-red-100',
  warning: 'border-amber-500/18 bg-amber-500/[0.07] text-amber-100',
  ok: 'border-emerald-500/18 bg-emerald-500/[0.07] text-emerald-100',
};

const formatNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('vi-VN').format(value);
  }
  if (Array.isArray(value)) return new Intl.NumberFormat('vi-VN').format(value.length);
  return '0';
};

const normalizeText = (value: unknown, fallback: string) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatAge = (timestamp?: number) => {
  if (!timestamp || !Number.isFinite(timestamp)) return 'Chưa rõ thời điểm';
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return 'Vừa phát sinh';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffMinutes < 24 * 60) return `${Math.round(diffMinutes / 60)} giờ trước`;
  return `${Math.round(diffMinutes / 1440)} ngày trước`;
};

const normalizeEntityKey = (id: unknown) => {
  const value = String(id || '')
    .replace(/^priority-/, '')
    .replace(/^feed-/, '')
    .toLowerCase();
  return value
    .replace(/^patrol-session-/, 'patrol-session-')
    .replace(/^patrol-/, 'patrol-session-')
    .replace(/^shift-shortage-/, 'shortage-')
    .replace(/^violation-/, 'violation-');
};

const compactRouteLabel = (site: string, value: string) => {
  const text = value.trim();
  if (!text) return '';
  const normalizedSite = site.trim().toLowerCase();
  const normalizedText = text.toLowerCase();
  if (normalizedSite && normalizedText.startsWith(`${normalizedSite} - `)) {
    return text.slice(site.length + 3).trim();
  }
  if (normalizedSite && normalizedText.startsWith(`${normalizedSite} · `)) {
    return text.slice(site.length + 3).trim();
  }
  return text;
};

const siteNameFromText = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.split('•')[0]?.split(' - Tuyến')[0]?.trim() || text;
};

const classifyAction = (type: string, title: string) => {
  const upper = `${type} ${title}`.toUpperCase();
  if (upper.includes('VIOLATION')) return 'Review vi phạm';
  if (upper.includes('SHIFT') || upper.includes('GUARD') || upper.includes('THIẾU')) return 'Điều phối nhân sự';
  if (upper.includes('PATROL_EXCEPTION')) return 'Mở phiên tuần tra';
  if (upper.includes('PATROL') || upper.includes('TUẦN TRA')) return 'Gửi nhắc tuần tra';
  if (upper.includes('INCIDENT') || upper.includes('SỰ CỐ') || upper.includes('SOS')) return 'Mở hồ sơ sự cố';
  if (upper.includes('EVIDENCE') || upper.includes('BẰNG CHỨNG')) return 'Yêu cầu bổ sung';
  if (upper.includes('SLA')) return 'Ưu tiên xử lý';
  return 'Mở chi tiết';
};

const tabFromPriorityType = (type: string): ActiveTab => {
  if (type.includes('INCIDENT') || type.includes('SOS')) return 'incidents';
  if (type.includes('PATROL') || type.includes('ROUTE')) return 'sites';
  if (type.includes('SHIFT') || type.includes('ATTENDANCE')) return 'attendance';
  if (type.includes('EVIDENCE')) return 'attachments';
  return 'violations';
};

const focusTypeFromTab = (tab: ActiveTab): QueueRow['focusType'] =>
  tab === 'incidents' ? 'incident'
    : tab === 'sites' ? 'site'
      : tab === 'attendance' ? 'attendance'
        : tab === 'attachments' ? 'audit'
          : 'violation';

const rowFromPriority = (item: any, index: number): QueueRow => {
  const type = String(item?.type || item?.category || 'TASK').toUpperCase();
  const rawSeverity = String(item?.severity || item?.priority || '').toUpperCase();
  const isCritical = rawSeverity === 'CRITICAL' || rawSeverity === 'HIGH' || type.includes('SOS');
  const isWarning = rawSeverity === 'WARNING' || type.includes('PATROL') || type.includes('SLA');
  const title = normalizeText(item?.title || item?.name || item?.message, 'Việc vận hành cần xử lý');
  const site = normalizeText(item?.siteName || item?.locationName || item?.site || item?.shiftName || siteNameFromText(item?.description), 'Chưa gắn site/ca');
  const routeLabel = compactRouteLabel(site, normalizeText(item?.shiftLabel || item?.routeName || item?.description, ''));
  const guardName = normalizeText(item?.guardName, '');
  const routeOrShift = guardName && type.includes('PATROL') && routeLabel ? `${routeLabel} · ${guardName}` : routeLabel;
  const vendor = normalizeText(item?.vendorName || item?.owner || item?.assigneeName, type.includes('PATROL') ? 'Đội tuần tra' : 'Đội vận hành');
  const tab = tabFromPriorityType(type);
  const timestamp = item?.createdAt || item?.reportedAt || item?.timestamp ? new Date(item.createdAt || item.reportedAt || item.timestamp).getTime() : undefined;
  const statusKey = item?.slaStatus === 'BREACHED' ? 'breach' : item?.slaStatus === 'DUE_SOON' ? 'warning' : isCritical ? 'breach' : isWarning ? 'warning' : 'ok';
  const sla = item?.dueAt ? `${statusKey === 'breach' ? 'Quá hạn' : 'Hạn'} ${new Date(item.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : normalizeText(item?.sla || item?.eta || item?.dueIn, statusKey === 'breach' ? 'Quá hạn' : statusKey === 'warning' ? 'Sắp quá hạn' : 'Còn trong hạn');

  return {
    id: String(item?.id || `priority-${index}`),
    priority: isCritical ? 'Cao' : isWarning ? 'Trung bình' : 'Theo dõi',
    issue: title,
    details: routeOrShift || compactRouteLabel(site, normalizeText(item?.description, '')),
    siteShift: routeOrShift && site !== routeOrShift ? `${site} · ${routeOrShift}` : site,
    sla,
    owner: vendor,
    action: normalizeText(item?.nextAction, classifyAction(type, title)),
    tab,
    focusType: focusTypeFromTab(tab),
    severity: isCritical ? 'critical' : isWarning ? 'warning' : 'ok',
    siteKey: String(item?.siteKey || item?.siteId || site).toLowerCase(),
    vendorKey: String(item?.vendorKey || item?.vendorId || vendor).toLowerCase(),
    statusKey,
    timestamp,
    ageLabel: formatAge(timestamp),
    entityKey: normalizeEntityKey(item?.id || `priority-${index}`),
    targetRoute: item?.targetRoute,
    source: 'priority',
  };
};

const rowFromFeed = (item: any, index: number): QueueRow => {
  const status = String(item?.status || '').toUpperCase();
  const type = String(item?.type || 'REALTIME').toUpperCase();
  const title = normalizeText(item?.title || item?.message || type, 'Sự kiện vận hành mới');
  const isCritical = status === 'CRITICAL' || type === 'SOS';
  const isWarning = status === 'WARNING';
  const tab = tabFromPriorityType(type);
  const timestamp = item?.timestamp ? new Date(item.timestamp).getTime() : undefined;
  const siteShift = normalizeText(item?.siteName || item?.locationName || siteNameFromText(item?.title) || item?.subtitle, 'Command center');

  return {
    id: String(item?.id || `feed-${index}`),
    priority: isCritical ? 'Cao' : isWarning ? 'Trung bình' : 'Theo dõi',
    issue: title,
    details: normalizeText(item?.subtitle || item?.message, ''),
    siteShift,
    sla: item?.timestamp ? `Phát sinh ${new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Mới ghi nhận',
    owner: normalizeText(item?.owner || item?.vendorName, type === 'SOS' ? 'Giám sát trực' : 'Đội vận hành'),
    action: classifyAction(type, title),
    tab,
    focusType: focusTypeFromTab(tab),
    severity: isCritical ? 'critical' : isWarning ? 'warning' : 'ok',
    siteKey: String(item?.siteKey || item?.siteId || item?.locationName || '').toLowerCase(),
    vendorKey: String(item?.vendorKey || item?.vendorId || item?.owner || '').toLowerCase(),
    statusKey: isCritical ? 'breach' : isWarning ? 'warning' : 'ok',
    timestamp,
    ageLabel: formatAge(timestamp),
    entityKey: normalizeEntityKey(item?.id || `feed-${index}`),
    source: 'feed',
  };
};

const matchesDynamicFilter = (value: string, filterValue: unknown, allValue: string) => {
  const normalizedFilter = String(filterValue ?? allValue).trim().toLowerCase();
  if (!normalizedFilter || normalizedFilter === allValue) return true;
  return value.includes(normalizedFilter);
};

const filterRows = (rows: QueueRow[], filters?: OverviewTabProps['filters']) => {
  if (!filters) return rows;
  const siteFilter = filters.site ?? 'all-sites';
  const vendorFilter = filters.vendor ?? 'all-vendors';
  const periodFilter = filters.period ?? 'today';
  const statusFilter = filters.status ?? (filters.slaRisk === 'breaching' ? 'breach' : filters.slaRisk === 'approaching' ? 'warning' : 'all-status');
  const priorityFilter = filters.priority ?? 'priority-first';
  const issueTypeFilter = filters.issueType ?? 'all-issues';
  const ownerFilter = String(filters.owner ?? '').trim().toLowerCase();
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const periodStartByKey: Record<string, number> = {
    today: startOfToday.getTime(),
    'current-shift': now - 12 * 60 * 60 * 1000,
    week: now - 7 * 24 * 60 * 60 * 1000,
    month: now - 31 * 24 * 60 * 60 * 1000,
  };
  return rows.filter((row) => {
    const matchSite = matchesDynamicFilter(row.siteKey, siteFilter, 'all-sites');
    const matchVendor = matchesDynamicFilter(row.vendorKey, vendorFilter, 'all-vendors');
    const matchStatus = statusFilter === 'all-status' || row.statusKey === statusFilter;
    const matchPriority =
      priorityFilter === 'priority-first' ||
      priorityFilter === 'all-priorities' ||
      (priorityFilter === 'critical' && row.severity === 'critical') ||
      (priorityFilter === 'warning' && row.severity === 'warning');
    const matchIssueType =
      issueTypeFilter === 'all-issues' ||
      (issueTypeFilter === 'incident' && row.tab === 'incidents') ||
      (issueTypeFilter === 'patrol' && row.tab === 'sites') ||
      (issueTypeFilter === 'attendance' && row.tab === 'attendance') ||
      (issueTypeFilter === 'evidence' && row.tab === 'attachments');
    const matchOwner = !ownerFilter || row.owner.toLowerCase().includes(ownerFilter);
    const periodStart = periodStartByKey[periodFilter];
    const matchPeriod = row.source === 'priority' || !periodStart || !row.timestamp || row.timestamp >= periodStart;
    return matchSite && matchVendor && matchStatus && matchPriority && matchIssueType && matchOwner && matchPeriod;
  });
};

const severityRank: Record<Severity, number> = { critical: 3, warning: 2, ok: 1 };

const sortQueueRows = (rows: QueueRow[]) =>
  [...rows].sort((a, b) => {
    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta !== 0) return severityDelta;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

const riskSitesFrom = (anomalies: any[], mapData: any[], rows: QueueRow[]) => {
  const anomalySites = anomalies.slice(0, 4).map((item, index) => ({
    id: String(item?.id || `risk-${index}`),
    name: normalizeText(item?.locationName || item?.siteName || item?.title, `Mục tiêu rủi ro ${index + 1}`),
    reason: normalizeText(item?.reason || item?.summary, 'Cần kiểm tra dữ liệu hiện trường và lịch sử vi phạm.'),
    tone: String(item?.severity || item?.riskLevel || '').toUpperCase() === 'CRITICAL' ? 'critical' : 'warning',
  }));
  if (anomalySites.length > 0) return anomalySites;
  const grouped = new Map<string, { id: string; name: string; inactive: number; alert: number; lastStaff?: string }>();
  mapData.forEach((point) => {
    const name = siteNameFromText(point?.name || point?.siteName || '');
    if (!name) return;
    const current = grouped.get(name) ?? { id: String(point?.id || name), name, inactive: 0, alert: 0, lastStaff: point?.lastPatrol?.staff };
    if (point?.status === 'INACTIVE') current.inactive += 1;
    if (point?.status === 'SOS' || point?.type === 'ALERT') current.alert += 1;
    if (!current.lastStaff && point?.lastPatrol?.staff) current.lastStaff = point.lastPatrol.staff;
    grouped.set(name, current);
  });
  const mapRisks = Array.from(grouped.values())
    .filter((site) => site.alert > 0 || site.inactive >= 3)
    .sort((a, b) => (b.alert - a.alert) || (b.inactive - a.inactive))
    .slice(0, 4)
    .map((site) => ({
      id: site.id,
      name: site.name,
      reason: site.alert > 0
        ? `${site.alert} checkpoint có tín hiệu bất thường.`
        : `${site.inactive} checkpoint chưa có tín hiệu tuần tra gần đây${site.lastStaff ? ` · lần gần nhất: ${site.lastStaff}` : ''}.`,
      tone: site.alert > 0 ? 'critical' : 'warning',
    }));
  if (mapRisks.length > 0) return mapRisks;

  const rowRisks = new Map<string, { id: string; name: string; count: number; critical: number }>();
  rows.forEach((row) => {
    if (row.statusKey === 'ok' || row.siteShift === 'Chưa gắn site/ca') return;
    const name = row.siteShift.split(' · ')[0]?.trim();
    if (!name) return;
    const current = rowRisks.get(name) ?? { id: row.id, name, count: 0, critical: 0 };
    current.count += 1;
    if (row.severity === 'critical') current.critical += 1;
    rowRisks.set(name, current);
  });
  return Array.from(rowRisks.values())
    .sort((a, b) => (b.critical - a.critical) || (b.count - a.count))
    .slice(0, 4)
    .map((site) => ({
      id: site.id,
      name: site.name,
      reason: `${site.count} việc đang nằm trong hàng đợi xử lý${site.critical > 0 ? ` · ${site.critical} mức cao` : ''}.`,
      tone: site.critical > 0 ? 'critical' : 'warning',
    }));
};

const vendorAttentionFrom = (rows: QueueRow[]) => {
  const grouped = new Map<string, { name: string; count: number; critical: number }>();
  rows.forEach((row) => {
    if (row.statusKey === 'ok') return;
    const name = row.owner.trim();
    if (!name) return;
    const current = grouped.get(name) ?? { name, count: 0, critical: 0 };
    current.count += 1;
    if (row.severity === 'critical') current.critical += 1;
    grouped.set(name, current);
  });
  const top = Array.from(grouped.values()).sort((a, b) => (b.critical - a.critical) || (b.count - a.count))[0];
  if (!top) {
    return {
      value: 'Không có cảnh báo',
      helper: 'Không có nhà cung cấp vượt ngưỡng rủi ro theo bộ lọc hiện tại',
    };
  }
  return {
    value: top.name,
    helper: `${top.count} việc cần xử lý${top.critical > 0 ? ` · ${top.critical} mức cao` : ''}`,
  };
};

const systemStatusFrom = (breachCount: number, warningCount: number, openCount: number) => {
  if (breachCount > 0) {
    return {
      tone: 'critical' as const,
      title: 'Vận hành hôm nay: Nguy cấp',
      summary: `${openCount} việc cần xử lý · ${breachCount} SLA vi phạm · ${warningCount} việc sắp quá hạn`,
      helper: 'Ưu tiên xử lý các điểm breach trước để tránh lan sang đối soát hợp đồng và báo cáo SLA.',
    };
  }

  if (openCount > 0 || warningCount > 0) {
    return {
      tone: 'warning' as const,
      title: 'Vận hành hôm nay: Cần chú ý',
      summary: `${openCount} việc đang mở · ${warningCount} việc cần theo dõi · chưa có breach mới`,
      helper: 'Hệ thống chưa ở mức nguy cấp nhưng đang có tín hiệu cần điều phối hoặc kiểm tra thêm.',
    };
  }

  return {
    tone: 'ok' as const,
    title: 'Vận hành hôm nay: Ổn định',
    summary: 'Không có việc ưu tiên cao theo bộ lọc hiện tại',
    helper: 'Tiếp tục theo dõi ca trực, tuần tra và bằng chứng đối soát theo nhịp đang chạy.',
  };
};

export const OverviewTab: React.FC<OverviewTabProps> = React.memo(({
  stats,
  staff,
  mapData,
  priorities,
  monthlyInsights,
  filters,
  setActiveTab,
  onExportPriorities,
}) => {
  const { nocFeed, anomalies, anomalyStats, trustScore } = useDashboardStore(
    useShallow((state) => ({
      nocFeed: state.nocFeed,
      anomalies: state.anomalies,
      anomalyStats: state.anomalyStats,
      trustScore: state.trustScore,
    })),
  );

  const rawRows = useMemo(() => {
    const priorityRows = Array.isArray(priorities) ? priorities.map(rowFromPriority) : [];
    const feedRows = (Array.isArray(nocFeed) ? nocFeed : []).slice(0, 8).map(rowFromFeed);
    const byEntity = new Map<string, QueueRow>();
    [...priorityRows, ...feedRows].forEach((row) => {
      const existing = byEntity.get(row.entityKey);
      if (!existing) {
        byEntity.set(row.entityKey, row);
        return;
      }
      const stronger = severityRank[row.severity] > severityRank[existing.severity] ? row : existing;
      byEntity.set(row.entityKey, {
        ...existing,
        severity: stronger.severity,
        priority: stronger.priority,
        statusKey: stronger.statusKey,
        timestamp: Math.max(existing.timestamp || 0, row.timestamp || 0),
        ageLabel: formatAge(Math.max(existing.timestamp || 0, row.timestamp || 0)),
        details: existing.details || row.details,
        sla: stronger.sla || existing.sla,
      });
    });
    return sortQueueRows(Array.from(byEntity.values()));
  }, [priorities, nocFeed]);

  const filteredRows = useMemo(() => sortQueueRows(filterRows(rawRows, filters)), [rawRows, filters]);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const rows = useMemo(() => filteredRows.slice((page - 1) * pageSize, page * pageSize), [filteredRows, page]);
  const selectedRows = useMemo(() => filteredRows.filter((row) => selectedIds.includes(row.id)), [filteredRows, selectedIds]);
  const allRowsOnPageSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleRow = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePage = () => {
    setSelectedIds((current) => {
      const pageIds = rows.map((row) => row.id);
      if (pageIds.every((id) => current.includes(id))) return current.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const openCount = filteredRows.length;
  const breachCount = rows.filter((row) => row.statusKey === 'breach').length;
  const warningCount = rows.filter((row) => row.statusKey === 'warning').length;
  const patrolCompletionRate = Math.round(Number(stats?.completionRate || 0));
  const completedCheckpoints = Number(stats?.completedCheckpoints || 0);
  const totalCheckpoints = Number(stats?.totalCheckpoints || 0);
  const missedCheckpoints = Math.max(totalCheckpoints - completedCheckpoints, 0);
  const onlineStaffCount = Array.isArray(staff) ? staff.filter((member: any) => member?.isOnline || member?.status === 'ONLINE').length : 0;
  const riskSites = riskSitesFrom(Array.isArray(anomalies) ? anomalies : [], Array.isArray(mapData) ? mapData : [], rows);
  const vendorAttention = vendorAttentionFrom(rows);
  const trustScoreValue = Math.round(Number(trustScore?.averageScore || 0));
  const incidentRows = rows.filter((row) => row.tab === 'incidents').length;
  const patrolRows = rows.filter((row) => row.tab === 'sites').length;
  const shortageRows = rows.filter((row) => row.tab === 'attendance').length;
  const violationRows = rows.filter((row) => row.tab === 'violations').length;
  const aiIssues = Array.isArray(monthlyInsights?.criticalIssues) ? monthlyInsights.criticalIssues : [];
  const aiRecommendations = Array.isArray(monthlyInsights?.recommendations) ? monthlyInsights.recommendations : [];
  const isMonthlyAiDegraded = aiIssues.some((item: unknown) => String(item).toLowerCase().includes('ai') || String(item).toLowerCase().includes('api'));
  const filterSummary = `${filteredRows.length}/${rawRows.length} việc theo bộ lọc · ${shortageRows} thiếu quân · ${patrolRows} tuần tra lỗi · ${violationRows} vi phạm chờ review`;
  const systemStatus = systemStatusFrom(breachCount, warningCount, openCount);

  const kpis = [
    {
      label: 'Cần xử lý',
      value: `${openCount} việc mở`,
      helper: `${breachCount} quá hạn SLA`,
      tone: breachCount > 0 ? 'critical' : openCount > 0 ? 'warning' : 'ok',
      icon: <AlertTriangle size={18} />,
      onClick: () => setActiveTab('incidents', { priorityOnly: true }),
    },
    {
      label: 'Nhân sự ca trực',
      value: `${shortageRows} ca thiếu người`,
      helper: `${onlineStaffCount} nhân sự đang online`,
      tone: shortageRows > 0 ? 'critical' : 'ok',
      icon: <UsersRound size={18} />,
      onClick: () => setActiveTab('attendance'),
    },
    {
      label: 'Tuần tra',
      value: `${patrolCompletionRate}% hoàn thành`,
      helper: `${missedCheckpoints} điểm bỏ sót`,
      tone: patrolCompletionRate < 90 || patrolRows > 0 ? 'warning' : 'ok',
      icon: <ShieldAlert size={18} />,
      onClick: () => setActiveTab('sites'),
    },
    {
      label: 'SLA',
      value: `${breachCount} vi phạm`,
      helper: `${warningCount} sắp quá hạn`,
      tone: breachCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'ok',
      icon: <Clock3 size={18} />,
      onClick: () => setActiveTab('violations'),
    },
    {
      label: 'Nhà thầu cần chú ý',
      value: vendorAttention.value,
      helper: vendorAttention.helper,
      tone: rows.some((row) => row.owner === vendorAttention.value && row.severity === 'critical') ? 'critical' : rows.some((row) => row.owner === vendorAttention.value && row.statusKey !== 'ok') ? 'warning' : 'ok',
      icon: <FileWarning size={18} />,
      onClick: () => setActiveTab('vendors'),
    },
  ] as const;

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <section className={cn('rounded-[14px] border p-4 sm:p-5', surfaceToneClass[systemStatus.tone])}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-[11px] font-semibold text-current/85">
              Trạng thái hệ thống
            </div>
            <h2 className="mt-3 text-[20px] font-semibold text-white">{systemStatus.title}</h2>
            <p className="mt-1 text-[13px] font-medium text-current/90">{systemStatus.summary}</p>
            <p className="mt-2 max-w-3xl text-[12px] leading-6 text-slate-300">{systemStatus.helper}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:min-w-[480px]">
            <button
              type="button"
              onClick={() => setActiveTab('incidents', { priorityOnly: true })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-blue-600 px-4 text-[12px] font-semibold text-white hover:bg-blue-500"
            >
              Xem việc mức cao
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-slate-950/28 px-4 text-[12px] font-semibold text-slate-100 hover:bg-white/[0.06]"
            >
              Mở quân số & ca trực
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sites')} // Điều hướng đến tab Sites để xem tuyến tuần tra
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-slate-950/28 px-4 text-[12px] font-semibold text-slate-100 hover:bg-white/[0.06]"
            >
              Kiểm tra tuyến rủi ro
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SCMDCard glass={false} className="overflow-hidden rounded-[14px] border border-white/8 bg-slate-900/55 p-0">
          <div className="flex flex-col gap-3 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-white">Việc cần xử lý ngay</h2>
              <p className="mt-1 text-[12px] text-slate-400">Operations Queue dạng bảng: lọc, chọn hàng loạt, xử lý theo SLA và mở nhanh workspace liên quan.</p>
              <p className="mt-2 inline-flex rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                {filterSummary}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRows.length > 0 ? (
                <>
                  <SCMDButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(selectedRows[0]?.tab ?? 'tasks', { focusId: selectedRows[0]?.id, focusType: selectedRows[0]?.focusType })}
                    className="border border-blue-400/20 bg-blue-500/10 text-blue-100 hover:bg-blue-500/16 hover:text-white"
                  >
                    Giao xử lý ({selectedRows.length})
                  </SCMDButton>
                  <SCMDButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('attachments')}
                    className="border border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/16 hover:text-white"
                  >
                    Yêu cầu bổ sung bằng chứng
                  </SCMDButton>
                </>
              ) : null}
              <SCMDButton
                variant="ghost"
                size="sm"
                onClick={() => onExportPriorities('print', selectedRows.length > 0 ? selectedRows : filteredRows)}
                className="border border-white/10 bg-white/[0.025] text-slate-300 hover:bg-white/[0.05] hover:text-white"
              >
                <FileWarning size={14} /> Xuất {selectedRows.length > 0 ? 'dòng đã chọn' : 'danh sách'}
              </SCMDButton>
            </div>
          </div>

          <OpsSavedViews storageKey="scmd.overview.queue.views" defaultViews={["Tất cả", "Quá SLA", "Thiếu quân", "Vi phạm chờ review"]} />
          <div className="overflow-x-auto">
            <table className={cn(opsTableClass, 'w-full min-w-[800px]')}>
              <thead>
                <tr>
                  <th className={cn(opsThClass, 'w-10')}><input type="checkbox" checked={allRowsOnPageSelected} onChange={togglePage} aria-label="Chọn toàn bộ trang hiện tại" className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" /></th>
                  <th className={cn(opsThClass, 'w-8')}></th>
                  <th className={opsThClass}>Mức độ</th>
                  <th className={opsThClass}>Nhiệm vụ vận hành</th>
                  <th className={opsThClass}>Hạn xử lý (SLA)</th>
                  <th className={cn(opsThClass, 'text-right')}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <CheckCircle2 size={28} className="mx-auto text-emerald-300" />
                      <p className="mt-3 text-sm font-semibold text-white">Không có việc ưu tiên theo bộ lọc hiện tại</p>
                      <p className="mt-1 text-[12px] text-slate-400">Có thể vận hành đang ổn định hoặc bộ lọc hiện tại quá hẹp. Thử mở rộng site, vendor hoặc khoảng thời gian.</p>
                    </td>
                  </tr>
                ) : (
              rows.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr className={cn(opsRowClass, selectedIds.includes(row.id) && 'bg-blue-500/[0.045]', isExpanded && 'bg-white/[0.02] border-b-0')}>
                      <td className={opsTdClass}>
                        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} aria-label={`Chọn ${row.issue}`} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500" />
                      </td>
                      <td className={opsTdClass}>
                        <button 
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </button>
                      </td>
                      <td className={opsTdClass}>
                        <OpsStatusBadge value={row.severity === 'critical' ? 'HIGH' : row.severity === 'warning' ? 'WARNING' : 'OK'} />
                      </td>
                      <td className={opsTdClass}>
                        <p className="font-bold text-white truncate max-w-[300px] xl:max-w-[500px]">{row.issue}</p>
                      </td>
                      <td className={opsTdClass}>
                        <span className={cn("font-bold", row.statusKey === 'breach' ? 'text-red-300' : row.statusKey === 'warning' ? 'text-amber-200' : 'text-emerald-300')}>
                          {row.sla}
                        </span>
                      </td>
                      <td className={cn(opsTdClass, "text-right")}>
                        <SCMDButton 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white"
                          onClick={() => setActiveTab(row.tab, { focusId: row.id, focusType: row.focusType, priorityOnly: row.tab === 'incidents' })}
                        >
                          {row.action}
                        </SCMDButton>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-950/20 border-b border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <td colSpan={6} className="px-14 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mô tả chi tiết</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{row.details || 'Không có mô tả thêm'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Địa điểm & Ca trực</p>
                              <p className="text-sm font-bold text-white">{row.siteShift}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Đơn vị phụ trách</p>
                              <p className="text-sm font-bold text-white">{row.owner}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Thời gian phát sinh</p>
                              <p className="text-xs text-slate-400">{row.ageLabel}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold text-slate-500">
              Trang {page}/{totalPages} · Hiển thị {rows.length} / {filteredRows.length} việc · {selectedRows.length} dòng đã chọn
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="h-8 rounded-[9px] border border-white/10 px-3 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/[0.05]"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="h-8 rounded-[9px] border border-white/10 px-3 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/[0.05]"
              >
                Sau
              </button>
            </div>
          </div>
        </SCMDCard>

        <aside className="space-y-5">
          <SCMDCard glass={false} className="rounded-[14px] border border-white/8 bg-slate-900/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Ca hiện tại</h2>
                <p className="mt-1 text-[12px] text-slate-400">Tình trạng nhân sự và tuần tra đang chạy.</p>
              </div>
              <button type="button" onClick={() => setActiveTab('attendance')} className="text-[12px] font-semibold text-blue-300 hover:text-white">
                Mở ca trực
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <SideMetric label="Ca thiếu người" value={shortageRows} tone={shortageRows > 0 ? 'critical' : 'ok'} />
              <SideMetric label="Tuần tra chưa đạt" value={patrolRows} tone={patrolRows > 0 ? 'warning' : 'ok'} />
            </div>
          </SCMDCard>

          <SCMDCard glass={false} className="rounded-[14px] border border-white/8 bg-slate-900/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Mục tiêu rủi ro</h2>
                <p className="mt-1 text-[12px] text-slate-400">Ưu tiên kiểm tra hiện trường.</p>
              </div>
              <MapPinned size={18} className="text-amber-200" />
            </div>
            <div className="mt-3 space-y-2">
              {riskSites.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-white/10 px-3 py-4 text-[12px] text-slate-500">
                  Không có mục tiêu vượt ngưỡng rủi ro theo bộ lọc hiện tại.
                </p>
              ) : (
                riskSites.map((site, index) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => setActiveTab('audit')}
                    className="flex w-full items-start justify-between gap-3 rounded-[12px] border border-white/8 bg-slate-950/25 p-3 text-left hover:border-white/14"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">#{index + 1} {site.name}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-slate-500">{site.reason}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', site.tone === 'critical' ? severityClass.critical : severityClass.warning)}>
                      {site.tone === 'critical' ? 'Cao' : 'Cảnh báo'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </SCMDCard>

          <SCMDCard glass={false} className="rounded-[14px] border border-white/8 bg-slate-900/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Chất lượng dữ liệu</h2>
                <p className="mt-1 text-[12px] text-slate-400">Độ tin cậy dữ liệu đối soát.</p>
              </div>
              <span className={cn(
                'rounded-full border px-2.5 py-1 text-[12px] font-semibold',
                isMonthlyAiDegraded ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300',
              )}>
                {isMonthlyAiDegraded ? 'AI tạm gián đoạn' : `${trustScoreValue}%`}
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-slate-300">
              {isMonthlyAiDegraded
                ? 'Dữ liệu vận hành vẫn đang đồng bộ. Phân tích tháng bằng AI tạm gián đoạn, không dùng kết quả này để chốt đối soát.'
                : monthlyInsights?.summary || 'Chưa có phân tích tháng. Dữ liệu hiện tại được ưu tiên cho điều hành trong ngày.'}
            </p>
            {isMonthlyAiDegraded && (
              <p className="mt-3 rounded-[10px] border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-[12px] leading-5 text-amber-100/85">
                {aiRecommendations[0] || aiIssues[0] || 'Cần kiểm tra cấu hình dịch vụ phân tích trước khi xuất báo cáo tháng.'}
              </p>
            )}
          </SCMDCard>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.onClick}
            className={cn('rounded-[14px] border bg-white/[0.035] p-4 text-left transition-colors hover:bg-white/[0.055]', severityClass[kpi.tone])}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-slate-950/35">
                {kpi.icon}
              </div>
              <span className="text-[11px] font-semibold text-current/80">{kpi.label}</span>
            </div>
            <p className="mt-4 text-[20px] font-semibold text-white">{kpi.value}</p>
            <p className="mt-1 text-[12px] text-slate-400">{kpi.helper}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-300">
              Xem chi tiết
              <ChevronRight size={12} />
            </p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <AnalysisPanel
          title="Xu hướng tuần tra"
          value={`${patrolCompletionRate}%`}
          helper={`${formatNumber(completedCheckpoints)} / ${formatNumber(totalCheckpoints)} điểm đã ghi nhận`}
        />
        <AnalysisPanel
          title="Nhà cung cấp cần chú ý"
          value={vendorAttention.value}
          helper={vendorAttention.helper}
        />
        <AnalysisPanel
          title="Tín hiệu bất thường"
          value={formatNumber(anomalyStats ? Object.values(anomalyStats as Record<string, unknown>).reduce<number>((sum, value) => sum + Number(value || 0), 0) : incidentRows)}
          helper="Sự cố, tuần tra và dữ liệu cần rà soát"
        />
      </section>
    </motion.div>
  );
});

const SideMetric = ({ label, value, tone }: { label: string; value: React.ReactNode; tone: Severity }) => (
  <div className={cn('rounded-[12px] border px-3 py-3', severityClass[tone])}>
    <p className="text-[11px] text-current/75">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const AnalysisPanel = ({ title, value, helper }: { title: string; value: React.ReactNode; helper: string }) => (
  <SCMDCard glass={false} className="rounded-[14px] border border-white/8 bg-white/[0.035] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-2 text-[20px] font-semibold text-white">{value}</p>
        <p className="mt-1 text-[12px] text-slate-500">{helper}</p>
      </div>
      <RefreshCcw size={16} className="text-slate-500" />
    </div>
  </SCMDCard>
);
