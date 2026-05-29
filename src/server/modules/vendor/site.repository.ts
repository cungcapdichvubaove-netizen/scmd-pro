import { db } from '../../core/db/prisma.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { GuardPostDTO, SiteDTO } from './vendor.schema.js';
import {
  ACTIVE_CONTRACT_STATUS,
  clampCursorLimit,
  throwBadRequest,
  throwGuardPostNotFound,
  throwSiteNotFound,
  throwVendorNotFound,
  toCursorPage,
} from './vendor.repository.shared.js';

export class SiteRepository {
  static async list(ctx: SecurityContext, cursor?: string, limit: number = 20, filters: { status?: string; vendorId?: string } = {}) {
    const take = clampCursorLimit(limit);
    const scopedVendorId = ctx.assignedVendorId || filters.vendorId;

    return await db.withTenant(ctx.tenantId, async (tx) => {
      const sites = await tx.site.findMany({
        where: {
          ...(scopedVendorId ? { vendorId: scopedVendorId } : {}),
          ...(ctx.assignedSiteId ? { id: ctx.assignedSiteId } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          vendor: { select: { id: true, name: true, status: true, riskLevel: true } },
          guardPosts: { select: { id: true, postName: true, status: true, requiredGuardCount: true } },
          contracts: {
            where: { status: ACTIVE_CONTRACT_STATUS },
            select: { id: true, contractName: true, contractCode: true, vendorId: true, status: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });

      return toCursorPage(sites, take);
    });
  }

  static async create(ctx: SecurityContext, data: SiteDTO) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      if (data.vendorId) {
        const vendor = await tx.vendor.findFirst({ where: { id: data.vendorId }, select: { id: true } });
        if (!vendor) {
          throwVendorNotFound();
        }
      }

      return await tx.site.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
        },
      });
    });
  }

  static async update(ctx: SecurityContext, id: string, data: Partial<SiteDTO>) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.site.findFirst({ where: { id }, select: { id: true } });
      if (!existing) {
        throwSiteNotFound();
      }

      if (data.vendorId) {
        const vendor = await tx.vendor.findFirst({ where: { id: data.vendorId }, select: { id: true } });
        if (!vendor) {
          throwVendorNotFound();
        }
      }

      return await tx.site.update({ where: { id }, data });
    });
  }

  static async listGuardPosts(ctx: SecurityContext, siteId?: string) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      return await tx.guardPost.findMany({
        where: {
          ...(siteId ? { siteId } : {}),
          ...(ctx.assignedSiteId ? { siteId: ctx.assignedSiteId } : {}),
          ...(ctx.assignedVendorId ? { site: { vendorId: ctx.assignedVendorId } } : {}),
        },
        include: { site: { select: { id: true, siteName: true, status: true, vendorId: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
    });
  }

  static async createGuardPost(ctx: SecurityContext, data: GuardPostDTO) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const site = await tx.site.findFirst({ where: { id: data.siteId }, select: { id: true, status: true } });
      if (!site) {
        throwSiteNotFound();
      }
      if (site.status !== 'ACTIVE') {
        throwBadRequest('SITE_INACTIVE_CANNOT_CREATE_GUARD_POST');
      }

      return await tx.guardPost.create({
        data: {
          ...data,
          tenantId: ctx.tenantId,
        },
      });
    });
  }

  static async updateGuardPost(ctx: SecurityContext, id: string, data: Partial<GuardPostDTO>) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.guardPost.findFirst({ where: { id }, select: { id: true } });
      if (!existing) {
        throwGuardPostNotFound();
      }

      if (data.siteId) {
        const site = await tx.site.findFirst({ where: { id: data.siteId }, select: { id: true, status: true } });
        if (!site) {
          throwSiteNotFound();
        }
        if (site.status !== 'ACTIVE') {
          throwBadRequest('SITE_INACTIVE_CANNOT_MOVE_GUARD_POST');
        }
      }

      return await tx.guardPost.update({ where: { id }, data });
    });
  }
}
