import { AuthProvider, AuthUser } from './auth.provider.interface.js';
import jwt from 'jsonwebtoken';
import { redisClient } from '../redis.js';
import { db } from '../db/prisma.js';
import { logger } from '../logger/index.js';
import { JWT_SECRET } from './secrets.js';
import { UserRole } from '../architecture/types.js';

const SYSTEM_TENANT_IDS = new Set(['SYSTEM', 'PLATFORM', 'tenant_system']);

type TokenVersionRecord = {
  tokenVersion: number;
};

function isAuthUserClaims(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const claims = value as Partial<AuthUser>;
  return typeof claims.id === 'string'
    && typeof claims.username === 'string'
    && typeof claims.role === 'string'
    && Object.values(UserRole).includes(claims.role as UserRole)
    && typeof claims.tenantId === 'string'
    && typeof claims.name === 'string'
    && typeof claims.tokenVersion === 'number'
    && Array.isArray(claims.permissions);
}

async function findTokenVersionRecord(decoded: AuthUser): Promise<TokenVersionRecord | null> {
  const isSystemLevel = !decoded.tenantId ||
    SYSTEM_TENANT_IDS.has(decoded.tenantId) ||
    decoded.role === UserRole.SUPER_ADMIN;

  if (isSystemLevel) {
    return await db.withTenant('SYSTEM', async (tx) => {
      return await tx.staff.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true },
      });
    });
  }

  return await db.withTenant(decoded.tenantId, async (tx) => {
    return await tx.staff.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true }
    });
  });
}

export class JwtAuthProvider implements AuthProvider {
  private secret: string = JWT_SECRET;

  constructor() {}

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const rawDecoded = jwt.verify(token, this.secret);
      if (!isAuthUserClaims(rawDecoded)) {
        logger.warn('SECURITY_ALERT: Invalid JWT claims shape detected');
        return null;
      }
      const decoded = rawDecoded;
      
      // OPTIMIZATION: Check token version for instant revocation
      const cacheKey = `user_token_version:${decoded.id}`;
      let currentVersion = await redisClient.get(cacheKey);

      if (currentVersion === null) {
        // Fallback to DB if not in cache.
        //
        // FIX [BUG-2]: db.forTenant(tenantId) KHÔNG set `app.current_tenant_id` trong PostgreSQL
        // session → RLS policy (tenant_id = current_setting(...)) bị block → staff not found
        // → verifyToken trả null → mọi request sau login của super-admin đều fail 401.
        //
        // Giải pháp: phân biệt 3 trường hợp:
        //   (a) super-admin / system tenant → db.withTenant('SYSTEM') — set RLS session var + AsyncLocalStorage bypass tự động
        //   (b) tenant user bình thường      → db.withTenant(tenantId) — set RLS session var đúng
        //   (c) không có tenantId            → db.system() — Prisma-level guard, không set RLS
        //
        // db.forTenant() chỉ inject `where.tenantId` ở Prisma layer nhưng KHÔNG set PostgreSQL
        // session variable → không đủ để pass RLS.

        let staff: TokenVersionRecord | null = null;

        try {
          staff = await findTokenVersionRecord(decoded);
        } catch (dbErr: unknown) {
          logger.warn({ err: dbErr instanceof Error ? dbErr.message : dbErr, userId: decoded.id }, '[verifyToken] DB lookup failed, denying token');
          return null;
        }
        
        if (!staff) {
          logger.warn({ userId: decoded.id, tenantId: decoded.tenantId }, '[verifyToken] Staff record not found');
          return null;
        }

        currentVersion = staff.tokenVersion.toString();
        // Cache for 5 minutes to reduce DB load while keeping revocation latency low
        await redisClient.setex(cacheKey, 300, String(currentVersion ?? '0'));
      }

      if (currentVersion === null || decoded.tokenVersion !== parseInt(currentVersion)) {
        logger.warn({ userId: decoded.id, tokenVersion: decoded.tokenVersion, currentVersion }, 'SECURITY_ALERT: Revoked token attempt detected');
        return null;
      }

      return decoded;
    } catch (e) {
      return null;
    }
  }

  async createToken(user: AuthUser, expiresIn: string = '15m'): Promise<string> {
    return jwt.sign(user, this.secret, { expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` });
  }
}
