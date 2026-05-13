/**
 * infra/redis/client.ts
 *
 * Barrel export cho toàn bộ Redis infrastructure.
 * Đây là file duy nhất các module khác nên import từ.
 *
 * QUAN TRỌNG:
 *   - `redis` (redisClient) → dùng cho app: cache, rate-limit, session
 *   - `getBullRedis()`      → dùng cho BullMQ Queue/Worker (raw ioredis)
 *   - `initBullRedis()`     → PHẢI gọi trong bootstrap() TRƯỚC khi tạo Queue/Worker
 */

import {
  redisClient,
  redisPool,
  isLocal,
  initRedis,
  initBullRedis,
  getBullRedis,
  disconnectAllRedis,
  createStandaloneRedisClient,
} from '../../core/redis.js';

export {
  redisClient as redis,        // app-level (cache, rate-limit)
  redisPool,
  isLocal as isRedisMock,      // true khi không có REDIS_URL (local/dev)
  initRedis,
  initBullRedis,               // ← GỌI TRONG BOOTSTRAP TRƯỚC KHI DÙNG QUEUE
  disconnectAllRedis,
  getBullRedis,                // ← DÙNG CHO BULLMQ CONNECTION
  createStandaloneRedisClient,
};
