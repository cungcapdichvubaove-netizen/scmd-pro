import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { reportListQuerySchema } from '../report.schema.js';
import { applyVendorActorScope } from '../../../shared/security/vendor-actor-scope.js';

type TransitionalVendorScorecard = {
  id: string;
  metrics: unknown;
  patrolRate: number;
  incidentRate: number;
  disciplineRate: number;
  formulaVersion?: string | null;
  scoreBreakdown?: unknown;
  shiftCoverageRate?: number | null;
  patrolComplianceRate?: number | null;
  incidentSlaRate?: number | null;
  evidenceCompletenessRate?: number | null;
  manualAuditRate?: number | null;
} & Record<string, unknown>;

export class ListVendorScorecardsUseCase {
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

    const items = await db.withTenant(ctx.tenantId, async (tx) => tx.vendorScorecard.findMany({
      where,
      take: input.limit,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: [{ month: input.sortOrder }, { createdAt: 'desc' }, { id: 'desc' }],
    }));

    const normalizedItems = (items as TransitionalVendorScorecard[]).map((item) => ({
      ...item,
      formulaVersion: item.formulaVersion || 'monthly-acceptance-scorecard-v2.5-groups',
      scoreBreakdown: item.scoreBreakdown ?? (item.metrics && typeof item.metrics === 'object'
        ? ((item.metrics as Record<string, unknown>).scorecard ?? null)
        : null),
      shiftCoverageRate: item.shiftCoverageRate ?? item.disciplineRate ?? 0,
      patrolComplianceRate: item.patrolComplianceRate ?? item.patrolRate ?? 0,
      incidentSlaRate: item.incidentSlaRate ?? item.incidentRate ?? 0,
      evidenceCompletenessRate: item.evidenceCompletenessRate ?? 0,
      manualAuditRate: item.manualAuditRate ?? 0,
    }));

    return {
      items: normalizedItems,
      nextCursor: items.length === input.limit ? items[items.length - 1]?.id ?? null : null,
    };
  }
}
