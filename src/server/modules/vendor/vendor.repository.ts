import { db } from '../../core/db/prisma.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { VendorDTO, ContractDTO } from './vendor.schema.js';

export class VendorRepository {
  static async listVendors(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    const isMobile = view === 'mobile';
    const take = Math.min(limit, 100);
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const vendors = await tx.vendor.findMany({
        orderBy: [{ score: 'desc' }, { id: 'asc' }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: isMobile ? {
          id: true,
          name: true,
          score: true,
          contactPerson: true,
          status: true
        } : undefined
      });

      const hasMore = vendors.length > take;
      const items = hasMore ? vendors.slice(0, take) : vendors;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return {
        data: items,
        nextCursor,
        hasMore
      };
    });
  }

  static async createVendor(ctx: SecurityContext, data: VendorDTO) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      return await tx.vendor.create({
        data: {
          ...data,
          tenantId: ctx.tenantId
        }
      });
    });
  }

  static async updateVendor(ctx: SecurityContext, id: string, data: Partial<VendorDTO>) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      // make sure it belongs to the tenant
      const existing = await tx.vendor.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw new Error('VENDOR_NOT_FOUND');
      
      return await tx.vendor.update({
        where: { id },
        data
      });
    });
  }

  static async listContracts(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    const isMobile = view === 'mobile';
    const take = Math.min(limit, 100);
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const contracts = await tx.contract.findMany({
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: isMobile ? {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          vendor: {
            select: {
              id: true,
              name: true,
              score: true
            }
          }
        } : undefined,
        include: isMobile ? undefined : { 
          vendor: {
            select: {
              id: true,
              name: true,
              score: true
            }
          } 
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }]
      });

      const hasMore = contracts.length > take;
      const items = hasMore ? contracts.slice(0, take) : contracts;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return {
        data: items,
        nextCursor,
        hasMore
      };
    });
  }

  static async createContract(ctx: SecurityContext, data: ContractDTO) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      return await tx.contract.create({
        data: {
          ...data,
          tenantId: ctx.tenantId
        }
      });
    });
  }

  static async listComplianceScores(ctx: SecurityContext, view?: string) {
    const isMobile = view === 'mobile';
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      return await tx.complianceScore.findMany({
        select: isMobile ? {
          id: true,
          month: true,
          score: true,
          vendorId: true
        } : undefined,
        include: isMobile ? undefined : { contract: true },
        orderBy: { month: 'desc' }
      });
    });
  }

  static async getVendorStats(ctx: SecurityContext, vendorId: string) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const scores = await tx.complianceScore.findMany({
        where: { vendorId },
        orderBy: { month: 'desc' },
        take: 12
      });
      return scores;
    });
  }
}
