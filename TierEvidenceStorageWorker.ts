import { Job, Worker } from 'bullmq';
import { db } from './src/server/core/db/prisma.js';
import { logger } from './src/server/core/logger/index.js';
import { getBullRedis } from './src/server/infra/redis/client.js';
import { TierIncidentEvidenceStorageUseCase } from './src/server/modules/incident/application/tier-incident-evidence-storage.usecase.js';

/**
 * V.5.6.2.1: Automated Storage Tiering Job
 * Worker chạy hàng tuần để fan-out job phân tầng evidence theo từng tenant.
 */
export const tierEvidenceStorageWorker = new Worker(
  'heavy-jobs',
  async (job: Job) => {
    if (job.name !== 'TIER_EVIDENCE_STORAGE') {
      return;
    }

    logger.info({ jobId: job.id, jobName: job.name }, '[Worker] Bắt đầu chạy job TIER_EVIDENCE_STORAGE');

    const tenants = await db.system().tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const tieringUseCase = new TierIncidentEvidenceStorageUseCase();

    for (const tenant of tenants) {
      try {
        const result = await tieringUseCase.execute(tenant.id);

        if (result.queued > 0) {
          logger.info(
            { tenantId: tenant.id, queued: result.queued },
            '[Worker] Đã đưa bằng chứng vào outbox để chuyển sang COLD storage',
          );
        }
      } catch (err) {
        logger.error({ err, tenantId: tenant.id }, '[Worker] Lỗi phân tầng evidence theo tenant');
      }
    }
  },
  {
    connection: getBullRedis(),
    concurrency: 1,
  },
);