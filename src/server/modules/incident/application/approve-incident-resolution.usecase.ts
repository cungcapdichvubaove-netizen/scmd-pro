import { z } from 'zod';
import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { db } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';

const approveIncidentResolutionInputSchema = z.object({
  incidentId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ApproveIncidentResolutionInput = z.infer<typeof approveIncidentResolutionInputSchema>;

export class ApproveIncidentResolutionUseCase extends BaseUseCase<ApproveIncidentResolutionInput, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected override async validate(request: ApproveIncidentResolutionInput): Promise<void> {
    approveIncidentResolutionInputSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, input: ApproveIncidentResolutionInput): Promise<any> {
    return await db.withTenant(context.tenantId, async (tx) => {
      const incident = await tx.incident.findUnique({
        where: { id: input.incidentId },
        include: { evidences: { where: { status: 'ACTIVE' } } },
      });
      if (!incident) throw new NotFoundError('Incident not found');

      IncidentSlaShared.assertCanApproveOrClose(context.role, incident.severity, 'approve');

      if (incident.status !== IncidentStatus.RESOLVED_PENDING_APPROVAL && incident.status !== IncidentStatus.RESOLVED) {
        throw new BadRequestError('INCIDENT_NOT_PENDING_RESOLUTION_APPROVAL');
      }
      if (!incident.resolutionNotes?.trim()) {
        throw new BadRequestError('INCIDENT_RESOLUTION_NOTE_REQUIRED');
      }
      if (!incident.resolvedById) {
        throw new BadRequestError('INCIDENT_RESOLUTION_SUBMITTER_REQUIRED');
      }
      if (incident.resolvedById === context.userId) {
        throw new BadRequestError('INCIDENT_RESOLUTION_SELF_APPROVAL_FORBIDDEN');
      }
      if (incident.status === IncidentStatus.RESOLVED && incident.approvedById) {
        throw new BadRequestError('INCIDENT_RESOLUTION_ALREADY_APPROVED');
      }

      const missingEvidence = IncidentSlaShared.getMissingEvidenceTypes(incident.requiredEvidenceTypes, incident.evidences);
      if (missingEvidence.length > 0) {
        throw new BadRequestError(`MISSING_REQUIRED_EVIDENCE:${missingEvidence.join(',')}`);
      }

      const now = new Date();
      const slaBreached = Boolean(incident.resolutionDueAt && now > incident.resolutionDueAt) || incident.slaBreached;
      const updated = await tx.incident.update({
        where: { id: input.incidentId },
        data: {
          status: IncidentStatus.RESOLVED,
          approvedById: context.userId,
          closedById: null,
          closedAt: null,
          slaBreached,
        },
      });

      await IncidentSlaShared.addTimeline(tx, {
        tenantId: context.tenantId,
        incidentId: input.incidentId,
        actorId: context.userId,
        actorRole: context.role,
        action: IncidentTimelineAction.RESOLUTION_APPROVED,
        fromStatus: incident.status,
        toStatus: IncidentStatus.RESOLVED,
        notes: input.notes,
        metadata: {
          approvedAt: now.toISOString(),
          slaBreached,
        },
      });

      await AuditService.log({
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'INCIDENT_RESOLUTION_APPROVE',
        resource: `incident/${input.incidentId}`,
        payload: { approvedById: context.userId, approvedAt: now.toISOString(), slaBreached },
        status: 'SUCCESS',
      });

      await IncidentSlaShared.invalidateIncident(context.tenantId, input.incidentId);
      return updated;
    });
  }
}
