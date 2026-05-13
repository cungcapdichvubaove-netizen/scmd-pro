import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { db as pgDb } from '../../../core/db/prisma.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { updateIncidentSchema } from '../incident.schema.js';
import { BadRequestError } from '../../../core/errors/domain.error.js';

export interface AssignIncidentInput {
  incidentId: string;
  staffId: string;
}

export class AssignIncidentUseCase extends BaseUseCase<AssignIncidentInput, any> {
  override async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  override async validate(request: AssignIncidentInput): Promise<void> {
    // Only need to validate id format here, business logic in execute
    updateIncidentSchema.partial().parse({
      assignedToId: request.staffId
    });
  }

  override async internalExecute(ctx: SecurityContext, input: AssignIncidentInput): Promise<any> {
    const { incidentId, staffId } = input;

    // Verify staff exists in this tenant
    const staff = await pgDb.forTenant(ctx.tenantId!).staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new BadRequestError('Staff không tồn tại trong thiết lập của doanh nghiệp (Tenant) này');

    const incident = await pgDb.forTenant(ctx.tenantId!).incident.update({
      where: { id: incidentId },
      data: {
        assignedToId: staffId,
        status: 'INVESTIGATING',
        investigatingAt: new Date()
      }
    });

    // Invalidate Cache
    const { IncidentRepository } = await import('../incident.repository.js');
    await Promise.all([
      IncidentRepository.invalidateList(ctx.tenantId!),
      IncidentRepository.invalidateDetail(incidentId)
    ]);

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId!,
      action: 'INCIDENT_ASSIGN',
      resource: `incident/${incidentId}`,
      payload: { assignedToId: staffId, status: 'INVESTIGATING' },
      status: 'SUCCESS'
    });

    return incident;
  }
}
