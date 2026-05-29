/**
 * queue/index.ts — BullMQ Queue & Worker factory
 *
 * FIX ROOT CAUSE: "client[commandNameWithVersion] is not a function"
 *
 * BullMQ nội bộ gọi các lệnh Redis theo pattern:
 *   client['lmpop2'], client['xautoclaim2'], client['zadd2'], ...
 *
 * Proxy wrapper (redisClient) không thể forward các dynamic property key này
 * vì Proxy chỉ bind các method tồn tại trên ioredis instance thật.
 * ioredis-mock cũng không implement commandNameWithVersion.
 *
 * GIẢI PHÁP: BullMQ Queue và Worker PHẢI dùng raw ioredis instance
 *            từ getBullRedis() — một dedicated connection KHÔNG qua Proxy.
 */

import { Queue, Worker, Job, DefaultJobOptions } from 'bullmq';
import { propagation, context, trace, SpanStatusCode } from '@opentelemetry/api';
import { getBullRedis, isRedisMock } from '../../infra/redis/client.js';
import { logger } from '../logger/index.js';
import { metrics } from '../metrics.js';
import { canonicalStringify } from '../utils/normalization.js';
import crypto from 'crypto';

// ─── Enterprise job defaults ──────────────────────────────────

const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: {
    age: 3600 * 24,    // Giữ 24h sau khi completed
    count: 1000,
  },
  removeOnFail: {
    age: 3600 * 24 * 7, // Giữ 7 ngày sau khi failed
  },
};

// ─── Helpers ──────────────────────────────────────────────────

export const generateIdempotencyKey = (payload: unknown, salt = ''): string =>
  crypto
    .createHash('sha256')
    .update(canonicalStringify(payload) + salt)
    .digest('hex');

// ─── Mock Layer (dùng khi isRedisMock = true / local dev) ─────

class MockQueue {
  private jobs = new Map<string, unknown>();
  constructor(public name: string) {}

  async add(name: string, data: unknown, opts?: { jobId?: string }) {
    const id = opts?.jobId || Math.random().toString(36).slice(2, 9);
    const job = { id, name, data, getState: async () => 'completed', returnvalue: {} };
    this.jobs.set(id, job);
    logger.info({ queue: this.name, jobName: name, jobId: id }, 'MockQueue: Job added');
    return job;
  }

  async addBulk(jobs: { name: string; data: unknown; opts?: { jobId?: string } }[]) {
    return Promise.all(jobs.map(j => this.add(j.name, j.data, j.opts)));
  }

  async getJob(id: string) {
    return this.jobs.get(id) ?? null;
  }

    async getJobs(_types: string[], _start?: number, _end?: number) {
    return [...this.jobs.values()];
  }
}

class MockWorker {
  constructor(public name: string, public processor: unknown) {}
  on() { return this; }
  async run() { logger.info({ name: this.name }, 'MockWorker: started (no-op)'); }
  async close() {}
}

// ─── DLQ ─────────────────────────────────────────────────────

let _dlqQueue: Queue | null = null;

export const getDLQQueue = (): Queue | null => {
  if (isRedisMock) return null;
  if (!_dlqQueue) {
    // FIX: dùng getBullRedis() — raw ioredis, KHÔNG phải Proxy
    _dlqQueue = new Queue('DLQ', { connection: getBullRedis() });
  }
  return _dlqQueue;
};

// ─── Queue singletons ─────────────────────────────────────────

let _heavyQueue: Queue | MockQueue | null = null;
let _lightQueue: Queue | MockQueue | null = null;

export const getHeavyQueue = (): Queue => {
  if (!_heavyQueue) {
    _heavyQueue = isRedisMock
      ? new MockQueue('heavy-jobs')
      : new Queue('heavy-jobs', {
          // FIX: getBullRedis() trả về raw ioredis instance
          connection: getBullRedis(),
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
  }
  return _heavyQueue as Queue;
};

export const getLightQueue = (): Queue => {
  if (!_lightQueue) {
    _lightQueue = isRedisMock
      ? new MockQueue('light-jobs')
      : new Queue('light-jobs', {
          // FIX: getBullRedis() trả về raw ioredis instance
          connection: getBullRedis(),
          defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
  }
  return _lightQueue as Queue;
};

// ─── Worker factory ───────────────────────────────────────────

const tracer = trace.getTracer('scmd-queue-worker');

export const createWorker = (
  name: string,
  processor: (job: Job) => Promise<unknown>,
  customConcurrency?: number,
  autorun = true,
): Worker => {
  if (isRedisMock) {
    return new MockWorker(name, processor) as unknown as Worker;
  }

  const worker = new Worker(name, async (job) => {
    // FIX [P3]: Trace Context Propagation from API → Worker
    const parentContext = propagation.extract(context.active(), job.data?._traceContext || {});
    
    return await tracer.startActiveSpan(`Job:${job.name}`, {
      attributes: {
        'messaging.system': 'bullmq',
        'messaging.destination': name,
        'messaging.operation': 'process',
        'messaging.message_id': job.id,
      }
    }, parentContext, async (span) => {
      try {
        const result = await processor(job);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err: any) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }, {
    // FIX: getBullRedis() trả về raw ioredis instance
    // BullMQ cần raw client để gọi client['lmpop2'], client['zadd2'], ...
    connection: getBullRedis(),
    autorun,
    // FIX [MEDIUM]: Luôn dùng đúng định mức concurrency từ AGENTS.md nếu không được pass custom
    concurrency: customConcurrency ?? (name.includes('heavy') ? 3 : 30),
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Worker: Job completed');
  });

  worker.on('failed', async (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        name: job?.name,
        attemptsMade: job?.attemptsMade,
        err: err.message,
      },
      'Worker: Job failed',
    );

    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      logger.warn({ jobId: job.id }, 'Job exhausted retries → moving to DLQ');
      const dlq = getDLQQueue();
      if (dlq) {
        await dlq.add(
          `DLQ_${job.name}`,
          {
            originalJobId: job.id,
            data: job.data,
            error: err.message,
            failedAt: new Date().toISOString(),
          },
          { jobId: `DLQ_${job.id}` },
        );
      }
    }
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, `Worker [${name}]: unhandled error`);
  });

  return worker;
};

// ─── Metrics Sync ───────────────────────────────────────────

export const syncQueueMetrics = async () => {
  try {
    const heavy = getHeavyQueue();
    const light = getLightQueue();
    const dlq = getDLQQueue();

    if (!(heavy instanceof MockQueue)) {
      const h_waiting = await heavy.getJobCountByTypes('waiting', 'delayed');
      const h_active = await heavy.getJobCountByTypes('active');
      metrics.updateQueueDepth('heavy-jobs', 'waiting', h_waiting);
      metrics.updateQueueDepth('heavy-jobs', 'active', h_active);
    }

    if (!(light instanceof MockQueue)) {
      const l_waiting = await light.getJobCountByTypes('waiting', 'delayed');
      const l_active = await light.getJobCountByTypes('active');
      metrics.updateQueueDepth('light-jobs', 'waiting', l_waiting);
      metrics.updateQueueDepth('light-jobs', 'active', l_active);
    }

    if (dlq) {
      const d_waiting = await dlq.getJobCountByTypes('waiting', 'active', 'failed');
      metrics.updateQueueDepth('DLQ', 'pending', d_waiting);
    }
  } catch (err) {
    logger.debug({ err }, 'Failed to sync queue metrics');
  }
};

// Start periodic sync (15s as per AGENTS.md)
setInterval(() => {
  syncQueueMetrics().catch(() => {});
}, 15000);

export class QueueService {
  static async addJob(
    name: string,
    payload: Record<string, unknown>,
    salt = '',
    options: { delay?: number } = {},
  ) {
    const jobId = generateIdempotencyKey(payload, salt);
    // FIX [PERF]: Phân loại job dựa trên AGENTS.md spec
    const heavyTypes = [
      'GENERATE_PDF', 
      'generate-pdf', 
      'SCREENSHOT', 
      'AI_ANALYSIS', 
      'AI_INCIDENT_IMAGE_ANALYSIS',
      'MONTHLY_AI_STRATEGY',
      'MONTHLY_COMPLIANCE',
      'EXPORT_MONTHLY_ACCEPTANCE_PDF',
      'EXPORT_MONTHLY_ACCEPTANCE_EXCEL',
      'HEAVY_BATCH_PROCESS',
      'AUDIT_LOG_CLEANUP'
    ];
    const type = (payload['type'] as string) || name;
    const isHeavy = heavyTypes.includes(type) || heavyTypes.includes(name);
    
    const queue = isHeavy ? getHeavyQueue() : getLightQueue();

    // FIX [P3]: Inject Trace Context into Job Payload
    const carrier = {};
    propagation.inject(context.active(), carrier);
    payload._traceContext = carrier;

    const job = await queue.add(name, payload, { jobId, delay: options.delay });

    logger.info(
      { jobId: job.id, name, isHeavy, isDuplicate: job.id !== jobId },
      'QueueService: Job dispatched',
    );

    return job;
  }

  static async getJobStatus(id: string) {
    let job = (await getLightQueue().getJob(id)) ?? (await getHeavyQueue().getJob(id));
    if (!job) {
      const dlq = getDLQQueue();
      if (dlq) job = await dlq.getJob(`DLQ_${id}`);
    }
    return job;
  }

  static async getDLQJobs(limit = 10) {
    const dlq = getDLQQueue();
    if (!dlq || isRedisMock) return [];
    return dlq.getJobs(['waiting', 'active', 'completed'], 0, limit - 1, true);
  }

  static async replayDLQJob(jobId: string) {
    const dlq = getDLQQueue();
    if (!dlq || isRedisMock) throw new Error('DLQ not available or in mock mode');

    const job = await dlq.getJob(jobId);
    if (!job) throw new Error(`DLQ Job not found: ${jobId}`);

    const { originalJobId, data, name } = job.data;
    const cleanName = name || job.name.replace('DLQ_', '');
    
    logger.info({ dlqJobId: jobId, originalJobId, jobName: cleanName }, 'QueueService: Replaying DLQ job');

    // Re-dispatch original job
    await this.addJob(cleanName, data, `replay:${Date.now()}`);

    // Remove from DLQ
    await job.remove();

    return { success: true, replayedJobId: originalJobId };
  }

  static _lastAlertTime = 0;

  static async getWorkerHealth() {
    if (isRedisMock) {
      return {
        status: 'healthy',
        bullmq_heavy: 'alive',
        bullmq_light: 'alive',
        pending_jobs: 0,
        failed_jobs: 0,
        mockMode: true,
      };
    }

    const heavy = getHeavyQueue();
    const light = getLightQueue();
    const dlq = getDLQQueue();

    const [hWorkers, lWorkers] = await Promise.all([
      heavy.getWorkers(),
      light.getWorkers(),
    ]);

    const hWaiting = await heavy.getJobCountByTypes('waiting', 'delayed');
    const lWaiting = await light.getJobCountByTypes('waiting', 'delayed');
    const pending_jobs = hWaiting + lWaiting;

    const hFailed = await heavy.getJobCountByTypes('failed');
    const lFailed = await light.getJobCountByTypes('failed');
    const dWaiting = dlq ? await dlq.getJobCountByTypes('waiting', 'failed') : 0;
    const failed_jobs = hFailed + lFailed + dWaiting;

    const bullmq_heavy = hWorkers.length > 0 ? 'alive' : 'dead';
    const bullmq_light = lWorkers.length > 0 ? 'alive' : 'dead';

    const status = (bullmq_heavy === 'alive' && bullmq_light === 'alive') ? 'healthy' : 'unhealthy';
    
    // Threshold for alert
    const threshold = 100;

    if (pending_jobs > threshold || status === 'unhealthy') {
      const now = Date.now();
      // Debounce alerts to once every 5 minutes (300000ms)
      if (now - QueueService._lastAlertTime > 300000) {
        QueueService._lastAlertTime = now;
        try {
          const { ProactiveAlertService } = await import('./proactive-alert.service.js');
          await ProactiveAlertService.triggerPlatformAlert({
            type: 'WORKER_QUEUE_ISSUE',
            title: `Worker Queue ${status === 'unhealthy' ? 'CRASHED' : 'OVERLOAD'}`,
            message: `Worker status -> Heavy: ${bullmq_heavy}, Light: ${bullmq_light}. Pending Jobs: ${pending_jobs}. Failed Jobs: ${failed_jobs}`,
          });
        } catch (err) {
          logger.error({ err }, 'Failed to trigger proactive alert during healthcheck');
        }
      }
    }

    return {
      status,
      bullmq_heavy,
      bullmq_light,
      pending_jobs,
      failed_jobs,
    };
  }

  static async closeAllQueues() {
    logger.info('🛑 Closing all BullMQ queues and workers...');
    const queues = [_heavyQueue, _lightQueue, _dlqQueue].filter(q => q && !(q instanceof MockQueue));
    await Promise.all(queues.map(q => (q as Queue).close().catch(() => {})));
    
    // Cleanup singletons
    _heavyQueue = null;
    _lightQueue = null;
    _dlqQueue = null;
    
    logger.info('✅ All BullMQ resources closed');
  }
}
