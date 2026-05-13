import { redis, isRedisMock } from '../../infra/redis/client.js';
import { logger } from '../logger/index.js';

const memoryCache = new Map<string, { value: string, expires: number }>();

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      // 1. Try Redis first
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      
      // 2. Fallback to memory if Redis is mock or returned nothing
      const entry = memoryCache.get(key);
      if (entry) {
        if (entry.expires > Date.now()) {
          return JSON.parse(entry.value) as T;
        }
        memoryCache.delete(key);
      }
      return null;
    } catch (e) {
      logger.error({ key, e }, 'Cache get error');
      return null;
    }
  },

  set: async (key: string, value: any, ttl = 3600): Promise<void> => {
    try {
      const stringValue = JSON.stringify(value);
      
      // 1. Always set in Redis
      await redis.set(key, stringValue, 'EX', ttl);
      
      // 2. Set in memory ONLY if Redis is a mock (waste avoidance)
      if (isRedisMock) {
        memoryCache.set(key, {
          value: stringValue,
          expires: Date.now() + (ttl * 1000)
        });
      }
    } catch (e) {
      logger.error({ key, e }, 'Cache set error');
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      await redis.del(key);
      if (isRedisMock) {
        memoryCache.delete(key);
      }
    } catch (e) {
      logger.error({ key, e }, 'Cache del error');
    }
  },

  increment: async (key: string): Promise<number> => {
    try {
      const val = await redis.incr(key);
      return val;
    } catch (e) {
      logger.error({ key, e }, 'Cache incr error');
      return 0;
    }
  },

  /**
   * PERF-03 Fix: Distributed Lock pattern for cache fetch
   * Prevents "Thundering Herd" where multiple requests hit DB simultaneously on cache miss.
   */
  getOrFetch: async <T>(key: string, fetcher: () => Promise<T>, ttl = 3600): Promise<T> => {
    // 1. Try simple get
    const cached = await cache.get<T>(key);
    if (cached) return cached;

    // 2. Cache miss - Try to acquire distributed lock (10s expiry)
    const lockKey = `lock:${key}`;
    const acquired = isRedisMock ? true : await redis.set(lockKey, 'locked', 'EX', 10, 'NX');

    if (!acquired) {
      // Someone else is fetching. Poll cache with exponential backoff
      for (let attempt = 0; attempt < 5; attempt++) {
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        const retryCached = await cache.get<T>(key);
        if (retryCached) return retryCached;
      }
      // Only fallback to fetching if all retries failed
    }

    // 3. Fetch from source
    try {
      const freshData = await fetcher();
      await cache.set(key, freshData, ttl);
      return freshData;
    } finally {
      // 4. Release lock
      if (!isRedisMock) await redis.del(lockKey);
    }
  }
};
