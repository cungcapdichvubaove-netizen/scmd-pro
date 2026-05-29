import { logger } from '../../../core/logger/index.js';
import { db } from '../../../core/db/prisma.js';
import { CacheManager } from '../../../core/cache/manager.js';
import { EventBus } from '../../../core/events/event-bus.js';
import { MediaService } from '../../../core/media/media.service.js';

type EvidenceMetadata = Record<string, any>;

type TieringCandidate = {
  id: string;
  metadata: EvidenceMetadata | null;
};

type TieringRequestPayload = {
  evidenceId: string;
  targetClass: 'COLD';
  reason: string;
  storageKey: string;
};

const STORAGE_TIERING_EVENT = 'EVIDENCE_STORAGE_TIERING_REQUESTED';
const TARGET_CLASS = 'COLD' as const;

const readStorageKey = (metadata: EvidenceMetadata | null | undefined): string | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const value = metadata.storageKey;
  return typeof value === 'string' && value.trim() ? value : null;
};

const readStorageClass = (metadata: EvidenceMetadata | null | undefined): string => {
  if (!metadata || typeof metadata !== 'object') {
    return 'STANDARD';
  }

  const value = metadata.storageClass;
  return typeof value === 'string' && value.trim() ? value : 'STANDARD';
};

const buildTieredMetadata = (metadata: EvidenceMetadata | null | undefined, targetClass: string) => ({
  ...(metadata && typeof metadata === 'object' ? metadata : {}),
  storageClass: targetClass,
  tieredAt: new Date().toISOString(),
});

export class TierIncidentEvidenceStorageUseCase {
  async execute(tenantId: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);

    logger.info({ tenantId, cutoffDate: cutoffDate.toISOString() }, '[StorageTiering] Scanning locked incident evidences for cold tiering');

    const queued = await db.withTenant(tenantId, async (tx) => {
      const targets = await tx.incidentEvidence.findMany({
        where: {
          tenantId,
          isReportLocked: true,
          createdAt: { lt: cutoffDate },
        },
        select: {
          id: true,
          metadata: true,
        },
        take: 500,
      });

      let queuedCount = 0;
      for (const evidence of targets as TieringCandidate[]) {
        const storageKey = readStorageKey(evidence.metadata);
        const storageClass = readStorageClass(evidence.metadata);

        if (!storageKey || storageClass === TARGET_CLASS) {
          continue;
        }

        await EventBus.dispatch({
          type: STORAGE_TIERING_EVENT,
          version: '1.0',
          tenantId,
          actorId: 'SYSTEM',
          payload: {
            evidenceId: evidence.id,
            storageKey,
            targetClass: TARGET_CLASS,
            reason: 'Auto-tiering after 180 days',
          } satisfies TieringRequestPayload,
        }, tx);

        queuedCount++;
      }

      return queuedCount;
    });

    return { queued };
  }

  async processTieringRequest(tenantId: string, payload: TieringRequestPayload) {
    await MediaService.changeStorageClass(payload.storageKey, payload.targetClass);

    await db.withTenant(tenantId, async (tx) => {
      const evidence = await tx.incidentEvidence.findUnique({
        where: { id: payload.evidenceId },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (!evidence) {
        throw new Error('EVIDENCE_NOT_FOUND');
      }

      const currentStorageClass = readStorageClass(evidence.metadata as EvidenceMetadata | null);
      if (currentStorageClass === payload.targetClass) {
        logger.info({ tenantId, evidenceId: payload.evidenceId }, '[StorageTiering] Evidence already tiered, skipping metadata update');
        return;
      }

      await tx.incidentEvidence.update({
        where: { id: payload.evidenceId },
        data: {
          metadata: buildTieredMetadata(evidence.metadata as EvidenceMetadata | null, payload.targetClass),
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: 'SYSTEM',
          action: 'STORAGE_TIERING_MIGRATED',
          resource: 'IncidentEvidence',
          status: 'SUCCESS',
          timestamp: BigInt(Date.now()),
          payload: {
            evidenceId: payload.evidenceId,
            oldClass: currentStorageClass,
            newClass: payload.targetClass,
            storageKey: payload.storageKey,
            reason: payload.reason,
          },
        },
      });
    });

    await CacheManager.del(`evidence:url:${payload.evidenceId}`);
  }
}
