import { IncidentEvidenceKind, IncidentTimelineAction, IncidentStatus } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaCalculator } from '../incident-sla.calculator.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';

export class RecordIncidentCreatedUseCase extends BaseUseCase<string, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, incidentId: string): Promise<any> {
    const incident = await db.forTenant(context.tenantId, { readOnly: true }).incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) throw new NotFoundError('Incident not found');

    const reportedAt = incident.reportedAt ?? new Date();
    const decision = await IncidentSlaCalculator.resolve(db.forTenant(context.tenantId), {
      tenantId: context.tenantId,
      contractId: incident.contractId,
      siteId: incident.siteId,
      severity: incident.severity,
      incidentType: incident.type,
      reportedAt,
    });

    const updated = await db.withTenant(context.tenantId, async (tx) => {
      const nextIncident = await tx.incident.update({
        where: { id: incident.id },
        data: {
          slaMinutes: decision.resolutionDueMinutes,
          slaDeadline: decision.resolutionDueAt,
          responseDueAt: decision.responseDueAt,
          resolutionDueAt: decision.resolutionDueAt,
          requiredEvidenceTypes: decision.requiredEvidenceTypes,
        },
      });

      await tx.incidentTimeline.createMany({
        data: [
          {
            tenantId: context.tenantId,
            incidentId: incident.id,
            actorId: context.userId,
            actorRole: context.role,
            action: IncidentTimelineAction.REPORTED,
            fromStatus: null,
            toStatus: IncidentStatus.REPORTED,
            notes: incident.description,
            evidenceIds: [],
            traceId: null,
            metadata: {
              severity: incident.severity,
              type: incident.type,
              vendorId: incident.vendorId ?? null,
              contractId: incident.contractId ?? null,
              siteId: incident.siteId ?? null,
            },
          },
          {
            tenantId: context.tenantId,
            incidentId: incident.id,
            actorId: 'SYSTEM',
            actorRole: 'SYSTEM',
            action: IncidentTimelineAction.SLA_ASSIGNED,
            fromStatus: null,
            toStatus: IncidentStatus.REPORTED,
            notes: null,
            evidenceIds: [],
            traceId: null,
            metadata: {
              ruleId: decision.ruleId,
              responseDueMinutes: decision.responseDueMinutes,
              resolutionDueMinutes: decision.resolutionDueMinutes,
              responseDueAt: decision.responseDueAt.toISOString(),
              resolutionDueAt: decision.resolutionDueAt.toISOString(),
              requiredEvidenceTypes: decision.requiredEvidenceTypes,
            },
          },
        ],
      });

      if (incident.imageUri) {
        await tx.incidentEvidence.create({
          data: {
            tenantId: context.tenantId,
            incidentId: incident.id,
            actorId: context.userId,
            uploadedBy: context.userId,
            kind: IncidentEvidenceKind.PHOTO,
            uri: incident.imageUri,
            fileUrl: incident.imageUri,
            sourceType: 'INCIDENT',
            sourceId: incident.id,
            note: 'Initial incident evidence',
          },
        });
      }

      return nextIncident;
    });

    await IncidentSlaShared.scheduleEscalation(context.tenantId, incident.id, decision.responseDueAt);
    await IncidentSlaShared.scheduleEscalation(context.tenantId, `${incident.id}:resolution`, decision.resolutionDueAt);
    return updated;
  }
}
