import { IncidentSeverity, IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { SecurityContext, UserRole } from '../../core/architecture/types.js';
import { BadRequestError } from '../../core/errors/domain.error.js';
import { loggerContext } from '../../core/logger/index.js';

const LEGACY_RESOLUTION_MINUTES: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 240,
  [IncidentSeverity.MEDIUM]: 120,
  [IncidentSeverity.HIGH]: 60,
  [IncidentSeverity.CRITICAL]: 30,
};

export const FINAL_INCIDENT_STATUSES = [IncidentStatus.CLOSED, IncidentStatus.CANCELLED];

const INCIDENT_APPROVAL_ROLE_MATRIX: Record<IncidentSeverity, UserRole[]> = {
  [IncidentSeverity.LOW]: [UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN],
  [IncidentSeverity.MEDIUM]: [UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN],
  [IncidentSeverity.HIGH]: [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN],
  [IncidentSeverity.CRITICAL]: [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN],
};

export class IncidentSlaShared {
  static getSlaMinutes(severity: IncidentSeverity): number {
    return LEGACY_RESOLUTION_MINUTES[severity] ?? LEGACY_RESOLUTION_MINUTES[IncidentSeverity.LOW];
  }

  static buildSlaDeadline(severity: IncidentSeverity, from = new Date()): Date {
    return new Date(from.getTime() + this.getSlaMinutes(severity) * 60_000);
  }

  static allowedApprovalRoles(severity: IncidentSeverity): UserRole[] {
    return INCIDENT_APPROVAL_ROLE_MATRIX[severity] ?? INCIDENT_APPROVAL_ROLE_MATRIX[IncidentSeverity.LOW];
  }

  static assertCanApproveOrClose(role: UserRole, severity: IncidentSeverity, action: 'approve' | 'close' | 'reject') {
    const allowedRoles = this.allowedApprovalRoles(severity);
    if (!allowedRoles.includes(role)) {
      throw new BadRequestError(`ROLE_NOT_ALLOWED_TO_${action.toUpperCase()}_${severity}`);
    }
  }

  static async addTimeline(
    tx: any,
    input: {
      tenantId: string;
      incidentId: string;
      actorId?: string;
      actorRole?: string | null;
      action: IncidentTimelineAction;
      fromStatus?: IncidentStatus | null;
      toStatus?: IncidentStatus | null;
      notes?: string | null;
      evidenceIds?: string[];
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return await tx.incidentTimeline.create({
      data: this.timelineData(null, input),
    });
  }

  static async scheduleEscalation(tenantId: string, incidentJobKey: string, deadline: Date) {
    const delay = Math.max(0, deadline.getTime() - Date.now());
    const { QueueService } = await import('../../core/queue/index.js');
    await QueueService.addJob(
      'INCIDENT_SLA_ESCALATION_CHECK_TENANT',
      { type: 'INCIDENT_SLA_ESCALATION_CHECK_TENANT', tenantId, incidentId: incidentJobKey },
      `incident-sla:${incidentJobKey}`,
      { delay },
    );
  }

  static getMissingEvidenceTypes(requiredTypes: string[], evidences: any[]) {
    const activeTypes = new Set(
      evidences
        .filter((e) => e.status === 'ACTIVE')
        .flatMap((e) => [e.kind, e.fileType, e.sourceType])
        .filter(Boolean)
        .map((value) => String(value).toUpperCase()),
    );
    return (requiredTypes ?? []).filter((type) => !activeTypes.has(String(type).toUpperCase()));
  }

  static assertEvidenceWritable(evidence: { isReportLocked?: boolean | null; lockedByReportId?: string | null; lockedAt?: Date | null }) {
    if (evidence.isReportLocked || evidence.lockedByReportId || evidence.lockedAt) {
      throw new BadRequestError('INCIDENT_EVIDENCE_REPORT_LOCKED');
    }
  }

  static async invalidateIncident(tenantId: string, incidentId: string) {
    const { IncidentRepository } = await import('./incident.repository.js');
    await Promise.all([
      IncidentRepository.invalidateList(tenantId),
      IncidentRepository.invalidateDetail(incidentId),
    ]);
  }

  private static timelineData(
    ctx: Pick<SecurityContext, 'role'> | null,
    input: {
      tenantId: string;
      incidentId: string;
      actorId?: string;
      actorRole?: string | null;
      action: IncidentTimelineAction;
      fromStatus?: IncidentStatus | null;
      toStatus?: IncidentStatus | null;
      notes?: string | null;
      evidenceIds?: string[];
      metadata?: Record<string, unknown> | null;
    },
  ) {
    return {
      tenantId: input.tenantId,
      incidentId: input.incidentId,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? ctx?.role ?? null,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      notes: input.notes ?? null,
      evidenceIds: input.evidenceIds ?? [],
      traceId: loggerContext.getStore()?.traceId ?? null,
      metadata: input.metadata ?? undefined,
    };
  }
}
