import { SubscriptionPlan } from '@prisma/client';

import { db } from '../../../../core/db/prisma.js';
import { logger } from '../../../../core/logger/index.js';

import { generateMonthlyComplianceSnapshot } from './generate.js';
import { getMonthRange } from './utils.js';

export async function runMonthlyComplianceForAllTenants(month?: string) {
  const targetMonth = month ?? (() => {
    const now = new Date();
    const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
  })();
  const { start, end } = getMonthRange(targetMonth);

  const tenants = await db.withTenant('SYSTEM', async (tx: any) => {
    return tx.tenant.findMany({
      where: {
        status: 'active',
        subscriptionPlan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.ENTERPRISE] },
      },
      select: { id: true },
    });
  });

  let processed = 0;

  for (const tenant of tenants) {
    try {
      await db.withTenant(tenant.id, async (tx: any) => {
        const scopes = await tx.contract.findMany({
          where: {
            tenantId: tenant.id,
            startDate: { lt: end },
            endDate: { gte: start },
          },
          select: {
            vendorId: true,
            id: true,
            siteId: true,
          },
        });

        for (const scope of scopes) {
          await generateMonthlyComplianceSnapshot({
            tenantId: tenant.id,
            month: targetMonth,
            vendorId: scope.vendorId,
            contractId: scope.id,
            siteId: scope.siteId ?? null,
            actorId: 'SYSTEM',
          });
          processed += 1;
        }
      });
    } catch (err: any) {
      logger.error({ err, tenantId: tenant.id, month: targetMonth }, 'MONTHLY_COMPLIANCE failed for tenant');
    }
  }

  return { month: targetMonth, processedScopes: processed, tenantCount: tenants.length };
}
