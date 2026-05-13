import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { Staff, createStaffSchema } from '../staff.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export type CreateStaffInput = Omit<Staff, 'id' | 'createdAt' | 'updatedAt' | 'tokenVersion'>;

export class CreateStaffUseCase extends BaseUseCase<CreateStaffInput, Staff> {
  override async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('FORBIDDEN_ACTION');
    }
  }

  override async validate(request: CreateStaffInput, context: SecurityContext): Promise<void> {
    createStaffSchema.parse(request);
    
    // Automated Integrity Check: Quota Guard
    const { IntegrityGuard } = await import('../../../core/db/integrity.manager.js');
    await IntegrityGuard.checkStaffQuota(context.tenantId);
  }

  override async internalExecute(context: SecurityContext, request: CreateStaffInput): Promise<Staff> {
    const staff = await StaffRepository.create(context, request);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_STAFF',
      resource: `staff/${(staff as Staff & { id: string }).id}`,
      payload: { username: request.username, role: request.role },
      status: 'SUCCESS'
    });

    return staff;
  }
}
