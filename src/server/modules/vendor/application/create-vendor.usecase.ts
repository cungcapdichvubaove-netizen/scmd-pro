import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';
import { vendorSchema, VendorDTO } from '../vendor.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { Vendor } from '@prisma/client';

export class CreateVendorUseCase extends BaseUseCase<VendorDTO, Vendor> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: VendorDTO): Promise<Vendor> {
    const validated = vendorSchema.parse(data);
    const vendor = await VendorRepository.createVendor(context, validated);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_VENDOR',
      resource: `vendor/${vendor.id}`,
      payload: { name: vendor.name },
      status: 'SUCCESS'
    });

    return vendor;
  }
}
