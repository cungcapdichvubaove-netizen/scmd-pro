
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db as pgDb } from '../../../core/db/prisma.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { IncidentStatus } from '@prisma/client';
import { updateIncidentSchema } from '../incident.schema.js';
import { NotFoundError, BadRequestError } from '../../../core/errors/domain.error.js';

export interface UpdateIncidentStatusInput {
  id: string;
  status: string;
  resolutionNotes?: string;
  resolutionImages?: string[];
}

export class UpdateIncidentStatusUseCase extends BaseUseCase<UpdateIncidentStatusInput, any> {
  override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  override async validate(request: UpdateIncidentStatusInput): Promise<void> {
    const dataToValidate = {
      status: request.status.toUpperCase() as IncidentStatus,
      resolutionNotes: request.resolutionNotes,
      resolutionImages: request.resolutionImages,
    };
    updateIncidentSchema.parse(dataToValidate);
  }

  override async internalExecute(ctx: SecurityContext, input: UpdateIncidentStatusInput): Promise<any> {
    const { id, status: inputStatus, resolutionNotes, resolutionImages } = input;
    
    const targetStatus = inputStatus.toUpperCase() as IncidentStatus;
    // status enumeration check is now handled by updateIncidentSchema via Zod nativeEnum

    const existingIncident = await pgDb.forTenant(ctx.tenantId!).incident.findUnique({
      where: { id }
    });

    if (!existingIncident) {
      throw new NotFoundError('Incident not found');
    }

    const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
      [IncidentStatus.REPORTED]:      [IncidentStatus.INVESTIGATING, IncidentStatus.CANCELLED],
      [IncidentStatus.INVESTIGATING]: [IncidentStatus.RESOLVED, IncidentStatus.ESCALATED, IncidentStatus.CANCELLED],
      [IncidentStatus.ESCALATED]:     [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED, IncidentStatus.CANCELLED],
      [IncidentStatus.RESOLVED]:      [IncidentStatus.CLOSED, IncidentStatus.INVESTIGATING], // INVESTIGATING = reopened
      [IncidentStatus.CLOSED]:        [],
      [IncidentStatus.CANCELLED]:     []
    };

    const fromStatus = existingIncident.status as IncidentStatus;
    if (!INCIDENT_TRANSITIONS[fromStatus]?.includes(targetStatus)) {
      throw new BadRequestError(`Không thể chuyển trạng thái sự cố từ '${fromStatus}' sang '${targetStatus}'`);
    }

    const updateData: any = { status: targetStatus };
    if (targetStatus === IncidentStatus.INVESTIGATING) {
      updateData.investigatingAt = existingIncident.investigatingAt ?? new Date();
    }
    if (targetStatus === IncidentStatus.ESCALATED) {
      updateData.investigatingAt = existingIncident.investigatingAt ?? new Date();
    }
    if (targetStatus === IncidentStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
      updateData.resolutionNotes = resolutionNotes;
      updateData.resolutionImages = resolutionImages || [];
    }
    if (targetStatus === IncidentStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    const incident = await pgDb.forTenant(ctx.tenantId!).incident.update({
      where: { id },
      data: updateData
    });

    // Invalidate Cache
    const { IncidentRepository } = await import('../incident.repository.js');
    await Promise.all([
      IncidentRepository.invalidateList(ctx.tenantId!),
      IncidentRepository.invalidateDetail(id)
    ]);

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId!,
      action: 'INCIDENT_STATUS_UPDATE',
      resource: `incident/${id}`,
      diff: { before: { status: fromStatus }, after: { status: targetStatus } },
      status: 'SUCCESS'
    });

    return incident;
  }
}
