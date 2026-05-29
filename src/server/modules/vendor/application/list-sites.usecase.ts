import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';

interface ListSitesInput {
  cursor?: string;
  limit?: number;
  status?: string;
  vendorId?: string;
}

export class ListSitesUseCase extends BaseUseCase<ListSitesInput, { data: unknown[]; nextCursor: string | null; hasMore: boolean }> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR, UserRole.VENDOR_COMMANDER, UserRole.VENDOR_REPRESENTATIVE].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, input: ListSitesInput) {
    return await VendorRepository.listSites(context, input.cursor, input.limit, {
      status: input.status,
      vendorId: input.vendorId,
    });
  }
}
