import { logger } from '../logger/index.js';
import { db as prisma } from '../db/prisma.js';
import { trace, context } from '@opentelemetry/api';

export interface AuditEntry {
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  payload?: any;
  diff?: {
    before: any;
    after: any;
  };
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  traceId?: string;
}

export class AuditService {
  /**
   * Logs an audit entry.
   * Now FAANG-Level: Supports custom Transaction context to prevent deadlocks when called within an existing transaction.
   */
  static async log(entry: AuditEntry, tx?: any) {
    if (entry.action === 'SUPERADMIN_VIEW_GLOBAL_AUDIT_LOGS') {
      return; // Infinite Audit Bypass
    }
    
    try {
      const now = new Date();
      
      const dbClient = tx || (entry.tenantId && entry.tenantId !== 'PLATFORM' && entry.tenantId !== 'SYSTEM' 
        ? prisma.forTenant(entry.tenantId) 
        : prisma.system());
      
      // ENTERPRISE OBSERVABILITY: Capture traceId from OpenTelemetry context
      const currentSpan = trace.getSpan(context.active());
      const traceId = currentSpan?.spanContext().traceId;
      
      // PostgreSQL as Source of Truth
      try {
        await dbClient.auditLog.create({
          data: {
            userId: entry.userId,
            tenantId: entry.tenantId,
            action: entry.action,
            resource: entry.resource,
            payload: entry.payload ? entry.payload as any : undefined,
            diff: entry.diff ? entry.diff as any : undefined,
            ip: entry.ip,
            userAgent: entry.userAgent,
            status: entry.status,
            traceId: traceId || undefined,
            createdAt: now,
            timestamp: BigInt(now.getTime())
          }
        });
      } catch (dbErr: any) {
        if (process.env.NODE_ENV !== 'production') {
           logger.warn({ entry }, 'Audit record skipped in preview due to Prisma DB error.');
        } else {
           throw dbErr;
        }
      }
    } catch (err) {
      logger.error({ err, entry }, 'CRITICAL_AUDIT_FAILURE: Failed to write audit log to PostgreSQL');
    }
  }

  static async logSensitiveChange(
    userId: string, 
    tenantId: string, 
    action: string, 
    resource: string, 
    before: any, 
    after: any,
    context?: { ip?: string; userAgent?: string },
    tx?: any
  ) {
    return this.log({
      userId,
      tenantId,
      action,
      resource,
      diff: { before, after },
      status: 'SUCCESS',
      ...context
    }, tx);
  }

  static async getLogsByTenant(tenantId: string, cursor?: string, limit: number = 50) {
    try {
      const take = Math.min(limit, 200);
      const logs = await prisma.forTenant(tenantId).auditLog.findMany({
        where: { tenantId },
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });
      
      const hasMore = logs.length > take;
      const items = hasMore ? logs.slice(0, take) : logs;
      const nextCursor = hasMore ? items[items.length - 1].id : null;

      return {
        data: items.map((log: any) => ({
          ...log,
          timestamp: Number(log.timestamp)
        })),
        nextCursor,
        hasMore
      };
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
         logger.warn('Returning mock audit logs in preview due to Prisma DB error.');
         return [];
      }
      logger.error({ err, tenantId }, 'Failed to fetch audit logs from PostgreSQL');
      throw err;
    }
  }

  /**
   * FIX [M-04]: Prune old audit logs with Batching to prevent table locks.
   * Default: Prune logs older than 180 days in batches of 20,000.
   */
  static async pruneLogs(retentionDays: number = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    logger.info({ cutoffDate, retentionDays }, 'AuditService: Starting batched log pruning');
    
    let totalPruned = 0;
    const BATCH_SIZE = 20000;
    const PRUNE_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes upper bound
    const jobStartTime = Date.now();

    try {
      while (true) {
        // Execution Guard: Prevent the job from running too long (V.4.33.0)
        if (Date.now() - jobStartTime > PRUNE_JOB_TIMEOUT_MS) {
          logger.warn({ totalPruned, elapsedMs: Date.now() - jobStartTime }, 'AuditService: Pruning job timeout reached, breaking loop');
          break;
        }

        // Fetch only IDs first for batch
        const logsToDelete = await prisma.system().auditLog.findMany({
          where: { createdAt: { lt: cutoffDate } },
          select: { id: true },
          take: BATCH_SIZE
        });

        if (logsToDelete.length === 0) break;

        const startTime = Date.now();
        const ids = logsToDelete.map((l: any) => l.id);
        const { count } = await prisma.system().auditLog.deleteMany({
          where: { id: { in: ids } }
        });

        const duration = Date.now() - startTime;
        totalPruned += count;
        logger.debug({ count, totalPruned, duration }, 'AuditService: Pruned batch of audit logs');
        
        // Adaptive pause: Yield to event loop and prevent DB pressure.
        // Delay is scaled by execution time (~50% of duration) to respond to DB load,
        // ensuring we don't monopolize the connection pool.
        const sleepTime = Math.max(50, Math.min(1000, duration * 0.5));
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
      
      logger.info({ totalPruned }, 'AuditService: Completed pruning of old audit logs');
      return totalPruned;
    } catch (err) {
      logger.error({ err }, 'AuditService: Failed during batched log pruning');
      throw err;
    }
  }
}

