/**
 * redis.ts — Production-safe Redis client pool
 *
 * FIX BullMQ "client[commandNameWithVersion] is not a function":
 *   BullMQ gọi client['lmpop2'], client['xautoclaim2']... theo dynamic key.
 *   Proxy wrapper không forward các key này đúng cách.
 *   → getBullRedis() trả về raw ioredis instance (KHÔNG qua Proxy).
 */

import { Redis, type RedisOptions } from 'ioredis';
import { logger } from './logger/index.js';

// ─── Detect environment ───────────────────────────────────────

const rawUrl = process.env.REDIS_URL;

export const isLocal =
  !rawUrl ||
  rawUrl === 'undefined' ||
  rawUrl === 'null' ||
  rawUrl.includes('localhost') ||
  rawUrl.includes('127.0.0.1');

function parseRedisUrl(url: string): RedisOptions {
  try {
    const parsed = new URL(url);
    const isTls = url.startsWith('rediss://');
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.replace('/', ''), 10) || 0 : 0,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    };
  } catch (e) {
    logger.error({ url, e }, 'Failed to parse REDIS_URL — falling back to localhost');
    return { host: 'localhost', port: 6379 };
  }
}

// ─── Parse URL or Sentinel nodes ─────────────────────────────

function getRedisOptions(index: number): RedisOptions {
  const sentinelNodes = process.env.REDIS_SENTINEL_NODES;
  const sentinelName = process.env.REDIS_SENTINEL_NAME || 'mymaster';
  const sentinelPassword = process.env.REDIS_SENTINEL_PASSWORD;

  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(Math.pow(2, times) * 50, 10_000);
      const jitter = Math.random() * 200;
      if (times > 3) {
        logger.error(
          { attempt: times, index },
          `Redis Client ${index}: connection failing`,
        );
      }
      return delay + jitter;
    },
    reconnectOnError: (err: Error) => {
      const targetError = err.message.toLowerCase();
      return targetError.includes('readonly') || targetError.includes('loading');
    },
  };

  if (sentinelNodes) {
    const parsedFallback = parseRedisUrl(rawUrl || '');
    logger.info({ sentinelNodes, sentinelName, index }, `Redis Client ${index}: Configuring Sentinel mode`);
    return {
      ...baseOptions,
      sentinels: sentinelNodes.split(',').map(node => {
        const [host, port] = node.trim().split(':');
        return { host: host!, port: port ? parseInt(port, 10) : 26379 };
      }),
      name: sentinelName,
      sentinelPassword: sentinelPassword || parsedFallback.password,
      password: process.env.REDIS_PASSWORD || parsedFallback.password, // Client password for the master
      tls: parsedFallback.tls,
      sentinelTLS: parsedFallback.tls,
    };
  }

  // Fallback to REDIS_URL
  const urlOptions = isLocal ? { host: 'localhost', port: 6379 } : parseRedisUrl(rawUrl!);
  return {
    ...baseOptions,
    ...urlOptions,
    password: urlOptions.password || process.env.REDIS_PASSWORD,
  };
}

// ─── Shared mock data store ───────────────────────────────────

const mockSharedData: Record<string, any> = {};

async function createClient(index: number): Promise<Redis> {
  if (isLocal) {
    const { default: RedisMock } = await import('ioredis-mock');
    logger.info(`Redis Client ${index}: using ioredis-mock (LOCAL/DEV)`);
    return new (RedisMock as any)({ data: mockSharedData }) as unknown as Redis;
  }

  const options = getRedisOptions(index);
  const client = new Redis(options);

  client.on('error', (err: Error & { code?: string }) => {
    logger.error({ err, code: err.code, index }, `Redis Client ${index}: error`);
  });

  client.on('connect', () => {
    logger.info(`Redis Client ${index}: connected`);
  });

  client.on('ready', () => {
    logger.info(`Redis Client ${index}: ready and accepting commands`);
  });

  // SEC-NEW-11: Track Sentinel failover events
  client.on('select', (dbIndex) => {
    logger.debug({ index, dbIndex }, 'Redis DB selected');
  });

  client.on('reconnecting', (info: { delay: number; attempt: number }) => {
    logger.warn({ index, delay: info.delay, attempt: info.attempt }, 'Redis Client: Reconnecting...');
  });

  // If using sentinel, wait for master change events
  if (!isLocal && process.env.REDIS_SENTINEL_NODES) {
    client.on('sentinel-master-changed', (master) => {
      logger.info({ index, master }, '🚀 Redis Sentinel: Master changed, client auto-switched');
    });
  }

  return client;
}

// ─── Pool (app-level: cache, rate-limit) ─────────────────────

class RedisConnectionPool {
  private pool: Redis[] = [];
  private readonly minSize: number;
  private readonly maxSize: number;
  private currentIndex = 0;
  private initialized = false;
  private isScaling = false;
  private shrinkInterval: NodeJS.Timeout | null = null;

  constructor(min: number, max: number) {
    this.minSize = min;
    this.maxSize = max;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    // Khởi tạo pool với số lượng tối thiểu
    this.pool = await Promise.all(
      Array.from({ length: this.minSize }, (_, i) => createClient(i)),
    );
    this.initialized = true;
    logger.info({ minSize: this.minSize, maxSize: this.maxSize, isLocal }, 'Redis app pool initialized');

    // Auto-scaling down: Kiểm tra mỗi phút xem có thể thu gọn pool không
    this.shrinkInterval = setInterval(() => this.checkAndShrink(), 60_000);
  }

  getClient(): Redis {
    if (!this.initialized || this.pool.length === 0) {
      throw new Error('Redis pool not initialized. Call initRedis() first.');
    }

    // Auto-scaling up: Mở rộng nhanh khi có dấu hiệu quá tải
    if (this.pool.length < this.maxSize && !this.isScaling) {
      const avgPending = this.pool.reduce((acc, c) => acc + ((c as any).commandQueue?.length || 0), 0) / this.pool.length;
      if (avgPending > 5) {
        this.isScaling = true;
        this.scaleUp(Math.min(this.maxSize - this.pool.length, 2)).finally(() => {
          this.isScaling = false;
        });
      }
    }

    const client = this.pool[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % this.pool.length;
    return client;
  }

  async scaleUp(extra: number): Promise<void> {
    if (this.pool.length + extra > this.maxSize) return;
    const newClients = await Promise.all(
      Array.from({ length: extra }, (_, i) => createClient(this.pool.length + i)),
    );
    this.pool.push(...newClients);
    logger.info({ newSize: this.pool.length }, 'Redis pool scaled up');
  }

  private checkAndShrink() {
    if (this.pool.length > this.minSize && !this.isScaling) {
      const avgPending = this.pool.reduce((acc, c) => acc + ((c as any).commandQueue?.length || 0), 0) / this.pool.length;
      // Thu gọn nếu traffic rất thấp (trung bình dưới 1 command chờ)
      if (avgPending < 1) {
        const clientToRemove = this.pool.pop();
        if (clientToRemove) {
          logger.info({ newSize: this.pool.length }, 'Redis pool scaled down');
          clientToRemove.quit().catch(() => {});
        }
      }
    }
  }

  async disconnectAll(): Promise<void> {
    this.initialized = false;
    if (this.shrinkInterval) clearInterval(this.shrinkInterval);
    await Promise.all(this.pool.map(client => client.quit().catch(() => {})));
    this.pool = [];
    logger.info('Redis connection pool disconnected');
  }
}

const REDIS_POOL_MAX = Number(process.env.REDIS_POOL_MAX) || 5;
const REDIS_POOL_MIN = Number(process.env.REDIS_POOL_MIN) || 1;

export const redisPool = new RedisConnectionPool(REDIS_POOL_MIN, REDIS_POOL_MAX);

/**
 * Retrieves Redis system info (memory) and pool status.
 */
export async function getRedisInfo() {
  const client = redisPool.getClient();
  let usedMemoryMB = 0;

  try {
    if (!isLocal) {
      const info = await client.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      if (match && match[1]) {
        usedMemoryMB = Math.round(parseInt(match[1], 10) / 1024 / 1024);
      }
    }
  } catch (err) {
    logger.debug({ err }, 'Failed to get redis memory info');
  }

  return {
    usedMemoryMB,
    isLocal,
    // Note: this only returns the current app pool size
    poolSize: (redisPool as any).pool?.length || 0,
    initialized: (redisPool as any).initialized
  };
}

// ─── Pub/Sub pool (dedicated) ─────────────────────────────────

class RedisPubSubPool {
  private pub: Redis | null = null;
  private sub: Redis | null = null;

  async init(): Promise<void> {
    if (!this.pub) {
      this.pub = await createClient(1001);
      logger.info('RedisPubSubPool: Pub client initialized');
    }
    if (!this.sub) {
      this.sub = await createClient(1002);
      logger.info('RedisPubSubPool: Sub client initialized');
    }
  }

  getPub(): Redis {
    if (!this.pub) throw new Error('RedisPubSubPool Pub not initialized');
    return this.pub;
  }

  getSub(): Redis {
    if (!this.sub) throw new Error('RedisPubSubPool Sub not initialized');
    return this.sub;
  }

  async disconnectAll(): Promise<void> {
    const clients = [this.pub, this.sub].filter(Boolean);
    await Promise.all(clients.map(c => c!.quit().catch(() => {})));
    this.pub = null;
    this.sub = null;
    logger.info('RedisPubSubPool disconnected');
  }
}

export const redisPubSub = new RedisPubSubPool();

// ─── BullMQ dedicated pool (raw, KHÔNG qua Proxy) ──────────

class BullRedisPool {
  private pool: Redis[] = [];
  private readonly size: number;
  private currentIndex = 0;
  private initialized = false;

  constructor(size: number) {
    this.size = size;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.pool = await Promise.all(
      Array.from({ length: this.size }, (_, i) => createClient(i + 2000)),
    );
    this.initialized = true;
    logger.info({ size: this.size }, '✅ BullMQ Redis Pool initialized');
  }

  getClient(): Redis {
    if (!this.initialized || this.pool.length === 0) {
      throw new Error('BullMQ Redis pool not initialized.');
    }
    const client = this.pool[this.currentIndex]!;
    this.currentIndex = (this.currentIndex + 1) % this.size;
    return client;
  }

  async disconnectAll(): Promise<void> {
    this.initialized = false;
    await Promise.all(this.pool.map(c => c.quit().catch(() => {})));
    this.pool = [];
    logger.info('BullRedisPool disconnected');
  }
}

const BULL_POOL_SIZE = Number(process.env.REDIS_BULL_POOL_SIZE) || 2;
const bullPool = new BullRedisPool(BULL_POOL_SIZE);

export async function initBullRedis(): Promise<void> {
  await bullPool.init();
}

export function getBullRedis(): Redis {
  return bullPool.getClient();
}

// ─── App-level Proxy (dùng cho cache, rate-limit, KHÔNG dùng cho BullMQ) ─

// FIX strict TS: dùng unknown → any chain để tránh lỗi index signature
export const redisClient = new Proxy({} as Redis, {
    get: (_target, prop: string | symbol): any => {
    const client = redisPool.getClient();
        const val = (client as any)[prop];

    if (typeof val === 'function') {
            return (val as any).bind(client);
    }

    // Hỗ trợ .call() dùng bởi rate-limit-redis
    if (prop === 'call') {
      return (command: string, ...args: unknown[]): Promise<unknown> => {
        const cmd = command.toLowerCase();
                const fn = (client as any)[cmd];
        if (typeof fn === 'function') {
                    return (fn as any).apply(client, args) as Promise<unknown>;
        }
        logger.warn({ command: cmd }, 'Redis command not found in client');
        return Promise.reject(new Error(`Redis command "${cmd}" not supported`));
      };
    }

    return val;
  },
});

// ─── Standalone factory ───────────────────────────────────────

export async function createStandaloneRedisClient(): Promise<Redis> {
  return createClient(-1);
}

// ─── Main init & cleanup ──────────────────────────────────────

export async function initRedis(): Promise<void> {
  await redisPool.init();
  await redisPubSub.init();
}

export async function disconnectAllRedis(): Promise<void> {
  await Promise.all([
    redisPool.disconnectAll(),
    redisPubSub.disconnectAll(),
    bullPool.disconnectAll(),
  ]);
  logger.info('All Redis connections gracefully closed');
}
