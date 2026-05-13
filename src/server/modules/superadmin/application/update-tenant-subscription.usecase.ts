import { db } from '../../../core/db/prisma.js';
import { logger } from '../../../core/logger/index.js';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { cache } from '../../../core/cache/index.js';
import { SubscriptionPlan } from '@prisma/client';

export interface UpdateTenantSubscriptionInput {
  tenantId: string;
  plan: SubscriptionPlan;
}

export class UpdateTenantSubscriptionUseCase extends BaseUseCase<UpdateTenantSubscriptionInput, void> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Unauthorized: Only Super Admins can update subscriptions');
    }
  }

  protected async internalExecute(context: SecurityContext, input: UpdateTenantSubscriptionInput): Promise<void> {
    const { tenantId, plan } = input;

    logger.info({ tenantId, plan, executor: context.userId }, 'SuperAdmin: Updating tenant subscription plan');

    // BẮT BUỘC: Sử dụng db.system() — Tenant model là cross-tenant (không thuộc tenantId cụ thể)
    const systemDb = db.system();

    const before = await systemDb.tenant.findUnique({ where: { id: tenantId }, select: { subscriptionPlan: true, plan: true } });

    await systemDb.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: plan,
        plan: plan,
        updatedAt: new Date()
      }
    });

    // Invalidate tenant status cache immediately
    await cache.del(`tenant:status:${tenantId}`);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'UPDATE_TENANT_SUBSCRIPTION',
      resource: `tenant/${tenantId}`,
      diff: {
        before: before ?? { subscriptionPlan: null },
        after: { subscriptionPlan: plan, plan }
      },
      status: 'SUCCESS'
    });

    logger.info({ tenantId, plan }, 'SuperAdmin: Tenant subscription updated successfully');
  }
}
