import { z } from 'zod';
import { IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { db } from '../../../core/db/prisma.js';
import { NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';

const updateIncidentEvidenceStatusInputSchema = z.object({
  incidentId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'REJECTED', 'ARCHIVED']),
  note: z.string().max(1000).optional().nullable(),
});

export type UpdateIncidentEvidenceStatusInput = z.infer<typeof updateIncidentEvidenceStatusInputSchema>;

export class UpdateIncidentEvidenceStatusUseCase extends BaseUseCase<UpdateIncidentEvidenceStatusInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: UpdateIncidentEvidenceStatusInput): Promise<void> {
    updateIncidentEvidenceStatusInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: UpdateIncidentEvidenceStatusInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const evidence = await tx.incidentEvidence.findFirst({
        where: {
          id: input.evidenceId,
          incidentId: input.incidentId,
          tenantId: context.tenantId,
        },
      });
      if (!evidence) throw new NotFoundError('Evidence not found');

      IncidentSlaShared.assertEvidenceWritable(evidence);

      const updated = await tx.incidentEvidence.update({
        where: { id: input.evidenceId },
        data: { status: input.status },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.EVIDENCE_ADDED,
        evidenceIds: [input.evidenceId],
        notes: input.note ?? `Evidence ${input.status}`,
        metadata: {
          evidenceId: input.evidenceId,
          beforeStatus: evidence.status,
          afterStatus: input.status,
        },
      });

      await AuditService.log({
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'INCIDENT_EVIDENCE_STATUS_UPDATE',
        resource: `incident/${input.incidentId}/evidence/${input.evidenceId}`,
        diff: { before: { status: evidence.status }, after: { status: input.status } },
        status: 'SUCCESS',
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
