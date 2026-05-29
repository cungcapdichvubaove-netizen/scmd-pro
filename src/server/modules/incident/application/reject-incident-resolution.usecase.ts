import { z } from 'zod';
import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';

const rejectIncidentResolutionInputSchema = z.object({
  incidentId: z.string().uuid(),
  reopenReason: z.string().min(5).max(1000),
  requiredNextAction: z.string().min(5).max(1000),
});

export type RejectIncidentResolutionInput = z.infer<typeof rejectIncidentResolutionInputSchema>;

export class RejectIncidentResolutionUseCase extends BaseUseCase<RejectIncidentResolutionInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: RejectIncidentResolutionInput): Promise<void> {
    rejectIncidentResolutionInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: RejectIncidentResolutionInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new NotFoundError('Incident not found');

      IncidentSlaShared.assertCanApproveOrClose(context.role, incident.severity, 'reject');

      if (incident.status !== IncidentStatus.RESOLVED_PENDING_APPROVAL && incident.status !== IncidentStatus.RESOLVED) {
        throw new BadRequestError('INCIDENT_RESOLUTION_NOT_REJECTABLE');
      }

      const now = new Date();
      const updated = await tx.incident.update({
        where: { id: input.incidentId },
        data: {
          status: IncidentStatus.REOPENED,
          reopenedAt: now,
          reopenReason: input.reopenReason,
          approvedById: null,
          closedById: null,
          closedAt: null,
        },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.RESOLUTION_REJECTED,
        fromStatus: incident.status,
        toStatus: IncidentStatus.REOPENED,
        notes: input.reopenReason,
        metadata: {
          requiredNextAction: input.requiredNextAction,
          reopenedAt: now.toISOString(),
        },
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
