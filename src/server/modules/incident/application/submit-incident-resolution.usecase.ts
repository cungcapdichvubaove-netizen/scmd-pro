import { z } from 'zod';
import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { FINAL_INCIDENT_STATUSES, IncidentSlaShared } from '../incident-sla.shared.js';

const submitIncidentResolutionInputSchema = z.object({
  incidentId: z.string().uuid(),
  notes: z.string().min(1).max(2000),
  images: z.array(z.string().url()).optional().default([]),
});

export type SubmitIncidentResolutionInput = z.infer<typeof submitIncidentResolutionInputSchema>;

export class SubmitIncidentResolutionUseCase extends BaseUseCase<SubmitIncidentResolutionInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: SubmitIncidentResolutionInput): Promise<void> {
    submitIncidentResolutionInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: SubmitIncidentResolutionInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new NotFoundError('Incident not found');
      if (FINAL_INCIDENT_STATUSES.includes(incident.status)) {
        throw new BadRequestError('INCIDENT_ALREADY_FINALIZED');
      }

      const now = new Date();
      const updated = await tx.incident.update({
        where: { id: input.incidentId },
        data: {
          status: IncidentStatus.RESOLVED_PENDING_APPROVAL,
          resolvedAt: now,
          resolutionSubmittedAt: now,
          resolvedById: context.userId,
          approvedById: null,
          closedById: null,
          closedAt: null,
          resolutionNotes: input.notes,
          resolutionImages: input.images,
        },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.RESOLUTION_SUBMITTED,
        fromStatus: incident.status,
        toStatus: IncidentStatus.RESOLVED_PENDING_APPROVAL,
        notes: input.notes,
        metadata: {
          resolutionImages: input.images,
          resolutionSubmittedAt: now.toISOString(),
        },
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
