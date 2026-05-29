import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared, FINAL_INCIDENT_STATUSES } from '../incident-sla.shared.js';

export interface AcknowledgeIncidentInput {
  incidentId: string;
  notes?: string | null;
}

export class AcknowledgeIncidentUseCase extends BaseUseCase<AcknowledgeIncidentInput, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, input: AcknowledgeIncidentInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new NotFoundError('Incident not found');
      if (FINAL_INCIDENT_STATUSES.includes(incident.status)) {
        throw new BadRequestError('INCIDENT_ALREADY_FINALIZED');
      }
      if (![IncidentStatus.REPORTED, IncidentStatus.ESCALATED, IncidentStatus.REOPENED].includes(incident.status)) {
        throw new BadRequestError('INVALID_INCIDENT_ACKNOWLEDGE_STATE');
      }

      const now = new Date();
      const updated = await tx.incident.update({
        where: { id: input.incidentId },
        data: {
          status: IncidentStatus.ACKNOWLEDGED,
          responseAcknowledgedAt: now,
          investigatingAt: incident.investigatingAt ?? now,
        },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.ACKNOWLEDGED,
        fromStatus: incident.status,
        toStatus: IncidentStatus.ACKNOWLEDGED,
        notes: input.notes,
        metadata: {
          responseDueAt: incident.responseDueAt?.toISOString() ?? null,
          acknowledgedAt: now.toISOString(),
        },
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
