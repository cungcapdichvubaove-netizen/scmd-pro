import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { SendCommandFn } from 'rate-limit-redis';
import { redisClient } from '../redis.js';
import { logger } from '../logger/index.js';

function isMockRedis(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    (redisClient as any)?.constructor?.name?.includes('RedisMock')
  );
}

function makeStore(prefix: string) {
  if (isMockRedis()) {
    logger.warn({ prefix }, 'RateLimit using MemoryStore (DEV fallback)');
    return new MemoryStore();
  }

  const sendCommand: SendCommandFn = async (...args: string[]) => {
    const [command, ...cmdArgs] = args;
    if (!command) throw new Error('RateLimit: Redis command is undefined');
    try {
      return await (redisClient as any)[command.toLowerCase()](...cmdArgs);
    } catch (err) {
      logger.warn({ command, err }, 'RateLimit Redis command failed');
      throw err;
    }
  };

  return new RedisStore({ prefix, sendCommand });
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:api:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều request. Vui lòng thử lại sau.',
      retryAfter: 15 * 60,
    });
  },
  skip: (req) => req.path === '/api/health' || req.path === '/api/v1/health',
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:auth:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'AUTH_RATE_LIMITED',
      message: 'Quá nhiều lần đăng nhập thất bại.',
      retryAfter: 15 * 60,
    });
  },
});

// FIX [SECURITY]: Rate limiter riêng cho trial registration.
// authRateLimiter (20 req/15 phút/IP) quá lỏng — kẻ tấn công có thể tạo
// hàng loạt Tenant ảo với proxy pool. Dùng window dài hơn và ngưỡng thấp hơn.
export const trialRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,                    // Tối đa 5 lần đăng ký thử/IP/giờ
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:trial:'),
  message: {
    error: 'TRIAL_REGISTER_RATE_LIMITED',
    message: 'Quá nhiều yêu cầu đăng ký dùng thử. Vui lòng thử lại sau 1 giờ.',
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TRIAL_REGISTER_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu đăng ký dùng thử. Vui lòng thử lại sau 1 giờ.',
      retryAfter: 60 * 60,
    });
  },
});

export const publicContactLeadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:contact_lead:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'CONTACT_LEAD_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu liên hệ. Vui lòng thử lại sau 1 giờ.',
      retryAfter: 60 * 60,
    });
  },
});

export const sosRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:sos:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'SOS_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu khẩn cấp.',
    });
  },
});

export const pdfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:pdf:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'PDF_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu tạo PDF. Vui lòng thử lại sau.',
    });
  },
});

export const sysManageGlobalAuditLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30, // 30 req / min
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:audit:'),
  handler: (_req, res) => {
    res.status(429).json({
      error: 'GLOBAL_AUDIT_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu đọc Global Audit Logs. Vui lòng thử lại sau 1 phút.',
    });
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:ai:'),
  keyGenerator: (req: any) => req.subdomain || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'AI_RATE_LIMITED',
      message: 'Quá nhiều yêu cầu phân tích AI. Vui lòng thử lại sau 1 phút.',
    });
  },
});

export const aiQuotaTracking = async (req: any, res: any, next: any) => {
  try {
    const tenantId = req.subdomain;
    if (!tenantId || req.path === '/ai/suggest-subdomain') return next();

    const d = new Date();
    const monthKey = `${d.getFullYear()}_${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const quotaKey = `ai_usage_${tenantId}_${monthKey}`;
    
    const { db } = await import('../db/prisma.js');
    
    // Default limit
    const MAX_QUOTA = 1000;

    // [FIX M-01]: Dùng INSERT ... ON CONFLICT ... RETURNING để atomic increment + read trong 1 query.
    // Trước đây: $executeRaw (tăng) rồi findUnique (đọc) là 2 ops tách biệt → race condition:
    // burst request có thể vượt quota 1000 lượt vì mỗi request đọc giá trị cũ trước khi commit.
    // RETURNING trả về giá trị SAU khi update → check tức thì, không có race window.
    const rows = await db.system().$queryRaw<{ usage: number }[]>`
      INSERT INTO system_configs (id, key, value, updated_at) 
      VALUES (${quotaKey}, ${quotaKey}, ${JSON.stringify({ usage: 1 })}::jsonb, now())
      ON CONFLICT (key) DO UPDATE 
      SET value = jsonb_set(
        system_configs.value, 
        '{usage}', 
        ((COALESCE((system_configs.value->>'usage')::int, 0) + 1)::text)::jsonb
      ),
      updated_at = now()
      RETURNING (value->>'usage')::int AS usage
    `;

    const used = rows[0]?.usage ?? 1;
    if (used > MAX_QUOTA) {
      return res.status(429).json({
        error: 'AI_QUOTA_EXCEEDED',
        message: `Đã vượt quá giới hạn phân tích AI (${MAX_QUOTA} lượt/tháng). Vui lòng nâng cấp gói hoặc liên hệ hỗ trợ.`,
      });
    }

    next();
  } catch (error) {
    logger.warn({ error }, 'AI quota check failed, allowing request');
    next();
  }
};

