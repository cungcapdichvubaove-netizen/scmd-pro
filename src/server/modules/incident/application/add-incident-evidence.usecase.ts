import { z } from 'zod';
import { IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { addIncidentEvidenceSchema } from '../incident.schema.js';
import { FINAL_INCIDENT_STATUSES, IncidentSlaShared } from '../incident-sla.shared.js';

const addIncidentEvidenceInputSchema = z.object({
  incidentId: z.string().uuid(),
}).and(addIncidentEvidenceSchema);

export type AddIncidentEvidenceInput = z.infer<typeof addIncidentEvidenceInputSchema>;

export class AddIncidentEvidenceUseCase extends BaseUseCase<AddIncidentEvidenceInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: AddIncidentEvidenceInput): Promise<void> {
    addIncidentEvidenceInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: AddIncidentEvidenceInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({ where: { id: input.incidentId } });
      if (!incident) throw new NotFoundError('Incident not found');
      if (FINAL_INCIDENT_STATUSES.includes(incident.status)) {
        throw new BadRequestError('INCIDENT_ALREADY_FINALIZED');
      }

      const timeline = await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: incident.id,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.EVIDENCE_ADDED,
        fromStatus: incident.status,
        toStatus: incident.status,
        notes: input.note,
        metadata: {
          kind: input.kind,
          uri: input.uri ?? input.fileUrl ?? null,
          ...(input.metadata ?? {}),
        },
      });

      const evidence = await tx.incidentEvidence.create({
        data: {
          tenantId: context.tenantId,
          incidentId: incident.id,
          timelineId: timeline.id,
          actorId: context.userId,
          uploadedBy: context.userId,
          sourceType: input.sourceType ?? 'INCIDENT',
          sourceId: input.sourceId ?? incident.id,
          kind: input.kind,
          uri: input.uri ?? input.fileUrl ?? null,
          fileType: input.fileType ?? null,
          fileUrl: input.fileUrl ?? input.uri ?? null,
          thumbnailUrl: input.thumbnailUrl ?? null,
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
          gpsLat: input.gpsLat ?? null,
          gpsLng: input.gpsLng ?? null,
          checksum: input.checksum ?? null,
          note: input.note ?? null,
          status: 'ACTIVE',
          metadata: input.metadata ?? undefined,
        },
      });

      await tx.incidentTimeline.update({
        where: { id: timeline.id },
        data: { evidenceIds: [evidence.id] },
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, incident.id);
      return evidence;
    });
  }
}
