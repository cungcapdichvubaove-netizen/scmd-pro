import { GuardPost } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { VendorRepository } from '../vendor.repository.js';
import { GuardPostDTO, guardPostSchema } from '../vendor.schema.js';

export class CreateGuardPostUseCase extends BaseUseCase<GuardPostDTO, GuardPost> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERVISOR].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: GuardPostDTO): Promise<GuardPost> {
    const guardPost = await VendorRepository.createGuardPost(context, guardPostSchema.parse(data));
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_GUARD_POST',
      resource: `site/${guardPost.siteId}/guard-post/${guardPost.id}`,
      payload: { postName: guardPost.postName, requiredGuardCount: guardPost.requiredGuardCount },
      status: 'SUCCESS',
    });
    return guardPost;
  }
}
