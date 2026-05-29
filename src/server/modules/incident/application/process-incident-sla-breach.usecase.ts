import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { db } from '../../../core/db/prisma.js';
import { NotificationService } from '../../notification/notification.service.js';
import { IncidentSlaShared, FINAL_INCIDENT_STATUSES } from '../incident-sla.shared.js';

export class ProcessIncidentSlaBreachUseCase {
  async execute(tenantId: string) {
    return await db.withTenant(tenantId, async (tx) => {
      const now = new Date();
      const responseOverdue = await tx.incident.findMany({
        where: {
          tenantId,
          responseDueAt: { lt: now },
          responseAcknowledgedAt: null,
          status: { in: [IncidentStatus.REPORTED, IncidentStatus.REOPENED] },
        },
        take: 100,
      });

      const resolutionOverdue = await tx.incident.findMany({
        where: {
          tenantId,
          resolutionDueAt: { lt: now },
          status: { notIn: FINAL_INCIDENT_STATUSES },
        },
        take: 100,
      });

      const breachedIds = new Set<string>();
      for (const incident of responseOverdue) {
        breachedIds.add(incident.id);
        await this.markSlaBreach(tx, tenantId, incident, 'INCIDENT_RESPONSE_SLA_BREACH', now);
      }
      for (const incident of resolutionOverdue) {
        breachedIds.add(incident.id);
        await this.markSlaBreach(tx, tenantId, incident, 'INCIDENT_RESOLUTION_SLA_BREACH', now);
      }

      if (breachedIds.size > 0) {
        const { IncidentRepository } = await import('../incident.repository.js');
        await IncidentRepository.invalidateList(tenantId);
        await Promise.all([...breachedIds].map((incidentId) => IncidentRepository.invalidateDetail(incidentId)));
      }

      return {
        escalated: breachedIds.size,
        responseBreached: responseOverdue.length,
        resolutionBreached: resolutionOverdue.length,
      };
    });
  }

  private async markSlaBreach(tx: any, tenantId: string, incident: any, breachType: string, now: Date) {
    const nextStatus = incident.status === IncidentStatus.REPORTED || incident.status === IncidentStatus.REOPENED
      ? IncidentStatus.ESCALATED
      : incident.status;

    await tx.incident.update({
      where: { id: incident.id },
      data: {
        status: nextStatus,
        escalatedAt: incident.escalatedAt ?? now,
        slaBreached: true,
      },
    });

    const existingTimeline = await tx.incidentTimeline.findFirst({
      where: {
        tenantId,
        incidentId: incident.id,
        action: IncidentTimelineAction.SLA_BREACHED,
        metadata: { path: ['breachType'], equals: breachType },
      },
      select: { id: true },
    });

    if (!existingTimeline) {
      await IncidentSlaShared.addTimeline(tx, {
        tenantId,
        incidentId: incident.id,
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        action: IncidentTimelineAction.SLA_BREACHED,
        fromStatus: incident.status,
        toStatus: nextStatus,
        notes: `${breachType} exceeded`,
        metadata: {
          breachType,
          responseDueAt: incident.responseDueAt?.toISOString() ?? null,
          resolutionDueAt: incident.resolutionDueAt?.toISOString() ?? null,
          escalatedAt: now.toISOString(),
        },
      });

      await NotificationService.send({
        tenantId,
        title: 'Sự cố quá hạn SLA',
        message: `Sự cố ${incident.type} đã quá hạn ${breachType === 'INCIDENT_RESPONSE_SLA_BREACH' ? 'phản hồi' : 'xử lý'}.`,
        type: 'CRITICAL',
        metadata: { incidentId: incident.id, severity: incident.severity, breachType },
      }, tx);
    }

    if (incident.vendorId || incident.contractId) {
      await tx.violationEvent.upsert({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: `incident:${incident.id}:${breachType}` } },
        update: {
          status: 'PENDING_REVIEW',
          occurredAt: now,
          metadata: {
            responseDueAt: incident.responseDueAt?.toISOString() ?? null,
            resolutionDueAt: incident.resolutionDueAt?.toISOString() ?? null,
          },
        },
        create: {
          tenantId,
          vendorId: incident.vendorId,
          contractId: incident.contractId,
          siteId: incident.siteId,
          staffId: incident.staffId,
          sourceType: 'INCIDENT',
          violationType: breachType,
          severity: incident.severity,
          status: 'PENDING_REVIEW',
          occurredAt: now,
          idempotencyKey: `incident:${incident.id}:${breachType}`,
          evidence: { incidentId: incident.id },
          metadata: {
            responseDueAt: incident.responseDueAt?.toISOString() ?? null,
            resolutionDueAt: incident.resolutionDueAt?.toISOString() ?? null,
          },
        },
      });
    }
  }
}
