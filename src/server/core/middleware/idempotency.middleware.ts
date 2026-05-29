import { Request, Response, NextFunction } from 'express';
import { redisClient as redis } from '../redis.js';
import { logger } from '../logger/index.js';
import { db } from '../db/prisma.js';

/**
 * Idempotency Service: Saves the result of an operation for a given key.
 * Now supports Hybrid Storage (Redis + PostgreSQL) for critical operations.
 */
export class IdempotencyService {
  private static TTL_REDIS = 24 * 60 * 60; // 24 hours
  private static DEFAULT_LOCK_TTL = 30; // 30 seconds default
  private static HEAVY_LOCK_TTL = 120; // 120 seconds for PDF/AI

  static getLockTTL(path: string): number {
    if (path.includes('/reports/generate-pdf') || 
        path.includes('/export-pdf') || 
        path.includes('/ai/analyze') ||
        path.includes('/cv-pdf')) {
      return this.HEAVY_LOCK_TTL;
    }
    return this.DEFAULT_LOCK_TTL;
  }

  static shouldPersistToDb(path: string): boolean {
    // Critical mutations that must survive Redis eviction
    const criticalPaths = [
      '/tenant/staff',
      '/tenant/tasks',
      '/tenant/incidents'
    ];
    return criticalPaths.some(p => path.startsWith(p));
  }

  static async getResult(key: string): Promise<any | null> {
    // 1. Try Redis first
    const cached = await redis.get(`idemp:${key}`);
    if (cached) return JSON.parse(cached);

    // 2. Try DB fallback
    const dbRecord = await db.system().idempotency.findUnique({
      where: { key }
    });
    
    if (dbRecord && dbRecord.expiresAt > new Date()) {
      // Re-hydrate Redis if found in DB
      await redis.setex(`idemp:${key}`, this.TTL_REDIS, JSON.stringify(dbRecord.result));
      return dbRecord.result;
    }

    return null;
  }

  static async acquireLock(key: string, ttl: number = this.DEFAULT_LOCK_TTL): Promise<boolean> {
    const lockKey = `idemp_lock:${key}`;
    const acquired = await redis.set(lockKey, 'LOCKED', 'EX', ttl, 'NX');
    return acquired === 'OK';
  }

  static async releaseLock(key: string) {
    await redis.del(`idemp_lock:${key}`);
  }

  /**
   * saveResult now supports multi-layered persistence.
   */
  static async saveResult(key: string, result: any, path: string): Promise<void> {
    try {
      // 1. Persist to Redis (Fast access)
      await redis.setex(`idemp:${key}`, this.TTL_REDIS, JSON.stringify(result));

      // 2. Persist to DB for critical mutations
      if (this.shouldPersistToDb(path)) {
        await db.system().idempotency.upsert({
          where: { key },
          create: {
            key,
            result,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days in DB
          },
          update: {
            result,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }).catch((err: any) => {
          logger.error({ err, key }, 'IDEMPOTENCY: DB persistence failed but Redis succeeded');
        });
      }

      logger.info({ key, path }, 'Saved Hybrid idempotency result');
    } catch (err) {
      logger.error({ err, key }, 'IDEMPOTENCY: Failed to save result. Lock will be released.');
      throw err;
    } finally {
      await this.releaseLock(key).catch((lockErr: any) => {
        logger.error({ lockErr, key }, 'IDEMPOTENCY: Failed to release lock');
      });
    }
  }

  static async cleanupExpired() {
    await db.system().idempotency.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
  }
}

/**
 * Idempotency Middleware:
 * Uses 'x-idempotency-key' header to deduplicate requests.
 * Enhanced in v4.33.30 with dynamic TTL and DB-backed persistence.
 */
export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
  const rawKey = req.headers['x-idempotency-key'] as string;
  
  if (!rawKey) return next();

  // [FIX M-03]: Scope key theo tenantId để tránh cross-tenant collision.
  // Trước đây key = rawKey → 2 tenant dùng cùng UUID (hoặc client cố ý) → tenant B
  // nhận cached response của tenant A. Dùng tenantId từ req.user (đã verify bởi requireAuth).
  const tenantId = (req as any).user?.tenantId || (req as any).subdomain || 'unknown';
  const key = `${tenantId}:${rawKey}`;

  const path = req.originalUrl;
  const lockTtl = IdempotencyService.getLockTTL(path);

  try {
    // 1. Check if result already exists
    const cached = await IdempotencyService.getResult(key);
    if (cached) {
      logger.info({ key, url: path }, 'Idempotency hit: returning cached result');
      return res.status(200).json(cached);
    }

    // 2. Acquire Distributed Lock with dynamic TTL
    const locked = await IdempotencyService.acquireLock(key, lockTtl);
    if (!locked) {
      return res.status(409).json({ error: 'Conflict: Request for this key is already in progress. Please retry.' });
    }

    // 3. Crash safety
    req.on('close', () => {
      if (!res.writableEnded) {
        IdempotencyService.releaseLock(key).catch(err => {
          logger.warn({ err, key }, 'Idempotency: Failed to release lock on connection close');
        });
      }
    });

    // 4. Proxy res.json
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        IdempotencyService.saveResult(key, body, path).catch(err => {
          logger.error({ err, key }, 'Idempotency: saveResult failed');
        });
      } else {
        IdempotencyService.releaseLock(key).catch(err => {
          logger.warn({ err, key }, 'Idempotency: Failed to release lock on error response');
        });
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error({ err, path }, 'Idempotency middleware error');
    IdempotencyService.releaseLock(key).catch(e => {
      logger.warn({ e, key }, 'Idempotency: Failed to release lock on middleware crash');
    });
    next();
  }
};
