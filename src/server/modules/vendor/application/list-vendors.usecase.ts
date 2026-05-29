import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';
import { Vendor } from '@prisma/client';

export class ListVendorsUseCase extends BaseUseCase<{cursor?: string; limit?: number; view?: string}, { data: Partial<Vendor>[], nextCursor: string | null; hasMore: boolean }> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.GUARD, UserRole.VENDOR_COMMANDER, UserRole.VENDOR_REPRESENTATIVE];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, input: {cursor?: string; limit?: number; view?: string}): Promise<{ data: Partial<Vendor>[], nextCursor: string | null; hasMore: boolean }> {
    return await VendorRepository.listVendors(context, input.cursor, input.limit, input.view);
  }
}
