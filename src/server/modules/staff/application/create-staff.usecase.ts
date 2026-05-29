import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { StaffRepository } from '../staff.repository.js';
import { Staff, staffSchema } from '../staff.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { requireVendorActorScope } from '../../../shared/security/vendor-actor-scope.js';

export type CreateStaffInput = Omit<Staff, 'id' | 'createdAt' | 'updatedAt' | 'tokenVersion'>;
export type CreateStaffOutput = Omit<Staff, 'password' | 'tokenVersion'>;

export class CreateStaffUseCase extends BaseUseCase<CreateStaffInput, CreateStaffOutput> {
  override async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN && context.role !== UserRole.VENDOR_COMMANDER) {
      throw new Error('FORBIDDEN_ACTION');
    }
  }

  override async validate(request: CreateStaffInput, context: SecurityContext): Promise<void> {
    staffSchema.omit({ tokenVersion: true }).parse(request);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.tenantId)) {
      throw new Error('INVALID_TENANT_ID');
    }

    if (context.role === UserRole.VENDOR_COMMANDER) {
      requireVendorActorScope(context);
      if (request.role !== UserRole.GUARD) {
        throw new Error('VENDOR_COMMANDER_CAN_ONLY_CREATE_GUARDS');
      }
      if (request.assignedVendorId && request.assignedVendorId !== context.assignedVendorId) {
        throw new Error('VENDOR_SCOPE_MISMATCH');
      }
      if (context.assignedSiteId && request.assignedSiteId && request.assignedSiteId !== context.assignedSiteId) {
        throw new Error('SITE_SCOPE_MISMATCH');
      }
      if (context.assignedContractId && request.assignedContractId && request.assignedContractId !== context.assignedContractId) {
        throw new Error('CONTRACT_SCOPE_MISMATCH');
      }
    }

    if (request.role === UserRole.VENDOR_COMMANDER || request.role === UserRole.VENDOR_REPRESENTATIVE) {
      if (!request.assignedVendorId) {
        throw new Error('VENDOR_SCOPE_REQUIRED');
      }
    }
    
    // Automated Integrity Check: Quota Guard
    const { IntegrityGuard } = await import('../../../core/db/integrity.manager.js');
    await IntegrityGuard.checkStaffQuota(context.tenantId);
  }

  override async internalExecute(context: SecurityContext, request: CreateStaffInput): Promise<CreateStaffOutput> {
    const payload = context.role === UserRole.VENDOR_COMMANDER
      ? {
          ...request,
          role: UserRole.GUARD,
          assignedVendorId: context.assignedVendorId ?? request.assignedVendorId ?? null,
          assignedSiteId: context.assignedSiteId ?? request.assignedSiteId ?? null,
          assignedContractId: context.assignedContractId ?? request.assignedContractId ?? null,
        }
      : request;

    const staff = await StaffRepository.create(context, payload);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_STAFF',
      resource: `staff/${(staff as Staff & { id: string }).id}`,
      payload: { username: payload.username, role: payload.role },
      status: 'SUCCESS'
    });

    const { password: _password, tokenVersion: _tokenVersion, ...safeStaff } = staff as Staff & { tokenVersion?: number };
    return safeStaff;
  }
}
