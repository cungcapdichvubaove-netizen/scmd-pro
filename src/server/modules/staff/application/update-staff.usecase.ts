import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { Staff, updateStaffSchema } from '../staff.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { logger } from '../../../core/logger/index.js';
import { CacheManager } from '../../../core/cache/manager.js';

export type UpdateStaffData = Partial<Omit<Staff, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>;

// StaffJSON phản ánh chính xác contract của StaffEntity.toJSON():
//   - password bị omit (security rule FIX 5.1)
//   - tokenVersion không có trong StaffProps
//   - createdAt/updatedAt là string (do .toISOString())
//   - role/status dùng đúng literal union (phải khớp với UpdateStaffData để assign 2 chiều)
type StaffRole = 'guard' | 'supervisor' | 'technician' | 'tenant-admin' | 'super-admin';
type StaffStatus = 'active' | 'inactive' | 'suspended';

type StaffJSON = {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  phone?: string | null;
  role: StaffRole;
  status: StaffStatus;
  qualifications?: string[];
  createdAt: string;
  updatedAt: string;
};

export class UpdateStaffUseCase extends BaseUseCase<{ id: string; data: UpdateStaffData }, StaffJSON> {
  override async authorize(context: SecurityContext, request: { id: string; data: UpdateStaffData }): Promise<void> {
    if (context.role === UserRole.GUARD && context.userId !== request.id) {
      throw new Error('FORBIDDEN_ACTION');
    }
  }

  override async validate(request: { id: string; data: UpdateStaffData }): Promise<void> {
    updateStaffSchema.parse(request.data);
  }

  override async internalExecute(context: SecurityContext, request: { id: string; data: UpdateStaffData }): Promise<StaffJSON> {
    const { id, data } = request;
    const staff = await StaffRepository.getEntityById(context, id);
    if (!staff) {
      const error: any = new Error('NOT_FOUND_OR_ACCESS_DENIED');
      error.status = 404;
      throw error;
    }

    const isAdmin = context.role === UserRole.TENANT_ADMIN || context.role === UserRole.SUPER_ADMIN;
    const currentStaff = staff.toJSON() as StaffJSON;

    if (!isAdmin) {
      data.role = currentStaff.role;
      data.status = currentStaff.status;
    } else {
      if (data.role === UserRole.SUPER_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
        logger.warn({ actorId: context.userId, targetId: id }, 'SECURITY VIOLATION: TenantAdmin attempted to promote a user to SuperAdmin. Blocked.');
        data.role = currentStaff.role;
      }
      if (currentStaff.role === UserRole.SUPER_ADMIN && context.role !== UserRole.SUPER_ADMIN && data.role && data.role !== UserRole.SUPER_ADMIN) {
        logger.warn({ actorId: context.userId, targetId: id }, 'SECURITY VIOLATION: TenantAdmin attempted to demote a SuperAdmin. Blocked.');
        data.role = currentStaff.role;
      }
    }

    if (data.fullName || data.phone !== undefined) {
      staff.updateProfile(data.fullName ?? currentStaff.fullName, data.role ?? currentStaff.role, data.phone);
    }
    if (data.status === 'inactive') staff.deactivate();
    else if (data.status === 'active') staff.activate();
    if (data.qualifications) staff.updateQualifications(data.qualifications);

    await StaffRepository.save(context, staff);
    
    // SEC-FIX [M-01]: Invalidate auth metadata cache immediately on change
    // Using CacheManager.del to ensure both L1 and L2 (Redis) caches are invalidated.
    await CacheManager.del(`auth_metadata:${id}`);
    
    const updated = staff.toJSON() as StaffJSON;

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'UPDATE_STAFF',
      `staff/${id}`,
      currentStaff,
      updated
    );

    return updated;
  }
}
