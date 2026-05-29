import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { removeShiftAssignmentSchema } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';

type RemoveShiftAssignmentInput = { assignmentId: string };

export class RemoveShiftAssignmentUseCase extends BaseUseCase<RemoveShiftAssignmentInput, { success: boolean }> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR_COMMANDER];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: RemoveShiftAssignmentInput): Promise<void> {
    removeShiftAssignmentSchema.parse(request);
  }

  protected async internalExecute(context: SecurityContext, request: RemoveShiftAssignmentInput): Promise<{ success: boolean }> {
    const result = await VendorRepository.removeShiftAssignment(context, request.assignmentId);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'REMOVE_SHIFT_ASSIGNMENT',
      resource: `shift-assignments/${request.assignmentId}`,
      status: 'SUCCESS',
    });
    return result;
  }
}
