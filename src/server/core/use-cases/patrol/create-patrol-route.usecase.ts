import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';
import { EventBus } from '../../events/event-bus.js';

const routeCheckpointSchema = z.object({
  checkpointId: z.string().min(1),
  guardPostId: z.string().optional(),
  sequence: z.number().int().positive().optional(),
  sequenceNo: z.number().int().positive().optional(),
  isRequired: z.boolean().optional(),
  required: z.boolean().optional(),
  minOffsetMinutes: z.number().int().nonnegative().optional(),
  minArrivalOffsetMinutes: z.number().int().nonnegative().optional(),
  maxOffsetMinutes: z.number().int().positive().optional(),
  maxArrivalOffsetMinutes: z.number().int().positive().optional(),
  geoRadiusMeters: z.number().int().positive().max(500).optional(),
  gpsRequired: z.boolean().optional(),
  photoRequired: z.boolean().optional(),
  noteRequired: z.boolean().optional(),
});

const createRouteSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  routeName: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  siteId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  positionName: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  expectedDurationMinutes: z.number().int().positive().optional(),
  requiredCompletionPercent: z.number().int().min(1).max(100).optional(),
  repeatIntervalMinutes: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('DRAFT'),
  complianceConfig: z.record(z.unknown()).optional(),
  checkpoints: z.array(routeCheckpointSchema).min(1),
}).refine((data) => data.name || data.routeName, {
  message: 'routeName is required',
});

type RouteCheckpointRecord = {
  id: string;
  status: string;
  siteId: string | null;
  guardPostId: string | null;
};

type RouteGuardPostRecord = {
  id: string;
  siteId: string | null;
  status: string;
};

export class CreatePatrolRouteUseCase extends BaseUseCase<unknown, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected override async validate(request: unknown): Promise<void> {
    createRouteSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, payload: unknown): Promise<any> {
    const data = createRouteSchema.parse(payload);
    const normalizedCheckpoints = data.checkpoints.map((item, index) => ({
      ...item,
      sequence: item.sequence ?? item.sequenceNo ?? index + 1,
      isRequired: item.isRequired ?? item.required ?? true,
      minOffsetMinutes: item.minOffsetMinutes ?? item.minArrivalOffsetMinutes,
      maxOffsetMinutes: item.maxOffsetMinutes ?? item.maxArrivalOffsetMinutes,
      geoRadiusMeters: item.geoRadiusMeters ?? 50,
      gpsRequired: item.gpsRequired ?? true,
      photoRequired: item.photoRequired ?? false,
      noteRequired: item.noteRequired ?? false,
    }));

    const duplicateSequence = new Set<number>();
    const expectedDurationMinutes = data.expectedDurationMinutes ?? data.estimatedMinutes ?? null;
    const checkpointIds = [...new Set(normalizedCheckpoints.map((item) => item.checkpointId))];
    const guardPostIds = [...new Set(normalizedCheckpoints.map((item) => item.guardPostId).filter(Boolean) as string[])];

    let computedVendorId = data.vendorId || null;
    let computedRequiredCompletionPercent = data.requiredCompletionPercent ?? null;
    let contractSlaTarget: number | null = null;

    const route = await db.withTenant(context.tenantId, async (tx: any) => {
      let contract: any = null;
      if (data.contractId) {
        contract = await tx.contract.findFirst({
          where: { id: data.contractId },
          select: { id: true, vendorId: true, siteId: true, status: true, slaConfig: true },
        });
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.status !== 'ACTIVE') throw new Error('PATROL_ROUTE_REQUIRES_ACTIVE_CONTRACT');
        if (data.siteId && contract.siteId && contract.siteId !== data.siteId) throw new Error('CONTRACT_SITE_MISMATCH');
        computedVendorId = computedVendorId || contract.vendorId;

        const slaConfig = (contract.slaConfig || {}) as Record<string, unknown>;
        const target = Number(slaConfig.patrolCompletionTargetPercent ?? slaConfig.min_patrol_compliance);
        contractSlaTarget = Number.isFinite(target) && target > 0 ? Math.min(100, Math.max(1, Math.round(target))) : null;
      }

      const effectiveSiteId = data.siteId || contract?.siteId || null;

      if (data.status === 'ACTIVE') {
        if (!effectiveSiteId) throw new Error('ACTIVE_ROUTE_REQUIRES_SITE');
        if (!expectedDurationMinutes || expectedDurationMinutes <= 0) throw new Error('ACTIVE_ROUTE_REQUIRES_EXPECTED_DURATION');
      }

      if (effectiveSiteId) {
        const site = await tx.site.findFirst({
          where: { id: effectiveSiteId },
          select: { id: true, status: true },
        });
        if (!site) throw new Error('SITE_NOT_FOUND');
        if (site.status !== 'ACTIVE') throw new Error('SITE_INACTIVE_CANNOT_CREATE_ROUTE');
      }

      const checkpoints: RouteCheckpointRecord[] = checkpointIds.length > 0
        ? await tx.checkpoint.findMany({
            where: { id: { in: checkpointIds } },
            select: { id: true, status: true, siteId: true, guardPostId: true },
          })
        : [];
      const checkpointMap = new Map<string, RouteCheckpointRecord>(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
      if (checkpointMap.size !== checkpointIds.length) {
        const missing = checkpointIds.find((checkpointId) => !checkpointMap.has(checkpointId));
        throw new Error(`CHECKPOINT_NOT_FOUND:${missing}`);
      }

      const guardPosts: RouteGuardPostRecord[] = guardPostIds.length > 0
        ? await tx.guardPost.findMany({
            where: { id: { in: guardPostIds } },
            select: { id: true, siteId: true, status: true },
          })
        : [];
      const guardPostMap = new Map<string, RouteGuardPostRecord>(guardPosts.map((guardPost) => [guardPost.id, guardPost]));
      if (guardPostMap.size !== guardPostIds.length) {
        const missing = guardPostIds.find((guardPostId) => !guardPostMap.has(guardPostId));
        throw new Error(`GUARD_POST_NOT_FOUND:${missing}`);
      }

      const finalRequiredCompletionPercent = computedRequiredCompletionPercent ?? contractSlaTarget ?? 100;
      if (data.status === 'ACTIVE' && (finalRequiredCompletionPercent < 1 || finalRequiredCompletionPercent > 100)) {
        throw new Error('ACTIVE_ROUTE_INVALID_COMPLETION_TARGET');
      }

      for (const item of normalizedCheckpoints) {
        if (duplicateSequence.has(item.sequence)) throw new Error('DUPLICATE_ROUTE_SEQUENCE');
        duplicateSequence.add(item.sequence);

        const checkpoint = checkpointMap.get(item.checkpointId);
        if (!checkpoint) throw new Error(`CHECKPOINT_NOT_FOUND:${item.checkpointId}`);
        if (checkpoint.status !== 'active') throw new Error(`CHECKPOINT_INACTIVE:${item.checkpointId}`);
        if (effectiveSiteId && checkpoint.siteId && checkpoint.siteId !== effectiveSiteId) throw new Error(`CHECKPOINT_SITE_MISMATCH:${item.checkpointId}`);

        if (item.guardPostId) {
          const guardPost = guardPostMap.get(item.guardPostId);
          if (!guardPost) throw new Error(`GUARD_POST_NOT_FOUND:${item.guardPostId}`);
          if (guardPost.status !== 'ACTIVE') throw new Error('GUARD_POST_INACTIVE');
          if (effectiveSiteId && guardPost.siteId !== effectiveSiteId) throw new Error('GUARD_POST_SITE_MISMATCH');
          if (checkpoint.guardPostId && checkpoint.guardPostId !== item.guardPostId) {
            throw new Error(`CHECKPOINT_GUARD_POST_MISMATCH:${item.checkpointId}`);
          }
        }
      }

      const created = await tx.patrolRoute.create({
        data: {
          name: data.routeName || data.name,
          description: data.description || null,
          siteId: effectiveSiteId,
          contractId: data.contractId || null,
          vendorId: computedVendorId,
          positionName: data.positionName || null,
          status: data.status,
          estimatedMinutes: expectedDurationMinutes,
          requiredCompletionPercent: finalRequiredCompletionPercent,
          repeatIntervalMinutes: data.repeatIntervalMinutes || null,
          complianceConfig: {
            ...(data.complianceConfig || {}),
            contractPatrolCompletionTargetPercent: contractSlaTarget,
            requiresSessionForCompliance: Boolean(data.contractId),
          },
          createdBy: context.userId,
          checkpoints: {
            create: normalizedCheckpoints.map((item) => ({
              checkpointId: item.checkpointId,
              guardPostId: item.guardPostId || checkpointMap.get(item.checkpointId)?.guardPostId || null,
              sequence: item.sequence,
              isRequired: item.isRequired,
              minOffsetMinutes: item.minOffsetMinutes ?? null,
              maxOffsetMinutes: item.maxOffsetMinutes ?? null,
              geoRadiusMeters: item.geoRadiusMeters,
              gpsRequired: item.gpsRequired,
              photoRequired: item.photoRequired,
              noteRequired: item.noteRequired,
            })),
          },
        },
        include: {
          checkpoints: {
            orderBy: { sequence: 'asc' },
            include: { checkpoint: { select: { id: true, name: true, status: true } } },
          },
        },
      });

      await EventBus.dispatch({
        type: 'PATROL_ROUTE_UPDATED',
        version: '1.0',
        tenantId: context.tenantId,
        actorId: context.userId,
        payload: { routeId: created.id, status: created.status, siteId: created.siteId },
      }, tx);

      return created;
    });

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_PATROL_ROUTE',
      resource: `patrol-route/${route.id}`,
      status: 'SUCCESS',
      payload: { name: route.name, checkpointCount: route.checkpoints.length, requiredCompletionPercent: route.requiredCompletionPercent },
    });

    return route;
  }
}
