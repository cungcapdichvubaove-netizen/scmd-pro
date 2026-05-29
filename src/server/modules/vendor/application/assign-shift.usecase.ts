import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { assignShiftSchema, AssignShiftDTO } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class AssignShiftUseCase extends BaseUseCase<AssignShiftDTO, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR_COMMANDER];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: AssignShiftDTO): Promise<void> {
    assignShiftSchema.parse(request);
  }

  protected async internalExecute(context: SecurityContext, request: AssignShiftDTO): Promise<any> {
    const result = await VendorRepository.assignGuardToShift(context, request);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'ASSIGN_GUARD_TO_SHIFT',
      resource: `shift-schedules/${request.shiftScheduleId}`,
      payload: { staffId: request.staffId, warnings: result.warnings },
      status: 'SUCCESS',
    });
    return result;
  }
}
