import { redis, isRedisMock } from '../../infra/redis/client.js';
import { logger } from '../logger/index.js';
import { redisPubSub } from '../redis.js';

export class CacheManager {
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly L1_TTL = 30; // 30 seconds (v3.4 Quick Win)
  private static readonly INV_CHANNEL = 'cache:invalidation';
  
  private static readonly MAX_L1_ENTRIES = 500;
  
  // L1 In-Process Cache Store
  private static l1Cache = new Map<string, { value: any; expiry: number }>();
  private static isInitialized = false;
  private static readonly instanceId = Math.random().toString(36).substring(2, 15);

  /**
   * Initialize Redis Pub/Sub for cross-replica invalidation
   */
  static async init() {
    if (this.isInitialized) return;
    
    try {
      if (isRedisMock) {
        logger.info('CacheManager: skip pub/sub init (Mock Mode)');
        this.isInitialized = true;
        return;
      }

      const sub = redisPubSub.getSub();
      await sub.subscribe(this.INV_CHANNEL);
      
      sub.on('message', (channel, message) => {
        if (channel !== this.INV_CHANNEL) return;

        try {
          const { type, payload, senderId } = JSON.parse(message);
          
          if (senderId === this.instanceId) return; // Skip if it's from ourselves

          if (type === 'DEL') {
            this.l1Cache.delete(payload);
            logger.debug({ key: payload }, 'L1 Cache invalidated via Pub/Sub');
          } else if (type === 'CLEAR') {
            this.l1Cache.clear();
            logger.debug('L1 Cache cleared via Pub/Sub');
          }
        } catch (err) {
          logger.error({ err, message }, 'Failed to process cache invalidation message');
        }
      });

      this.isInitialized = true;
      logger.info({ instanceId: this.instanceId }, '✅ CacheManager Pub/Sub synchronized');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize CacheManager Pub/Sub');
    }
  }

  static {
    // Background Eviction Job (v3.8.1): Run every 60 seconds to clean up expired entries
    // Uses unref() to allow Node.js process to exit if only this interval is left
    setInterval(() => {
      const now = Date.now();
      let evictedCount = 0;
      for (const [key, entry] of CacheManager.l1Cache) {
        if (entry.expiry < now) {
          CacheManager.l1Cache.delete(key);
          evictedCount++;
        }
      }
      if (evictedCount > 0) {
        logger.debug({ evictedCount, currentSize: CacheManager.l1Cache.size }, "L1 Cache background eviction completed");
      }
    }, 60_000).unref();
  }

  /**
   * Helper to add to L1 with size protection
   */
  private static setToL1(key: string, value: any, expiry: number): void {
    // Size-based eviction: If full, remove oldest entry (FIFO approach with Map)
    if (this.l1Cache.size >= this.MAX_L1_ENTRIES && !this.l1Cache.has(key)) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey !== undefined) {
        this.l1Cache.delete(firstKey);
      }
    }
    this.l1Cache.set(key, { value, expiry });
  }

  /**
   * Get item from cache (L1 -> L2)
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      // 1. Check L1 Cache
      const l1Entry = this.l1Cache.get(key);
      if (l1Entry && l1Entry.expiry > Date.now()) {
        return l1Entry.value as T;
      }

      // 2. Fallback to L2 (Redis)
      const data = await redis.get(key);
      if (!data) return null;
      
      const parsed = JSON.parse(data) as T;

      // 3. Backfill L1
      this.setToL1(key, parsed, Date.now() + (this.L1_TTL * 1000));

      return parsed;
    } catch (err) {
      logger.error({ err, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set item to cache (L1 + L2)
   */
  static async set(key: string, value: any, ttlSeconds: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const data = JSON.stringify(value);
      
      // Update L2
      await redis.set(key, data, 'EX', ttlSeconds);

      // Update L1
      this.setToL1(key, value, Date.now() + (this.L1_TTL * 1000));
      
      // Notify other replicas to clear L1 for this key (Selective Invalidation)
      await this.broadcastInvalidation('DEL', key);
    } catch (err) {
      logger.error({ err, key }, 'Cache set error');
    }
  }

  /**
   * Delete item from cache (L1 + L2 - Active Invalidation)
   */
  static async del(key: string): Promise<void> {
    try {
      // Invalidate L1
      this.l1Cache.delete(key);
      // Invalidate L2
      await redis.del(key);
      
      // Broadcast to other replicas
      await this.broadcastInvalidation('DEL', key);
    } catch (err) {
      logger.error({ err, key }, 'Cache del error');
    }
  }

  /**
   * Pattern based delete
   */
  static async delByPattern(pattern: string): Promise<void> {
    try {
      // Invalidate L1 (Simple full clear for pattern match in L1 to ensure safety)
      this.l1Cache.clear();

      let cursor = '0';
      const maxBatchSize = 100;
      
      do {
        // SCAN is O(1) for each step and does not block the event loop
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', maxBatchSize);
        cursor = nextCursor;
        
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
      
      // Broadcast to other replicas
      await this.broadcastInvalidation('CLEAR');
    } catch (err) {
      logger.error({ err, pattern }, 'Cache delByPattern error');
    }
  }

  /**
   * Helper to broadcast L1 invalidation
   */
  private static async broadcastInvalidation(type: 'DEL' | 'CLEAR', payload?: string) {
    if (isRedisMock) return;
    try {
      await redisPubSub.getPub().publish(
        this.INV_CHANNEL, 
        JSON.stringify({ type, payload, senderId: this.instanceId })
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to broadcast cache invalidation');
    }
  }

  /**
   * Wrap an async operation with caching
   * Adds "thundering herd" guard using Redis NX lock + exponential backoff.
   */
  static async wrap<T>(
    key: string, 
    fn: () => Promise<T>, 
    ttlSeconds: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const lockKey = `${key}:lock`;
    const startTime = Date.now();
    const MAX_WAIT_MS = 500; // FIX [V4.24.0]: Strict global lock timeout (applies to all cache keys, not just auth)
    let attempt = 0;

    while (Date.now() - startTime < MAX_WAIT_MS) {
      // 1. Thử lấy lock trong 5 giây (EX: TTL, NX: Only set if not exists)
      const lockAcquired = await redis.set(lockKey, 'true', 'EX', 5, 'NX');

      if (lockAcquired === 'OK') {
        try {
          // 2. Double check cache
          const doubleCheck = await this.get<T>(key);
          if (doubleCheck) return doubleCheck;

          const result = await fn();
          if (result !== undefined && result !== null) {
            await this.set(key, result, ttlSeconds);
          }
          return result;
        } finally {
          await redis.del(lockKey);
        }
      }

      // 4. Không lấy được lock -> Chờ ngắn sử dụng Exponential Backoff và kiểm tra lại cache
      await new Promise(resolve => setTimeout(resolve, Math.min(50 * Math.pow(2, attempt), 500)));
      attempt++;
      const retryCached = await this.get<T>(key);
      if (retryCached) return retryCached;
    }

    // 6. Fallback after timeout
    logger.warn({ key, elapsed: Date.now() - startTime }, 'Cache wrap timeout: Fallback to direct call');
    return await fn();
  }
}
