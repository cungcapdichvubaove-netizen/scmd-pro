import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { reportListQuerySchema } from '../report.schema.js';
import { applyVendorActorScope } from '../../../shared/security/vendor-actor-scope.js';

export class ListMonthlyAcceptanceReportsUseCase {
  async execute(ctx: SecurityContext, query: unknown) {
    const input = reportListQuerySchema.parse(query);
    const where: any = applyVendorActorScope(ctx, {
      tenantId: ctx.tenantId,
    });

    if (input.month) where.month = input.month;
    if (input.vendorId && !ctx.assignedVendorId) where.vendorId = input.vendorId;
    if (input.contractId && !ctx.assignedContractId) where.contractId = input.contractId;
    if (input.siteId && !ctx.assignedSiteId) where.siteId = input.siteId;
    if (input.status) where.status = input.status.toUpperCase();

    const items = await db.withTenant(ctx.tenantId, async (tx) => tx.monthlyAcceptanceReport.findMany({
      where,
      include: {
        penaltyItems: true,
        disputes: true,
      },
      take: input.limit,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ month: input.sortOrder }, { revisionNumber: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    }));

    return {
      items,
      nextCursor: items.length === input.limit ? items[items.length - 1]?.id ?? null : null,
    };
  }
}
