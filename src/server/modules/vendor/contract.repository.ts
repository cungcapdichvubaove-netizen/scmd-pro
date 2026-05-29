import { db } from '../../core/db/prisma.js';
import { SecurityContext } from '../../core/architecture/types.js';
import { applyVendorActorScope } from '../../shared/security/vendor-actor-scope.js';
import { syncContractPenaltyRules } from './contract-penalty-rules.repository.js';
import { ContractSyncService } from './contract-sync.service.js';
import { ContractDTO, ContractVersionCreateDTO } from './vendor.schema.js';
import {
  ACTIVE_CONTRACT_STATUS,
  buildScopedContractWhere,
  clampCursorLimit,
  throwBadRequest,
  throwConflict,
  throwContractNotFound,
  throwContractVersionNotFound,
  throwSiteNotFound,
  throwVendorNotFound,
  toCursorPage,
} from './vendor.repository.shared.js';

function buildContractDetailInclude() {
  return {
    activeVersion: {
      include: {
        lineItems: true,
        shiftRequirements: true,
        staffStandards: { include: { appliesToGuardPost: { select: { id: true, postName: true } } } },
        penaltyRules: true,
      },
    },
  };
}

export class ContractRepository {
  static async list(ctx: SecurityContext, cursor?: string, limit: number = 20, view?: string) {
    const isMobile = view === 'mobile';
    const take = clampCursorLimit(limit);

    return await db.withTenant(ctx.tenantId, async (tx) => {
      const contracts: any[] = await tx.contract.findMany({
        where: applyVendorActorScope(ctx, {}),
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: isMobile
          ? {
              id: true,
              contractName: true,
              contractCode: true,
              status: true,
              startDate: true,
              endDate: true,
              siteName: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  score: true,
                },
              },
            }
          : undefined,
        include: isMobile
          ? undefined
          : {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  score: true,
                  status: true,
                  riskLevel: true,
                },
              },
              site: {
                select: {
                  id: true,
                  siteName: true,
                  status: true,
                  guardPosts: { select: { id: true, postName: true, requiredGuardCount: true, status: true } },
                },
              },
            },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });

      return toCursorPage(contracts, take);
    });
  }

  static async listVersions(ctx: SecurityContext, contractId: string) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const contract = await tx.contract.findFirst({
        where: buildScopedContractWhere(ctx, { id: contractId }),
        select: { id: true },
      });

      if (!contract) {
        throwContractNotFound();
      }

      return await tx.contractVersion.findMany({
        where: { contractId },
        orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
      });
    });
  }

  static async createVersion(ctx: SecurityContext, contractId: string, data: ContractVersionCreateDTO) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const contract = await tx.contract.findFirst({
        where: buildScopedContractWhere(ctx, { id: contractId }),
      });

      if (!contract) {
        throwContractNotFound();
      }

      const latest = await tx.contractVersion.findFirst({
        where: { contractId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      return await tx.contractVersion.create({
        data: {
          tenantId: ctx.tenantId,
          contractId,
          versionNumber: (latest?.versionNumber || 0) + 1,
          status: 'DRAFT',
          versionLabel: data.versionLabel,
          changeSummary: data.changeSummary,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          currency: data.currency || contract.currency,
          totalContractValue: data.totalContractValue ?? contract.value,
          guardCountPerShift: data.guardCountPerShift ?? contract.guardCountPerShift,
          acceptancePolicy: data.acceptancePolicy ?? contract.acceptancePolicy,
          evidencePolicy: data.evidencePolicy ?? contract.evidencePolicy,
          penaltyPolicy: data.penaltyPolicy ?? contract.penaltyPolicy,
          slaConfig: data.slaConfig ?? contract.slaConfig,
          metadata: data.metadata,
        },
      });
    });
  }

  static async activateVersion(ctx: SecurityContext, contractId: string, versionId: string) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const contract = await tx.contract.findFirst({
        where: buildScopedContractWhere(ctx, { id: contractId }),
        select: { id: true, activeVersionId: true },
      });

      if (!contract) {
        throwContractNotFound();
      }

      const target = await tx.contractVersion.findFirst({
        where: { id: versionId, contractId },
      });

      if (!target) {
        throwContractVersionNotFound();
      }
      if (target.status === 'ARCHIVED') {
        throwBadRequest('CONTRACT_VERSION_ARCHIVED_CANNOT_ACTIVATE');
      }

      const now = new Date();
      let archivedPrevious = null;

      if (contract.activeVersionId && contract.activeVersionId !== versionId) {
        archivedPrevious = await tx.contractVersion.update({
          where: { id: contract.activeVersionId },
          data: {
            status: 'ARCHIVED',
            archivedAt: now,
            effectiveTo: target.effectiveFrom,
          },
        });
      }

      const activeVersion = await tx.contractVersion.update({
        where: { id: versionId },
        data: {
          status: 'ACTIVE',
          activatedAt: now,
          archivedAt: null,
          effectiveTo: null,
        },
      });

      await tx.contract.update({
        where: { id: contractId },
        data: { activeVersionId: versionId },
      });

      return { activeVersion, archivedPrevious };
    });
  }

  static async archiveVersion(ctx: SecurityContext, contractId: string, versionId: string) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const contract = await tx.contract.findFirst({
        where: buildScopedContractWhere(ctx, { id: contractId }),
        select: { id: true, activeVersionId: true },
      });

      if (!contract) {
        throwContractNotFound();
      }

      const existing = await tx.contractVersion.findFirst({
        where: { id: versionId, contractId },
      });

      if (!existing) {
        throwContractVersionNotFound();
      }

      const now = new Date();
      const archivedVersion = await tx.contractVersion.update({
        where: { id: versionId },
        data: {
          status: 'ARCHIVED',
          archivedAt: now,
          effectiveTo: existing.effectiveTo ?? now,
        },
      });

      if (contract.activeVersionId === versionId) {
        await tx.contract.update({
          where: { id: contractId },
          data: { activeVersionId: null },
        });
      }

      return { archivedVersion, wasActive: contract.activeVersionId === versionId };
    });
  }

  static async create(ctx: SecurityContext, data: ContractDTO) {
    ContractSyncService.requireActiveContractReady(data);

    return await db.withTenant(ctx.tenantId, async (tx) => {
      const [vendor, site] = await Promise.all([
        tx.vendor.findFirst({ where: { id: data.vendorId }, select: { id: true } }),
        tx.site.findFirst({ where: { id: data.siteId }, select: { id: true, siteName: true, status: true } }),
      ]);

      if (!vendor) {
        throwVendorNotFound();
      }
      if (!site) {
        throwSiteNotFound();
      }
      if (site.status !== 'ACTIVE') {
        throwBadRequest('SITE_INACTIVE_CANNOT_BIND_CONTRACT');
      }

      if (data.status === ACTIVE_CONTRACT_STATUS) {
        const overlap = await tx.contract.findFirst({
          where: {
            vendorId: data.vendorId,
            siteId: data.siteId,
            status: ACTIVE_CONTRACT_STATUS,
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
          select: { id: true },
        });

        if (overlap) {
          throwConflict('ACTIVE_CONTRACT_OVERLAP');
        }
      }

      const { siteName: _siteName, ...contractData } = data;
      const contract = await tx.contract.create({
        data: {
          ...contractData,
          siteName: data.siteName || site.siteName,
          tenantId: ctx.tenantId,
          activatedAt: data.status === ACTIVE_CONTRACT_STATUS ? new Date() : null,
        },
      });

      const contractVersion = await ContractSyncService.ensureContractVersion(tx, ctx.tenantId, contract, data);
      await ContractSyncService.syncContractLineItems(tx, ctx.tenantId, contract, contractVersion.id, data.acceptancePolicy, ctx.userId);
      await ContractSyncService.syncContractChecklistRequirements(tx, ctx.tenantId, contract, contractVersion.id, data.evidencePolicy, ctx.userId);
      await ContractSyncService.syncContractShiftRequirements(tx, ctx.tenantId, contract, contractVersion.id, data.acceptancePolicy, ctx.userId);
      await ContractSyncService.syncContractStaffStandards(tx, ctx.tenantId, contract, contractVersion.id, data.acceptancePolicy, ctx.userId);
      await syncContractPenaltyRules(tx, ctx.tenantId, contract.id, contractVersion.id, data.penaltyPolicy, ctx.userId);

      return await tx.contract.findFirst({
        where: { id: contract.id },
        include: buildContractDetailInclude(),
      });
    });
  }

  static async update(ctx: SecurityContext, id: string, data: Partial<ContractDTO>) {
    return await db.withTenant(ctx.tenantId, async (tx) => {
      const existing = await tx.contract.findFirst({ where: { id } });
      if (!existing) {
        throwContractNotFound();
      }

      const next = { ...existing, ...data } as ContractDTO;
      ContractSyncService.requireActiveContractReady(next);

      let siteName = data.siteName;
      if (data.siteId) {
        const site = await tx.site.findFirst({ where: { id: data.siteId }, select: { id: true, siteName: true, status: true } });
        if (!site) {
          throwSiteNotFound();
        }
        if (site.status !== 'ACTIVE') {
          throwBadRequest('SITE_INACTIVE_CANNOT_BIND_CONTRACT');
        }
        siteName = siteName || site.siteName;
      }

      if (next.status === ACTIVE_CONTRACT_STATUS && next.siteId) {
        const overlap = await tx.contract.findFirst({
          where: {
            id: { not: id },
            vendorId: next.vendorId,
            siteId: next.siteId,
            status: ACTIVE_CONTRACT_STATUS,
            startDate: { lte: next.endDate },
            endDate: { gte: next.startDate },
          },
          select: { id: true },
        });
        if (overlap) {
          throwConflict('ACTIVE_CONTRACT_OVERLAP');
        }
      }

      const contract = await tx.contract.update({
        where: { id },
        data: {
          ...data,
          ...(siteName ? { siteName } : {}),
          ...(data.status === ACTIVE_CONTRACT_STATUS && existing.status !== ACTIVE_CONTRACT_STATUS ? { activatedAt: new Date() } : {}),
        },
      });

      const hasContractVersionSurface = typeof tx.contractVersion?.findUnique === 'function'
        && typeof tx.contractVersion?.update === 'function'
        && typeof tx.contractVersion?.create === 'function';
      const contractVersion = hasContractVersionSurface
        ? await ContractSyncService.ensureContractVersion(tx, ctx.tenantId, { ...existing, ...contract }, next)
        : (contract.activeVersionId ? { id: contract.activeVersionId } : null);
      const effectiveContractVersionId = contractVersion?.id ?? contract.activeVersionId ?? existing.activeVersionId ?? null;
      if (tx.contractLineItem?.findMany) {
        await ContractSyncService.syncContractLineItems(tx, ctx.tenantId, { ...existing, ...contract }, effectiveContractVersionId, next.acceptancePolicy, ctx.userId);
      }
      if (tx.contractChecklistRequirement?.findMany) {
        await ContractSyncService.syncContractChecklistRequirements(tx, ctx.tenantId, { ...existing, ...contract }, effectiveContractVersionId, next.evidencePolicy, ctx.userId);
      }
      if (tx.contractShiftRequirement?.findMany) {
        await ContractSyncService.syncContractShiftRequirements(tx, ctx.tenantId, { ...existing, ...contract }, effectiveContractVersionId, next.acceptancePolicy, ctx.userId);
      }
      if (tx.contractStaffStandard?.findMany) {
        await ContractSyncService.syncContractStaffStandards(tx, ctx.tenantId, { ...existing, ...contract }, effectiveContractVersionId, next.acceptancePolicy, ctx.userId);
      }
      await syncContractPenaltyRules(
        tx,
        ctx.tenantId,
        contract.id,
        effectiveContractVersionId,
        data.penaltyPolicy ?? existing.penaltyPolicy,
        ctx.userId,
      );

      return await tx.contract.findFirst({
        where: { id: contract.id },
        include: buildContractDetailInclude(),
      });
    });
  }
}
