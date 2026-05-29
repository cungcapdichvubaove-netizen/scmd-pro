import { Site } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { VendorRepository } from '../vendor.repository.js';
import { SiteDTO } from '../vendor.schema.js';

export class UpdateSiteUseCase extends BaseUseCase<{ id: string } & Partial<SiteDTO>, Site> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: { id: string } & Partial<SiteDTO>): Promise<Site> {
    const { id, ...updateData } = data;
    const site = await VendorRepository.updateSite(context, id, updateData);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'UPDATE_SITE',
      resource: `site/${site.id}`,
      payload: updateData,
      status: 'SUCCESS',
    });
    return site;
  }
}
