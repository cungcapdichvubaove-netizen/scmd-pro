import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';
import { VendorDTO } from '../vendor.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { Vendor } from '@prisma/client';

export class UpdateVendorUseCase extends BaseUseCase<{ id: string } & Partial<VendorDTO>, Vendor> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: { id: string } & Partial<VendorDTO>): Promise<Vendor> {
    const { id, ...updateData } = data;
    const vendor = await VendorRepository.updateVendor(context, id, updateData);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'UPDATE_VENDOR',
      resource: `vendor/${vendor.id}`,
      payload: updateData,
      status: 'SUCCESS'
    });

    return vendor;
  }
}
