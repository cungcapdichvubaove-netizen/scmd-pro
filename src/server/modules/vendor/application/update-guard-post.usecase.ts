import { GuardPost } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { VendorRepository } from '../vendor.repository.js';
import { GuardPostDTO } from '../vendor.schema.js';

export class UpdateGuardPostUseCase extends BaseUseCase<{ id: string } & Partial<GuardPostDTO>, GuardPost> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: { id: string } & Partial<GuardPostDTO>): Promise<GuardPost> {
    const { id, ...updateData } = data;
    const guardPost = await VendorRepository.updateGuardPost(context, id, updateData);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'UPDATE_GUARD_POST',
      resource: `site/${guardPost.siteId}/guard-post/${guardPost.id}`,
      payload: updateData,
      status: 'SUCCESS',
    });
    return guardPost;
  }
}
