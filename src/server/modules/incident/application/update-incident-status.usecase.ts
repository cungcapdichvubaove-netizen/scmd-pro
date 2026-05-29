import { IncidentStatus, IncidentTimelineAction } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { db as pgDb } from '../../../core/db/prisma.js';
import { BadRequestError, NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentSlaShared } from '../incident-sla.shared.js';
import { AcknowledgeIncidentUseCase } from './acknowledge-incident.usecase.js';
import { ApproveIncidentResolutionUseCase } from './approve-incident-resolution.usecase.js';
import { CloseIncidentUseCase } from './close-incident.usecase.js';
import { RejectIncidentResolutionUseCase } from './reject-incident-resolution.usecase.js';
import { SubmitIncidentResolutionUseCase } from './submit-incident-resolution.usecase.js';
import { updateIncidentStatusRequestSchema } from '../incident.schema.js';

export interface UpdateIncidentStatusInput {
  id: string;
  status: string;
  resolutionNotes?: string;
  resolutionImages?: string[];
  reopenReason?: string;
  requiredNextAction?: string;
}

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.REPORTED]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.INVESTIGATING, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
  [IncidentStatus.ACKNOWLEDGED]: [IncidentStatus.ASSIGNED, IncidentStatus.INVESTIGATING, IncidentStatus.WAITING_VENDOR_RESPONSE, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
  [IncidentStatus.ASSIGNED]: [IncidentStatus.INVESTIGATING, IncidentStatus.WAITING_VENDOR_RESPONSE, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
  [IncidentStatus.INVESTIGATING]: [IncidentStatus.WAITING_VENDOR_RESPONSE, IncidentStatus.RESOLVED_PENDING_APPROVAL, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
  [IncidentStatus.WAITING_VENDOR_RESPONSE]: [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED_PENDING_APPROVAL, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
  [IncidentStatus.ESCALATED]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED_PENDING_APPROVAL, IncidentStatus.CANCELLED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED, IncidentStatus.REOPENED],
  [IncidentStatus.RESOLVED_PENDING_APPROVAL]: [IncidentStatus.RESOLVED, IncidentStatus.REOPENED],
  [IncidentStatus.REOPENED]: [IncidentStatus.ACKNOWLEDGED, IncidentStatus.INVESTIGATING, IncidentStatus.CANCELLED],
  [IncidentStatus.CLOSED]: [IncidentStatus.REOPENED],
  [IncidentStatus.CANCELLED]: [],
};

export class UpdateIncidentStatusUseCase extends BaseUseCase<UpdateIncidentStatusInput, any> {
  private readonly acknowledgeIncidentUseCase = new AcknowledgeIncidentUseCase();
  private readonly submitIncidentResolutionUseCase = new SubmitIncidentResolutionUseCase();
  private readonly approveIncidentResolutionUseCase = new ApproveIncidentResolutionUseCase();
  private readonly closeIncidentUseCase = new CloseIncidentUseCase();
  private readonly rejectIncidentResolutionUseCase = new RejectIncidentResolutionUseCase();

  override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  override async validate(request: UpdateIncidentStatusInput): Promise<void> {
    updateIncidentStatusRequestSchema.parse(request);

    const targetStatus = request.status.toUpperCase() as IncidentStatus;
    if (!Object.values(IncidentStatus).includes(targetStatus)) {
      throw new BadRequestError('INVALID_INCIDENT_STATUS');
    }
  }

  override async internalExecute(ctx: SecurityContext, input: UpdateIncidentStatusInput): Promise<any> {
    const targetStatus = input.status.toUpperCase() as IncidentStatus;
    if (!Object.values(IncidentStatus).includes(targetStatus)) {
      throw new BadRequestError('INVALID_INCIDENT_STATUS');
    }

    if (targetStatus === IncidentStatus.ACKNOWLEDGED) {
      return await this.acknowledgeIncidentUseCase.execute(ctx, { incidentId: input.id });
    }
    if (targetStatus === IncidentStatus.RESOLVED_PENDING_APPROVAL) {
      return await this.submitIncidentResolutionUseCase.execute(ctx, {
        incidentId: input.id,
        notes: input.resolutionNotes ?? '',
        images: input.resolutionImages ?? [],
      });
    }
    if (targetStatus === IncidentStatus.CLOSED) {
      const existingIncident = await pgDb.forTenant(ctx.tenantId!).incident.findUnique({ where: { id: input.id } });
      if (!existingIncident) throw new NotFoundError('Incident not found');
      const fromStatus = existingIncident.status as IncidentStatus;
      if (!TRANSITIONS[fromStatus]?.includes(targetStatus)) {
        throw new BadRequestError(`Không thể chuyển trạng thái sự cố từ '${fromStatus}' sang '${targetStatus}'`);
      }
      return await this.closeIncidentUseCase.execute(ctx, {
        incidentId: input.id,
        notes: input.resolutionNotes,
      });
    }
    if (targetStatus === IncidentStatus.RESOLVED) {
      const existingIncident = await pgDb.forTenant(ctx.tenantId!).incident.findUnique({ where: { id: input.id } });
      if (!existingIncident) throw new NotFoundError('Incident not found');
      const fromStatus = existingIncident.status as IncidentStatus;
      if (fromStatus === IncidentStatus.INVESTIGATING) {
        const tenantWriter = typeof (pgDb as any).withTenant === 'function'
          ? (operation: (tx: any) => Promise<any>) => (pgDb as any).withTenant(ctx.tenantId!, operation)
          : async (operation: (tx: any) => Promise<any>) => operation(pgDb.forTenant(ctx.tenantId!));

        return await tenantWriter(async (tx) => {
          const now = new Date();
          const updated = await tx.incident.update({
            where: { id: input.id },
            data: {
              status: IncidentStatus.RESOLVED,
              resolvedAt: now,
              resolutionNotes: input.resolutionNotes ?? null,
              resolutionImages: input.resolutionImages ?? [],
            },
          });

          if (tx.incidentTimeline?.create) {
            await IncidentSlaShared.addTimeline(tx, {
              tenantId: ctx.tenantId!,
              incidentId: input.id,
              actorId: ctx.userId,
              actorRole: ctx.role,
              action: IncidentTimelineAction.STATUS_CHANGED,
              fromStatus,
              toStatus: IncidentStatus.RESOLVED,
              notes: input.resolutionNotes,
              metadata: { resolutionImages: input.resolutionImages ?? [] },
            });
          }

          return updated;
        });
      }
      if (!TRANSITIONS[fromStatus]?.includes(targetStatus)) {
        throw new BadRequestError(`Không thể chuyển trạng thái sự cố từ '${fromStatus}' sang '${targetStatus}'`);
      }
      return await this.approveIncidentResolutionUseCase.execute(ctx, {
        incidentId: input.id,
        notes: input.resolutionNotes,
      });
    }
    if (targetStatus === IncidentStatus.REOPENED) {
      return await this.rejectIncidentResolutionUseCase.execute(ctx, {
        incidentId: input.id,
        reopenReason: input.reopenReason ?? '',
        requiredNextAction: input.requiredNextAction ?? input.reopenReason ?? '',
      });
    }

    const existingIncident = await pgDb.forTenant(ctx.tenantId!).incident.findUnique({ where: { id: input.id } });
    if (!existingIncident) throw new NotFoundError('Incident not found');

    const fromStatus = existingIncident.status as IncidentStatus;
    if (!TRANSITIONS[fromStatus]?.includes(targetStatus)) {
      throw new BadRequestError(`Không thể chuyển trạng thái sự cố từ '${fromStatus}' sang '${targetStatus}'`);
    }

    const now = new Date();
    const updateData: any = { status: targetStatus };
    if (targetStatus === IncidentStatus.INVESTIGATING || targetStatus === IncidentStatus.ESCALATED) {
      updateData.investigatingAt = existingIncident.investigatingAt ?? now;
    }
    if (targetStatus === IncidentStatus.CANCELLED) {
      updateData.closedAt = now;
      updateData.closedById = ctx.userId;
    }
    if (targetStatus === IncidentStatus.ESCALATED) {
      updateData.escalatedAt = existingIncident.escalatedAt ?? now;
    }

    const tenantWriter = typeof (pgDb as any).withTenant === 'function'
      ? (operation: (tx: any) => Promise<any>) => (pgDb as any).withTenant(ctx.tenantId!, operation)
      : async (operation: (tx: any) => Promise<any>) => operation(pgDb.forTenant(ctx.tenantId!));

    const incident = await tenantWriter(async (tx) => {
      const updated = await tx.incident.update({
        where: { id: input.id },
        data: updateData,
      });

      if (tx.incidentTimeline?.create) {
        await IncidentSlaShared.addTimeline(tx, {
          tenantId: ctx.tenantId!,
          incidentId: input.id,
          actorId: ctx.userId,
          actorRole: ctx.role,
          action: targetStatus === IncidentStatus.CANCELLED
            ? IncidentTimelineAction.CANCELLED
            : targetStatus === IncidentStatus.ESCALATED
              ? IncidentTimelineAction.ESCALATED
              : IncidentTimelineAction.STATUS_CHANGED,
          fromStatus,
          toStatus: targetStatus,
          notes: input.reopenReason ?? input.resolutionNotes,
          metadata: { resolutionImages: input.resolutionImages ?? [] },
        });
      }

      return updated;
    });

    const { IncidentRepository } = await import('../incident.repository.js');
    await Promise.all([
      IncidentRepository.invalidateList(ctx.tenantId!),
      IncidentRepository.invalidateDetail(input.id),
    ]);

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId!,
      action: 'INCIDENT_STATUS_UPDATE',
      resource: `incident/${input.id}`,
      diff: { before: { status: fromStatus }, after: { status: targetStatus } },
      status: 'SUCCESS',
    });

    return incident;
  }
}
