import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { CacheManager } from '../../../core/cache/manager.js';

export class DeleteStaffUseCase extends BaseUseCase<string, void> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN && context.role !== UserRole.VENDOR_COMMANDER) {
      throw new Error('FORBIDDEN_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, id: string): Promise<void> {
    const existing = await StaffRepository.getEntityById(context, id);
    if (context.role === UserRole.VENDOR_COMMANDER && existing && existing.role !== UserRole.GUARD) {
      throw new Error('VENDOR_COMMANDER_CAN_ONLY_DELETE_GUARDS');
    }

    await StaffRepository.delete(context, id);
    
    // SEC-FIX [M-01]: Invalidate auth metadata cache immediately on deletion
    // Using CacheManager.del to ensure both L1 and L2 (Redis) caches are invalidated.
    await CacheManager.del(`auth_metadata:${id}`);

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'DELETE_STAFF',
      `staff/${id}`,
      existing ? existing.toJSON() : { id },
      null
    );
  }
}
