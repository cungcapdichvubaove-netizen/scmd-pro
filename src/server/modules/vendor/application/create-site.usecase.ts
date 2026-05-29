import { Site } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { VendorRepository } from '../vendor.repository.js';
import { SiteDTO, siteSchema } from '../vendor.schema.js';

export class CreateSiteUseCase extends BaseUseCase<SiteDTO, Site> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: SiteDTO): Promise<Site> {
    const site = await VendorRepository.createSite(context, siteSchema.parse(data));
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_SITE',
      resource: `site/${site.id}`,
      payload: { siteName: site.siteName, vendorId: site.vendorId },
      status: 'SUCCESS',
    });
    return site;
  }
}
