import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { db } from '../../core/db/prisma.js';
import { PatrolRepository } from './repositories/patrol.repository.js';
import {
  VIOLATION_EVENT_DISPUTED_STATUSES,
  VIOLATION_EVENT_REVIEWABLE_STATUSES,
  normalizeViolationEventStatus,
} from '../../shared/business/violation-lifecycle.js';

type FeedStatus = 'SUCCESS' | 'WARNING' | 'CRITICAL';
type PrioritySeverity = 'CRITICAL' | 'WARNING';
type PriorityType = 'INCIDENT' | 'INCIDENT_SLA' | 'PATROL_MISSED' | 'PATROL_EXCEPTION' | 'SHIFT_SHORTAGE' | 'VIOLATION_REVIEW';

type FeedItem = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  message?: string;
  timestamp: string;
  status: FeedStatus;
  count?: number;
  isGrouped?: boolean;
  rank: number;
};

type PriorityTask = {
  id: string;
  type: PriorityType;
  title: string;
  description: string;
  severity: PrioritySeverity;
  rank: number;
  timestamp: string;
  siteId?: string | null;
  siteName?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  contractId?: string | null;
  shiftLabel?: string | null;
  routeName?: string | null;
  guardName?: string | null;
  assigneeName?: string | null;
  slaStatus?: 'BREACHED' | 'DUE_SOON' | 'WITHIN';
  dueAt?: string | null;
  sla?: string;
  nextAction?: string;
  targetRoute?: string;
};

const INCIDENT_SEVERITY_WEIGHT: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.REPORTED,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.ASSIGNED,
  IncidentStatus.INVESTIGATING,
  IncidentStatus.WAITING_VENDOR_RESPONSE,
  IncidentStatus.ESCALATED,
  IncidentStatus.RESOLVED,
  IncidentStatus.RESOLVED_PENDING_APPROVAL,
  IncidentStatus.REOPENED,
];

function severityLabel(value?: string | null) {
  const normalized = String(value || 'MEDIUM').toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
      return 'Sự cố nghiêm trọng';
    case 'HIGH':
      return 'Sự cố mức cao';
    case 'MEDIUM':
      return 'Sự cố mức trung bình';
    default:
      return 'Sự cố mức thấp';
  }
}

function incidentStatusLabel(status?: string | null) {
  switch (status) {
    case IncidentStatus.REPORTED:
      return 'Mới báo cáo';
    case IncidentStatus.ACKNOWLEDGED:
      return 'Đã tiếp nhận';
    case IncidentStatus.ASSIGNED:
      return 'Đã phân công';
    case IncidentStatus.INVESTIGATING:
      return 'Đang điều tra';
    case IncidentStatus.WAITING_VENDOR_RESPONSE:
      return 'Chờ phản hồi nhà thầu';
    case IncidentStatus.ESCALATED:
      return 'Đã escalated';
    case IncidentStatus.RESOLVED_PENDING_APPROVAL:
      return 'Chờ duyệt đóng';
    case IncidentStatus.REOPENED:
      return 'Đã mở lại';
    case IncidentStatus.RESOLVED:
      return 'Đã xử lý';
    default:
      return status || 'Đang mở';
  }
}

function dueLabel(dueAt?: Date | string | null, now = new Date()) {
  if (!dueAt) return 'Còn trong hạn';
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) return 'Còn trong hạn';
  const diffMinutes = Math.round((dueTime - now.getTime()) / 60_000);
  if (diffMinutes < 0) return `Quá hạn ${Math.abs(diffMinutes)} phút`;
  if (diffMinutes < 60) return `Còn ${diffMinutes} phút`;
  return `Còn ${Math.round(diffMinutes / 60)} giờ`;
}

function slaStatusFromDue(dueAt?: Date | string | null, breached = false, now = new Date()) {
  if (breached) return 'BREACHED' as const;
  if (!dueAt) return 'WITHIN' as const;
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) return 'WITHIN' as const;
  const diffMinutes = Math.round((dueTime - now.getTime()) / 60_000);
  if (diffMinutes < 0) return 'BREACHED' as const;
  if (diffMinutes <= 120) return 'DUE_SOON' as const;
  return 'WITHIN' as const;
}

function violationSeverity(value?: string | null): FeedStatus {
  const normalized = String(value || 'MEDIUM').toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'CRITICAL';
  return 'WARNING';
}

function incidentFeedStatus(incident: any, now: Date): FeedStatus {
  const severity = String(incident.severity || '').toUpperCase();
  if (incident.slaBreached || severity === 'CRITICAL' || severity === 'HIGH') return 'CRITICAL';
  if ((incident.responseDueAt && new Date(incident.responseDueAt) <= now) || (incident.resolutionDueAt && new Date(incident.resolutionDueAt) <= now)) {
    return 'CRITICAL';
  }
  return 'WARNING';
}

function incidentPriorityRank(incident: any, now: Date) {
  const severityWeight = INCIDENT_SEVERITY_WEIGHT[String(incident.severity || 'LOW').toUpperCase()] || 1;
  const overdueBoost = incident.slaBreached ? 500 : 0;
  const responseDueAt = incident.responseDueAt ? new Date(incident.responseDueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const resolutionDueAt = incident.resolutionDueAt ? new Date(incident.resolutionDueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const nearestDueAt = Math.min(responseDueAt, resolutionDueAt);
  const dueBoost = nearestDueAt <= now.getTime() ? 200 : 0;
  const pendingApprovalBoost = incident.status === IncidentStatus.RESOLVED_PENDING_APPROVAL ? 120 : 0;
  return overdueBoost + dueBoost + pendingApprovalBoost + severityWeight * 10;
}

function sortByRankAndTime<T extends { rank: number; timestamp: string }>(items: T[]) {
  return items.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export class CommandCenterRepository {
  static async getFeedByTenant(tenantId: string) {
    const now = new Date();
    const feed = await db.withTenant(tenantId, async (tx: any) => {
      const [incidents, violations, patrolSessions, assignments, shortages, suspiciousAttendance] = await Promise.all([
        tx.incident.findMany({
          where: { status: { in: OPEN_INCIDENT_STATUSES } },
          orderBy: [{ slaBreached: 'desc' }, { severityWeight: 'desc' }, { reportedAt: 'desc' }],
          take: 8,
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            description: true,
            reportedAt: true,
            responseDueAt: true,
            resolutionDueAt: true,
            slaBreached: true,
            siteId: true,
          },
        }),
        tx.violationEvent.findMany({
          where: { status: { in: [...VIOLATION_EVENT_REVIEWABLE_STATUSES, ...VIOLATION_EVENT_DISPUTED_STATUSES] } },
          orderBy: [{ occurredAt: 'desc' }],
          take: 6,
          select: {
            id: true,
            sourceType: true,
            violationType: true,
            severity: true,
            status: true,
            occurredAt: true,
            metadata: true,
          },
        }),
        tx.patrolSession.findMany({
          where: {
            OR: [
              { status: { in: ['IN_PROGRESS', 'PARTIAL', 'MISSED', 'INVALID'] } },
              { missedCheckpointCount: { gt: 0 } },
              { gpsViolationCount: { gt: 0 } },
              { evidenceMissingCount: { gt: 0 } },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: 8,
          include: {
            route: { select: { id: true, name: true } },
            staff: { select: { fullName: true, username: true } },
          },
        }),
        tx.patrolAssignment.findMany({
          where: {
            status: 'PLANNED',
            endAt: { lt: now },
          },
          orderBy: [{ endAt: 'asc' }],
          take: 6,
          include: {
            route: { select: { name: true } },
            staff: { select: { fullName: true, username: true } },
          },
        }),
        tx.shiftComplianceItem.findMany({
          where: {
            missingCount: { gt: 0 },
            status: { in: ['PENDING', 'PENALIZED'] },
          },
          orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
          take: 6,
          include: {
            shiftSchedule: {
              select: {
                id: true,
                positionName: true,
                shiftType: true,
                siteId: true,
                requiredCount: true,
              },
            },
          },
        }),
        tx.attendanceRecord.findMany({
          where: {
            isValid: false,
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 6,
          include: {
            staff: { select: { fullName: true, username: true } },
          },
        }),
      ]);

      const incidentFeed = incidents.map((incident: any): FeedItem => {
        const dueAt = incident.responseDueAt || incident.resolutionDueAt || incident.reportedAt;
        const overdueText = incident.slaBreached ? 'Đã quá SLA' : `Trạng thái ${incidentStatusLabel(incident.status)}`;
        return {
          id: `incident-${incident.id}`,
          type: incident.slaBreached ? 'INCIDENT_SLA' : 'INCIDENT',
          title: `${severityLabel(incident.severity)}: ${incident.type}`,
          subtitle: overdueText,
          message: incident.description,
          timestamp: new Date(dueAt).toISOString(),
          status: incidentFeedStatus(incident, now),
          rank: incidentPriorityRank(incident, now),
        };
      });

      const shortageFeed = shortages.map((item: any): FeedItem => ({
        id: `shift-shortage-${item.id}`,
        type: 'SHIFT_SHORTAGE',
        title: `Thiếu ${item.missingCount}/${item.requiredCount} bảo vệ`,
        subtitle: `${item.shiftSchedule?.positionName || 'Vị trí chưa đặt tên'} • ${item.shiftSchedule?.shiftType || item.date}`,
        message: `Coverage ${Math.round(item.complianceRate)}% • Site ${item.shiftSchedule?.siteId || 'N/A'}`,
        timestamp: new Date(item.updatedAt).toISOString(),
        status: item.missingCount >= 2 ? 'CRITICAL' : 'WARNING',
        rank: 420 + item.missingCount * 10,
      }));

      const assignmentFeed = assignments.map((assignment: any): FeedItem => ({
        id: `patrol-assignment-${assignment.id}`,
        type: 'MISSED_PATROL_ASSIGNMENT',
        title: 'Ca tuần tra chưa được khởi động',
        subtitle: assignment.route?.name || 'Tuyến chưa đặt tên',
        message: `${assignment.staff?.fullName || assignment.staff?.username || 'Chưa rõ nhân sự'} • quá giờ kế hoạch`,
        timestamp: new Date(assignment.endAt || assignment.createdAt || now).toISOString(),
        status: 'CRITICAL',
        rank: 390,
      }));

      const patrolFeed = patrolSessions.map((session: any): FeedItem => {
        const hasCriticalException = session.status === 'MISSED' || session.status === 'INVALID' || session.gpsViolationCount > 0 || session.missedCheckpointCount > 0;
        const exceptionParts = [
          session.missedCheckpointCount > 0 ? `missed ${session.missedCheckpointCount}` : null,
          session.gpsViolationCount > 0 ? `GPS ${session.gpsViolationCount}` : null,
          session.evidenceMissingCount > 0 ? `evidence ${session.evidenceMissingCount}` : null,
          session.lateCheckpointCount > 0 ? `late ${session.lateCheckpointCount}` : null,
        ].filter(Boolean);

        return {
          id: `patrol-session-${session.id}`,
          type: hasCriticalException ? 'PATROL_EXCEPTION' : 'PATROL_PROGRESS',
          title: `${session.route?.name || 'Tuyến tuần tra'} • ${session.status}`,
          subtitle: `${session.staff?.fullName || session.staff?.username || 'Guard'} • completion ${Math.round(session.completionPercent || 0)}%`,
          message: exceptionParts.length > 0 ? exceptionParts.join(' • ') : 'Đang thực hiện tuần tra',
          timestamp: new Date(session.updatedAt || session.startedAt || now).toISOString(),
          status: hasCriticalException ? 'CRITICAL' : 'WARNING',
          rank: hasCriticalException ? 310 : 220,
        };
      });

      const attendanceFeed = suspiciousAttendance.map((record: any): FeedItem => ({
        id: `attendance-${record.id}`,
        type: 'ATTENDANCE_SUSPICIOUS',
        title: 'Điểm danh nghi vấn',
        subtitle: `${record.staff?.fullName || record.staff?.username || 'Guard'} • ${record.type}`,
        message: record.notes || 'Điểm danh bị gắn cờ do GPS hoặc checkpoint không hợp lệ',
        timestamp: new Date(record.createdAt).toISOString(),
        status: 'WARNING',
        rank: 180,
      }));

      const violationFeed = violations.map((violation: any): FeedItem => ({
        id: `violation-${violation.id}`,
        type: 'VIOLATION_REVIEW',
        title: `Violation chờ review • ${violation.violationType}`,
        subtitle: `${violation.sourceType} • ${violation.status}`,
        message: `Severity ${violation.severity}`,
        timestamp: new Date(violation.occurredAt).toISOString(),
        status: violationSeverity(violation.severity),
        rank: normalizeViolationEventStatus(violation.status) === 'PENDING_REVIEW' ? 200 : 160,
      }));

      return sortByRankAndTime([
        ...incidentFeed,
        ...shortageFeed,
        ...assignmentFeed,
        ...patrolFeed,
        ...attendanceFeed,
        ...violationFeed,
      ]).slice(0, 20);
    }, { readOnly: true });

    return feed.map(({ rank, ...item }) => item);
  }

  static async getMapDataByTenant(tenantId: string) {
    const [checkpoints, recentLogs] = await Promise.all([
      PatrolRepository.getAllCheckpointsByTenant(tenantId),
      db.withTenant(tenantId, async (tx: any) => {
        return await tx.patrolLog.findMany({
          orderBy: [{ createdAt: 'desc' }],
          take: 100,
          include: {
            staff: { select: { fullName: true, username: true } },
          },
        });
      }, { readOnly: true }),
    ]);

    const latestLogByCheckpoint = new Map<string, any>();
    for (const log of recentLogs) {
      if (!latestLogByCheckpoint.has(log.checkpointId)) {
        latestLogByCheckpoint.set(log.checkpointId, log);
      }
    }

    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

    return checkpoints
      .filter((cp: any) => typeof cp?.latitude === 'number' && typeof cp?.longitude === 'number')
      .map((cp: any) => {
        const lastLog = latestLogByCheckpoint.get(cp.id);
        const isRecent = lastLog ? new Date(lastLog.createdAt).getTime() >= twelveHoursAgo : false;
        const isAlert = Boolean(
          lastLog && (
            lastLog.validationStatus !== 'VALID' ||
            (Array.isArray(lastLog.exceptionCodes) && lastLog.exceptionCodes.length > 0)
          )
        );

        return {
          id: cp.id,
          name: cp.name,
          lat: cp.latitude,
          lon: cp.longitude,
          status: isAlert ? 'SOS' : (isRecent ? 'ACTIVE' : 'INACTIVE'),
          type: isAlert ? 'ALERT' : 'CHECKPOINT',
          description: isAlert ? 'Checkpoint có scan bất thường gần nhất' : 'Checkpoint tuần tra',
          lastPatrol: lastLog ? {
            time: new Date(lastLog.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            staff: lastLog.staff?.fullName || lastLog.staff?.username || 'Guard',
          } : null,
        };
      });
  }

  static async getPrioritiesByTenant(tenantId: string) {
    const now = new Date();
    const priorities = await db.withTenant(tenantId, async (tx: any) => {
      const [incidents, shortages, assignments, patrolSessions, violations] = await Promise.all([
        tx.incident.findMany({
          where: {
            status: { in: OPEN_INCIDENT_STATUSES },
            OR: [
              { slaBreached: true },
              { severity: { in: [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH] } },
              { status: IncidentStatus.RESOLVED_PENDING_APPROVAL },
            ],
          },
          orderBy: [{ slaBreached: 'desc' }, { severityWeight: 'desc' }, { reportedAt: 'desc' }],
          take: 5,
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            slaBreached: true,
            responseDueAt: true,
            resolutionDueAt: true,
            reportedAt: true,
            siteId: true,
            vendorId: true,
            contractId: true,
            site: { select: { siteName: true } },
            vendor: { select: { name: true } },
            assignee: { select: { fullName: true, username: true } },
          },
        }),
        tx.shiftComplianceItem.findMany({
          where: {
            missingCount: { gt: 0 },
            status: { in: ['PENDING', 'PENALIZED'] },
          },
          orderBy: [{ missingCount: 'desc' }, { updatedAt: 'desc' }],
          take: 4,
          include: {
            shiftSchedule: { select: { positionName: true, shiftType: true, date: true, startTime: true, endTime: true, siteId: true, contractId: true } },
          },
        }),
        tx.patrolAssignment.findMany({
          where: {
            status: 'PLANNED',
            endAt: { lt: now },
          },
          orderBy: [{ endAt: 'asc' }],
          take: 4,
          include: {
            route: { select: { name: true, siteId: true, vendorId: true, contractId: true } },
            staff: { select: { fullName: true, username: true } },
          },
        }),
        tx.patrolSession.findMany({
          where: {
            OR: [
              { status: { in: ['MISSED', 'PARTIAL', 'INVALID'] } },
              { gpsViolationCount: { gt: 0 } },
              { missedCheckpointCount: { gt: 0 } },
            ],
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: 4,
          include: {
            route: { select: { name: true, siteId: true, vendorId: true, contractId: true } },
            staff: { select: { fullName: true, username: true } },
          },
        }),
        tx.violationEvent.findMany({
          where: {
            status: { in: [...VIOLATION_EVENT_REVIEWABLE_STATUSES, ...VIOLATION_EVENT_DISPUTED_STATUSES] },
          },
          orderBy: [{ occurredAt: 'desc' }],
          take: 4,
          select: {
            id: true,
            violationType: true,
            severity: true,
            status: true,
            occurredAt: true,
            siteId: true,
            vendorId: true,
            contractId: true,
            sourceType: true,
          },
        }),
      ]);

      const items: PriorityTask[] = [];
      const siteIds = new Set<string>();
      const vendorIds = new Set<string>();
      const registerScope = (siteId?: string | null, vendorId?: string | null) => {
        if (siteId) siteIds.add(siteId);
        if (vendorId) vendorIds.add(vendorId);
      };

      incidents.forEach((incident: any) => registerScope(incident.siteId, incident.vendorId));
      shortages.forEach((shortage: any) => registerScope(shortage.shiftSchedule?.siteId, null));
      assignments.forEach((assignment: any) => registerScope(assignment.route?.siteId, assignment.vendorId || assignment.route?.vendorId));
      patrolSessions.forEach((session: any) => registerScope(session.siteId || session.route?.siteId, session.vendorId || session.route?.vendorId));
      violations.forEach((violation: any) => registerScope(violation.siteId, violation.vendorId));

      const [sites, vendors] = await Promise.all([
        siteIds.size > 0
          ? tx.site.findMany({ where: { id: { in: Array.from(siteIds) } }, select: { id: true, siteName: true } })
          : Promise.resolve([]),
        vendorIds.size > 0
          ? tx.vendor.findMany({ where: { id: { in: Array.from(vendorIds) } }, select: { id: true, name: true } })
          : Promise.resolve([]),
      ]);
      const siteNameById = new Map(sites.map((site: any) => [site.id, site.siteName]));
      const vendorNameById = new Map(vendors.map((vendor: any) => [vendor.id, vendor.name]));

      for (const incident of incidents) {
        const dueAt = incident.resolutionDueAt || incident.responseDueAt || null;
        const rank = incidentPriorityRank(incident, now) + 200;
        items.push({
          id: `priority-incident-${incident.id}`,
          type: incident.slaBreached ? 'INCIDENT_SLA' : 'INCIDENT',
          title: incident.slaBreached
            ? `Sự cố quá SLA • ${incident.type}`
            : incident.status === IncidentStatus.RESOLVED_PENDING_APPROVAL
              ? `Sự cố chờ phê duyệt đóng • ${incident.type}`
              : `Sự cố ưu tiên cao • ${incident.type}`,
          description: `${severityLabel(incident.severity)} • ${incidentStatusLabel(incident.status)}`,
          severity: incident.slaBreached || String(incident.severity) === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          rank,
          timestamp: new Date(incident.reportedAt).toISOString(),
          sla: dueLabel(dueAt, now),
          siteId: incident.siteId,
          siteName: incident.site?.siteName || siteNameById.get(incident.siteId) || null,
          vendorId: incident.vendorId,
          vendorName: incident.vendor?.name || vendorNameById.get(incident.vendorId) || null,
          contractId: incident.contractId,
          assigneeName: incident.assignee?.fullName || incident.assignee?.username || 'Giám sát trực',
          slaStatus: slaStatusFromDue(dueAt, incident.slaBreached, now),
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          nextAction: incident.status === IncidentStatus.RESOLVED_PENDING_APPROVAL ? 'Duyệt kết quả xử lý' : 'Mở hồ sơ sự cố',
          targetRoute: `/admin/incidents?focusId=${incident.id}`,
        });
      }

      for (const shortage of shortages) {
        const siteId = shortage.shiftSchedule?.siteId || null;
        const shiftTime = `${shortage.shiftSchedule?.startTime || ''}–${shortage.shiftSchedule?.endTime || ''}`.replace(/^–$/, '').trim();
        items.push({
          id: `priority-shortage-${shortage.id}`,
          type: 'SHIFT_SHORTAGE',
          title: `Thiếu ${shortage.missingCount} bảo vệ tại ca`,
          description: `${shortage.shiftSchedule?.positionName || 'Vị trí chưa đặt tên'} • ${shortage.shiftSchedule?.shiftType || shortage.date}`,
          severity: shortage.missingCount >= 2 ? 'CRITICAL' : 'WARNING',
          rank: 600 + shortage.missingCount * 20,
          timestamp: new Date(shortage.updatedAt).toISOString(),
          siteId,
          siteName: siteId ? String(siteNameById.get(String(siteId)) || '') || null : null,
          contractId: shortage.contractId || shortage.shiftSchedule?.contractId || null,
          shiftLabel: [shortage.shiftSchedule?.date, shiftTime, shortage.shiftSchedule?.shiftType].filter(Boolean).join(' • '),
          assigneeName: 'Điều phối ca trực',
          slaStatus: shortage.missingCount >= 2 ? 'BREACHED' : 'DUE_SOON',
          dueAt: null,
          nextAction: 'Điều phối nhân sự',
          targetRoute: `/admin/attendance?focusId=${shortage.shiftScheduleId}`,
        });
      }

      for (const assignment of assignments) {
        const siteId = assignment.route?.siteId || null;
        const vendorId = assignment.vendorId || assignment.route?.vendorId || null;
        items.push({
          id: `priority-assignment-${assignment.id}`,
          type: 'PATROL_MISSED',
          title: 'Ca tuần tra quá hạn chưa khởi động',
          description: `${assignment.route?.name || 'Tuyến chưa đặt tên'} • ${assignment.staff?.fullName || assignment.staff?.username || 'Guard'}`,
          severity: 'CRITICAL',
          rank: 560,
          timestamp: new Date(assignment.endAt || assignment.createdAt || now).toISOString(),
          siteId,
          siteName: siteId ? String(siteNameById.get(String(siteId)) || '') || null : null,
          vendorId,
          vendorName: vendorId ? String(vendorNameById.get(String(vendorId)) || '') || null : null,
          contractId: assignment.contractId || assignment.route?.contractId || null,
          routeName: assignment.route?.name || null,
          guardName: assignment.staff?.fullName || assignment.staff?.username || null,
          assigneeName: 'Đội tuần tra',
          slaStatus: 'BREACHED',
          dueAt: assignment.endAt ? new Date(assignment.endAt).toISOString() : null,
          nextAction: 'Gửi nhắc tuần tra',
          targetRoute: `/admin/sites?focusId=${assignment.routeId}`,
        });
      }

      for (const session of patrolSessions) {
        const critical = session.status === 'MISSED' || session.status === 'INVALID' || session.gpsViolationCount > 0;
        const siteId = session.siteId || session.route?.siteId || null;
        const vendorId = session.vendorId || session.route?.vendorId || null;
        items.push({
          id: `priority-patrol-${session.id}`,
          type: critical ? 'PATROL_EXCEPTION' : 'PATROL_MISSED',
          title: critical ? 'Tuần tra có ngoại lệ nghiêm trọng' : 'Tuần tra chưa đạt target',
          description: `${session.route?.name || 'Tuyến tuần tra'} • ${session.staff?.fullName || session.staff?.username || 'Guard'}`,
          severity: critical ? 'CRITICAL' : 'WARNING',
          rank: critical ? 500 : 430,
          timestamp: new Date(session.updatedAt || session.startedAt || now).toISOString(),
          siteId,
          siteName: siteId ? String(siteNameById.get(String(siteId)) || '') || null : null,
          vendorId,
          vendorName: vendorId ? String(vendorNameById.get(String(vendorId)) || '') || null : null,
          contractId: session.contractId || session.route?.contractId || null,
          routeName: session.route?.name || null,
          guardName: session.staff?.fullName || session.staff?.username || null,
          assigneeName: 'Đội tuần tra',
          slaStatus: critical ? 'BREACHED' : 'DUE_SOON',
          dueAt: null,
          nextAction: critical ? 'Mở phiên tuần tra' : 'Gửi nhắc tuần tra',
          targetRoute: `/admin/sites?focusId=${session.routeId}`,
        });
      }

      for (const violation of violations) {
        const normalizedStatus = normalizeViolationEventStatus(violation.status);
        items.push({
          id: `priority-violation-${violation.id}`,
          type: 'VIOLATION_REVIEW',
          title: `Vi phạm chờ review • ${violation.violationType}`,
          description: `Severity ${violation.severity} • ${violation.status}`,
          severity: String(violation.severity).toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
          rank: normalizedStatus === 'PENDING_REVIEW' ? 420 : 360,
          timestamp: new Date(violation.occurredAt).toISOString(),
          siteId: violation.siteId,
          siteName: violation.siteId ? String(siteNameById.get(String(violation.siteId)) || '') || null : null,
          vendorId: violation.vendorId,
          vendorName: violation.vendorId ? String(vendorNameById.get(String(violation.vendorId)) || '') || null : null,
          contractId: violation.contractId,
          assigneeName: 'Reviewer SLA',
          slaStatus: normalizedStatus === 'PENDING_REVIEW' ? 'DUE_SOON' : 'WITHIN',
          dueAt: null,
          nextAction: normalizedStatus === 'DISPUTED' ? 'Xem phản hồi nhà thầu' : 'Review vi phạm',
          targetRoute: `/admin/violations?focusId=${violation.id}`,
        });
      }

      return sortByRankAndTime(items).slice(0, 8);
    }, { readOnly: true });

    return priorities.map(({ rank, ...item }) => item);
  }
}
