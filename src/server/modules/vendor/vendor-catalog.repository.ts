import { db } from '../../core/db/prisma.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { VendorDTO } from './vendor.schema.js';
import {
  clampCursorLimit,
  throwVendorNotFound,
  toCursorPage,
} from './vendor.repository.shared.js';
import { applyVendorActorScope } from '../../shared/security/vendor-actor-scope.js';

type MobileComplianceScoreRow = {
  id: string;
  month: Date;
  totalScore: number;
  vendorId: string;
};

export class VendorCatalogRepository {
  static async list(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    const isMobile = view === 'mobile';
    const take = clampCursorLimit(limit);

    return await db.withTenant(ctx.tenantId, async (tx) => {
      const vendors = await tx.vendor.findMany({
        where: ctx.assignedVendorId ? { id: ctx.assignedVendorId } : undefined,
        orderBy: [{ score: 'desc' }, { id: 'asc' }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: isMobile
          ? undefined
          : {
              _count: { select: { contracts: true, sites: true } },
            },
        select: isMobile
          ? {
              id: true,
              name: true,
              score: true,
              contactPerson: true,
              status: true,
              riskLevel: true,
            }
          : undefined,
      });

      return toCursorPage(vendors, take);
    });
  }

  static async create(ctx: SecurityContext, data: VendorDTO) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      return await tx.vendor.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
        },
      });
    });
  }

  static async update(ctx: SecurityContext, id: string, data: Partial<VendorDTO>) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.vendor.findFirst({
        where: applyVendorActorScope(ctx, { id, tenantId: ctx.tenantId }),
        select: { id: true },
      });

      if (!existing) {
        throwVendorNotFound();
      }

      return await tx.vendor.update({
        where: { id },
        data,
      });
    });
  }

  static async listComplianceScores(ctx: SecurityContext, view?: string) {
    const isMobile = view === 'mobile';

    return await db.withTenant(ctx.tenantId, async (tx) => {
      const rows = await tx.complianceScore.findMany({
        where: ctx.assignedVendorId ? applyVendorActorScope(ctx, {}) : undefined,
        select: isMobile
          ? {
              id: true,
              month: true,
              totalScore: true,
              vendorId: true,
            }
          : undefined,
        include: isMobile ? undefined : { contract: true },
        orderBy: { month: 'desc' },
      });

      if (!isMobile) {
        return rows;
      }

      return (rows as MobileComplianceScoreRow[]).map((row) => ({
        ...row,
        score: row.totalScore,
      }));
    });
  }

  static async getStats(ctx: SecurityContext, vendorId: string) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      return await tx.complianceScore.findMany({
        where: applyVendorActorScope(ctx, { vendorId }),
        orderBy: { month: 'desc' },
        take: 12,
      });
    });
  }
}
