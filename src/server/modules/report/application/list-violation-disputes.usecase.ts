import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { violationDisputeListQuerySchema } from '../report.schema.js';
import { applyVendorActorScope } from '../../../shared/security/vendor-actor-scope.js';

export class ListViolationDisputesUseCase {
  async execute(ctx: SecurityContext, query: unknown) {
    const input = violationDisputeListQuerySchema.parse(query);
    const where: any = applyVendorActorScope(ctx, {
      tenantId: ctx.tenantId,
    });

    if (input.reportId) where.reportId = input.reportId;
    if (input.violationEventId) where.violationEventId = input.violationEventId;
    if (input.status) where.status = input.status.toUpperCase();
    if (input.vendorId && !ctx.assignedVendorId) where.vendorId = input.vendorId;
    if (input.contractId && !ctx.assignedContractId) where.contractId = input.contractId;
    if (input.siteId && !ctx.assignedSiteId) where.siteId = input.siteId;

    const items = await db.withTenant(ctx.tenantId, async (tx) => tx.violationDispute.findMany({
      where,
      take: input.limit,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));

    return {
      items,
      nextCursor: items.length === input.limit ? items[items.length - 1]?.id ?? null : null,
    };
  }
}
