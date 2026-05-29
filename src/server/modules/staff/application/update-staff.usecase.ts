import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { Staff, updateStaffSchema } from '../staff.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { logger } from '../../../core/logger/index.js';
import { CacheManager } from '../../../core/cache/manager.js';

export type UpdateStaffData = Partial<Omit<Staff, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>;

type StaffRole =
  | 'guard'
  | 'supervisor'
  | 'technician'
  | 'tenant-admin'
  | 'super-admin'
  | 'vendor-commander'
  | 'vendor-representative';

type StaffStatus = 'active' | 'inactive' | 'suspended';

type StaffJSON = {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  fullName: string;
  staffId?: string | null;
  phone?: string | null;
  role: StaffRole;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
  status: StaffStatus;
  qualifications?: string[];
  password?: string;
  idNumber?: string | null;
  licenseNumber?: string | null;
  idExpiry?: Date | null;
  createdAt: string;
  updatedAt: string;
};

export class UpdateStaffUseCase extends BaseUseCase<{ id: string; data: UpdateStaffData }, StaffJSON> {
  override async authorize(context: SecurityContext, request: { id: string; data: UpdateStaffData }): Promise<void> {
    if (context.role === UserRole.GUARD && context.userId !== request.id) {
      throw new Error('FORBIDDEN_ACTION');
    }
    if (context.role === UserRole.VENDOR_REPRESENTATIVE) {
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
    const isVendorCommander = context.role === UserRole.VENDOR_COMMANDER;
    const currentStaff = staff.toJSON() as StaffJSON;
    const requestedScopeChange =
      data.assignedVendorId !== undefined ||
      data.assignedSiteId !== undefined ||
      data.assignedContractId !== undefined;

    if (isVendorCommander) {
      if (currentStaff.role !== UserRole.GUARD) {
        throw new Error('VENDOR_COMMANDER_CAN_ONLY_UPDATE_GUARDS');
      }
      data.role = currentStaff.role;
      data.status = currentStaff.status;
      data.assignedVendorId = currentStaff.assignedVendorId ?? context.assignedVendorId ?? null;
      data.assignedSiteId = currentStaff.assignedSiteId ?? context.assignedSiteId ?? null;
      data.assignedContractId = currentStaff.assignedContractId ?? context.assignedContractId ?? null;
    } else if (!isAdmin) {
      data.role = currentStaff.role;
      data.status = currentStaff.status;
      data.assignedVendorId = currentStaff.assignedVendorId ?? null;
      data.assignedSiteId = currentStaff.assignedSiteId ?? null;
      data.assignedContractId = currentStaff.assignedContractId ?? null;
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

    const hasProfileChange =
      data.fullName !== undefined ||
      data.staffId !== undefined ||
      data.phone !== undefined ||
      data.idNumber !== undefined ||
      data.licenseNumber !== undefined ||
      data.idExpiry !== undefined;

    if (hasProfileChange) {
      staff.updateProfile(
        data.fullName ?? currentStaff.fullName,
        data.role ?? currentStaff.role,
        data.phone,
        data.idNumber !== undefined ? (data.idNumber ?? null) : undefined,
        data.licenseNumber !== undefined ? (data.licenseNumber ?? null) : undefined,
        data.idExpiry !== undefined ? (data.idExpiry ? new Date(data.idExpiry as string) : null) : undefined,
        data.staffId !== undefined ? (data.staffId ?? null) : undefined,
      );
    }

    if (requestedScopeChange && typeof (staff as any).updateAssignmentScope === 'function') {
      (staff as any).updateAssignmentScope({
        assignedVendorId: data.assignedVendorId,
        assignedSiteId: data.assignedSiteId,
        assignedContractId: data.assignedContractId,
      });
    }

    if (typeof data.username === 'string' && data.username.trim() !== '' && data.username !== currentStaff.username) {
      if (typeof (staff as any).updateUsername === 'function') {
        (staff as any).updateUsername(data.username);
      }
    }

    if (data.email && data.email !== currentStaff.email) {
      staff.updateEmail(data.email);
    }

    const trimmedPassword = typeof data.password === 'string' ? data.password.trim() : undefined;
    if (trimmedPassword) {
      (staff as unknown as { getProps(): { password?: string } }).getProps().password = trimmedPassword;
    }

    if (isAdmin) {
      if (data.status === 'inactive') staff.deactivate();
      else if (data.status === 'active') staff.activate();
    }
    if (data.qualifications) staff.updateQualifications(data.qualifications);

    await StaffRepository.save(context, staff);
    await CacheManager.del(`auth_metadata:${id}`);

    const updated = staff.toJSON() as StaffJSON;

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'UPDATE_STAFF',
      `staff/${id}`,
      currentStaff,
      updated,
    );

    return updated;
  }
}
