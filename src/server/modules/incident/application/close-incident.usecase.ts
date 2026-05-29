import { z } from 'zod';
import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';

const closeIncidentInputSchema = z.object({
  incidentId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CloseIncidentInput = z.infer<typeof closeIncidentInputSchema>;

export class CloseIncidentUseCase extends BaseUseCase<CloseIncidentInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: CloseIncidentInput): Promise<void> {
    closeIncidentInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: CloseIncidentInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new NotFoundError('Incident not found');

      IncidentSlaShared.assertCanApproveOrClose(context.role, incident.severity, 'close');

      if (incident.status !== IncidentStatus.RESOLVED) {
        throw new BadRequestError('INCIDENT_MUST_BE_APPROVED_BEFORE_CLOSE');
      }
      if (!incident.approvedById) {
        throw new BadRequestError('INCIDENT_APPROVER_REQUIRED_BEFORE_CLOSE');
      }

      const now = new Date();
      const updated = await tx.incident.update({
        where: { id: input.incidentId },
        data: {
          status: IncidentStatus.CLOSED,
          closedById: context.userId,
          closedAt: now,
        },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.CLOSED,
        fromStatus: incident.status,
        toStatus: IncidentStatus.CLOSED,
        notes: input.notes,
        metadata: {
          approvedById: incident.approvedById,
          closedAt: now.toISOString(),
        },
      });

      await AuditService.log({
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'INCIDENT_CLOSE',
        resource: `incident/${input.incidentId}`,
        payload: { closedById: context.userId, closedAt: now.toISOString() },
        status: 'SUCCESS',
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
