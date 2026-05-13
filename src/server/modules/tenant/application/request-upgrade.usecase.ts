import { db } from '../../../core/db/prisma.js';
import { logger } from '../../../core/logger/index.js';
import { AuditService } from '../../../core/audit/audit.service.js';

export class RequestUpgradeUseCase {
  async execute(dto: { tenantId: string; userId: string; plan: string; note?: string }) {
    const { tenantId, userId, plan, note } = dto;

    const tenant = await db.system().tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, subdomain: true }
    });

    const tenantLabel = tenant ? `${tenant.name} (${tenant.subdomain})` : tenantId;

    const feedback = await db.forTenant(tenantId).feedback.create({
      data: {
        userId,
        title: `Yêu cầu nâng cấp gói ${plan}`,
        description: note || `Tenant ${tenantLabel} yêu cầu nâng cấp lên gói ${plan}.`,
        severity: 'HIGH',
        type: 'UPGRADE_REQUEST',
        status: 'OPEN',
      }
    });

    try {
      await db.withTenant('SYSTEM', async (tx) => {
        await tx.notification.create({
          data: {
            tenantId: 'SYSTEM',
            userId: null,
            title: `Yêu cầu nâng cấp ${plan}`,
            message: `${tenantLabel} muốn nâng cấp lên gói ${plan}. Vào mục Quản lý Tenant để xét duyệt.`,
            type: 'UPGRADE_REQUEST',
            status: 'UNREAD',
            metadata: {
              feedbackId: feedback.id,
              requestTenantId: tenantId,
              requestedPlan: plan,
            }
          }
        });
      }, { callerRole: 'super-admin' });
    } catch (notifErr) {
      logger.warn({ notifErr }, 'Failed to create superadmin notification for upgrade request');
    }

    await AuditService.log({
      userId,
      tenantId,
      action: 'REQUEST_PLAN_UPGRADE',
      resource: `tenant/${tenantId}/subscription`,
      payload: { plan, feedbackId: feedback.id },
      status: 'SUCCESS'
    });

    logger.info({ tenantId, plan, feedbackId: feedback.id }, 'Upgrade request submitted');
    return { feedbackId: feedback.id, message: `Yêu cầu nâng cấp gói ${plan} đã được ghi nhận.` };
  }
}
