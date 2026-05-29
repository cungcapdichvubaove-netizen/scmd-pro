import { db } from '../../core/db/prisma.js';
import { IncidentSeverity, IncidentStatus, Prisma } from '@prisma/client';
import { CacheManager } from '../../core/cache/manager.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { applyVendorActorScope } from '../../shared/security/vendor-actor-scope.js';

export interface ListIncidentsQuery {
  status?: IncidentStatus;
  type?: string;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isMobile?: boolean;
  priorityOnly?: boolean;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  assigneeId?: string;
  siteId?: string;
  vendorId?: string;
  contractId?: string;
}

export class IncidentRepository {
  private static readonly CACHE_TTL = 60; // 1 minute for list
  private static readonly DETAIL_TTL = 600; // 10 minutes for detail

  async list(ctx: SecurityContext, query: ListIncidentsQuery) {
    const {
      status,
      type,
      limit = 50,
      cursor,
      sortBy,
      sortOrder = 'desc',
      isMobile = false,
      priorityOnly = false,
      severity,
      dateFrom,
      dateTo,
      search,
      assigneeId,
      siteId,
      vendorId,
      contractId,
    } = query;

    const cacheKey = `incident:list:${ctx.tenantId}:${ctx.role}:${ctx.assignedVendorId || 'all'}:${ctx.assignedSiteId || 'all'}:${ctx.assignedContractId || 'all'}:${status || 'all'}:${type || 'all'}:${severity || 'all'}:${dateFrom || 'all'}:${dateTo || 'all'}:${search || 'all'}:${assigneeId || 'all'}:${siteId || 'all'}:${vendorId || 'all'}:${contractId || 'all'}:${limit}:${cursor || 'start'}:${sortBy || 'default'}:${sortOrder}:${isMobile}:${priorityOnly}`;

    return await CacheManager.wrap(cacheKey, async () => {
      const l = Math.min(200, Math.max(1, limit));

      return await db.withTenant(ctx.tenantId, async (tx: any) => {
        const normalizedSeverity = String(severity || '').toUpperCase();
        const severityEnum = Object.values(IncidentSeverity).includes(normalizedSeverity as IncidentSeverity)
          ? normalizedSeverity as IncidentSeverity
          : undefined;

        const reportedAtFilter: Prisma.DateTimeFilter = {};
        if (dateFrom) {
          const from = new Date(dateFrom);
          if (!Number.isNaN(from.getTime())) reportedAtFilter.gte = from;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          if (!Number.isNaN(to.getTime())) reportedAtFilter.lte = to;
        }

        const normalizedSearch = String(search || '').trim();
        const where: Prisma.IncidentWhereInput = applyVendorActorScope(ctx, {
          tenantId: ctx.tenantId,
          ...(status ? { status } : {}),
          ...(type ? { type } : {}),
          ...(severityEnum ? { severity: severityEnum } : {}),
          ...(Object.keys(reportedAtFilter).length > 0 ? { reportedAt: reportedAtFilter } : {}),
          ...(assigneeId && assigneeId !== 'all' ? { assignedToId: assigneeId } : {}),
          ...(siteId && siteId !== 'all' ? { siteId } : {}),
          ...(vendorId && vendorId !== 'all' ? { vendorId } : {}),
          ...(contractId && contractId !== 'all' ? { contractId } : {}),
          ...(normalizedSearch ? {
            OR: [
              { type: { contains: normalizedSearch, mode: 'insensitive' } },
              { description: { contains: normalizedSearch, mode: 'insensitive' } },
              { reporter: { is: { fullName: { contains: normalizedSearch, mode: 'insensitive' } } } },
              { assignee: { is: { fullName: { contains: normalizedSearch, mode: 'insensitive' } } } },
              { vendor: { is: { name: { contains: normalizedSearch, mode: 'insensitive' } } } },
              { site: { is: { siteName: { contains: normalizedSearch, mode: 'insensitive' } } } },
              { contract: { is: { contractCode: { contains: normalizedSearch, mode: 'insensitive' } } } },
            ],
          } : {}),
          ...(priorityOnly ? {
            status: { in: [IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.INVESTIGATING, IncidentStatus.WAITING_VENDOR_RESPONSE, IncidentStatus.ESCALATED, IncidentStatus.REOPENED, IncidentStatus.RESOLVED_PENDING_APPROVAL] },
            OR: [
              { slaBreached: true },
              { severity: { in: [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH] } },
              { status: IncidentStatus.RESOLVED_PENDING_APPROVAL },
            ],
          } : {}),
        });

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
            vendorId: true,
            contractId: true,
            siteId: true,
            responseDueAt: true,
            resolutionDueAt: true,
            slaBreached: true,
            reportedAt: true,
            assignee: { select: { fullName: true, role: true } },
            reporter: { select: { fullName: true, role: true } },
            vendor: { select: { id: true, name: true, riskLevel: true, status: true } },
            site: { select: { id: true, siteName: true, address: true, status: true } },
            contract: { select: { id: true, contractCode: true, contractName: true, status: true } }
          } : {
            id: true,
            type: true,
            severity: true,
            severityWeight: true,
            description: true,
            imageUri: true,
            location: true,
            status: true,
            vendorId: true,
            contractId: true,
            siteId: true,
            assignedToId: true,
            resolutionNotes: true,
            resolutionImages: true,
            slaDeadline: true,
            slaBreached: true,
            slaMinutes: true,
            responseDueAt: true,
            resolutionDueAt: true,
            responseAcknowledgedAt: true,
            resolutionSubmittedAt: true,
            requiredEvidenceTypes: true,
            escalatedAt: true,
            resolvedById: true,
            approvedById: true,
            closedById: true,
            reopenedAt: true,
            reopenReason: true,
            reportedAt: true,
            investigatingAt: true,
            resolvedAt: true,
            closedAt: true,
            createdAt: true,
            updatedAt: true,
            reporter: { select: { fullName: true, role: true } },
            assignee: { select: { fullName: true, role: true } },
            vendor: { select: { id: true, name: true, riskLevel: true, status: true } },
            site: { select: { id: true, siteName: true, address: true, status: true } },
            contract: { select: { id: true, contractCode: true, contractName: true, status: true } }
          }
        };

        if (cursor) {
          findOptions.cursor = { id: cursor };
          findOptions.skip = 1;
        }

        const [results, summaryTotal, openCount, criticalCount, slaBreachedCount] = await Promise.all([
          tx.incident.findMany(findOptions),
          tx.incident.count({ where }),
          tx.incident.count({ where: { ...where, status: { in: [IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSIGNED, IncidentStatus.INVESTIGATING, IncidentStatus.WAITING_VENDOR_RESPONSE, IncidentStatus.ESCALATED, IncidentStatus.REOPENED, IncidentStatus.RESOLVED_PENDING_APPROVAL] } } }),
          tx.incident.count({ where: { ...where, severity: { in: [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH] } } }),
          tx.incident.count({ where: { ...where, slaBreached: true } }),
        ]);
        const hasMore = results.length > l;
        const items = hasMore ? results.slice(0, l) : results;
        const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

        return {
          items,
          hasMore,
          nextCursor,
          limit: l,
          summary: {
            total: summaryTotal,
            openCount,
            criticalCount,
            slaBreachedCount,
          }
        };
      }, { readOnly: true });
    }, IncidentRepository.CACHE_TTL);
  }

  async findById(ctx: SecurityContext, id: string) {
    const cacheKey = `incident:detail:${ctx.tenantId}:${ctx.role}:${ctx.assignedVendorId || 'all'}:${ctx.assignedSiteId || 'all'}:${ctx.assignedContractId || 'all'}:${id}`;
    return await CacheManager.wrap(cacheKey, async () => {
      return await db.withTenant(ctx.tenantId, async (tx: any) => {
        return await tx.incident.findFirst({
          where: applyVendorActorScope(ctx, { id, tenantId: ctx.tenantId }),
          include: {
            reporter: { select: { fullName: true, role: true } },
            assignee: { select: { fullName: true, role: true } },
            resolver: { select: { fullName: true, role: true } },
            approver: { select: { fullName: true, role: true } },
            closer: { select: { fullName: true, role: true } },
            vendor: { select: { id: true, name: true, riskLevel: true, status: true } },
            site: { select: { id: true, siteName: true, address: true, status: true } },
            contract: { select: { id: true, contractCode: true, contractName: true, status: true } },
            timeline: { orderBy: { createdAt: 'asc' }, take: 200 },
            evidences: { orderBy: { createdAt: 'asc' }, take: 200 }
          }
        });
      }, { readOnly: true });
    }, IncidentRepository.DETAIL_TTL);
  }

  static async invalidateList(tenantId: string) {
    await CacheManager.delByPattern(`incident:list:${tenantId}:*`);
  }

  static async invalidateDetail(id: string) {
    await CacheManager.delByPattern(`incident:detail:*:${id}`);
  }
}
