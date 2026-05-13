import { db } from '../../core/db/prisma.js';
import { IncidentStatus, Prisma } from '@prisma/client';
import { CacheManager } from '../../core/cache/manager.js';

export interface ListIncidentsQuery {
  status?: IncidentStatus;
  type?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isMobile?: boolean;
}

export class IncidentRepository {
  private static readonly CACHE_TTL = 60; // 1 minute for list
  private static readonly DETAIL_TTL = 600; // 10 minutes for detail

  async list(tenantId: string, query: ListIncidentsQuery) {
    const { 
      status, 
      type, 
      limit = 50, 
      cursor, 
      sortBy, 
      sortOrder = 'desc',
      isMobile = false 
    } = query;

    const cacheKey = `incident:list:${tenantId}:${status || 'all'}:${type || 'all'}:${limit}:${cursor || 'start'}:${sortBy || 'default'}:${sortOrder}:${isMobile}`;

    return await CacheManager.wrap(cacheKey, async () => {
      const l = Math.min(200, Math.max(1, limit));

      return await db.withTenant(tenantId, async (tx: any) => {
        const where: Prisma.IncidentWhereInput = {
          tenantId,
          ...(status ? { status } : {}),
          ...(type ? { type } : {})
        };

        const orderBy: Prisma.IncidentOrderByWithRelationInput[] = [];

        if (sortBy === 'severity') {
          orderBy.push({ severityWeight: sortOrder === 'asc' ? 'asc' : 'desc' });
          orderBy.push({ reportedAt: 'desc' });
        } else if (sortBy === 'reportedAt') {
          orderBy.push({ reportedAt: sortOrder });
        } else {
          orderBy.push({ reportedAt: 'desc' });
        }

        orderBy.push({ id: 'desc' });

        const findOptions: Prisma.IncidentFindManyArgs = {
          where,
          orderBy,
          take: l + 1,
          select: isMobile ? {
            id: true,
            type: true,
            severity: true,
            status: true,
            reportedAt: true,
            assignee: { select: { fullName: true, role: true } },
            reporter: { select: { fullName: true, role: true } }
          } : {
            id: true,
            type: true,
            severity: true,
            severityWeight: true,
            description: true,
            imageUri: true,
            location: true,
            status: true,
            assignedToId: true,
            resolutionNotes: true,
            resolutionImages: true,
            reportedAt: true,
            investigatingAt: true,
            resolvedAt: true,
            closedAt: true,
            createdAt: true,
            updatedAt: true,
            reporter: { select: { fullName: true, role: true } },
            assignee: { select: { fullName: true, role: true } }
          }
        };

        if (cursor) {
          findOptions.cursor = { id: cursor };
          findOptions.skip = 1;
        }

        const results = await tx.incident.findMany(findOptions);
        const hasMore = results.length > l;
        const items = hasMore ? results.slice(0, l) : results;

        return {
          items,
          hasMore,
          limit: l
        };
      }, { readOnly: true });
    }, IncidentRepository.CACHE_TTL);
  }

  async findById(tenantId: string, id: string) {
    const cacheKey = `incident:detail:${id}`;
    return await CacheManager.wrap(cacheKey, async () => {
      return await db.withTenant(tenantId, async (tx: any) => {
        return await tx.incident.findUnique({
          where: { id, tenantId },
          include: {
            reporter: { select: { fullName: true, role: true } },
            assignee: { select: { fullName: true, role: true } }
          }
        });
      }, { readOnly: true });
    }, IncidentRepository.DETAIL_TTL);
  }

  static async invalidateList(tenantId: string) {
    await CacheManager.delByPattern(`incident:list:${tenantId}:*`);
  }

  static async invalidateDetail(id: string) {
    await CacheManager.del(`incident:detail:${id}`);
  }
}
