import { GuardPost } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';

export class ListGuardPostsUseCase extends BaseUseCase<{ siteId?: string }, GuardPost[]> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR, UserRole.VENDOR_COMMANDER, UserRole.VENDOR_REPRESENTATIVE].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, input: { siteId?: string }): Promise<GuardPost[]> {
    return await VendorRepository.listGuardPosts(context, input.siteId);
  }
}
