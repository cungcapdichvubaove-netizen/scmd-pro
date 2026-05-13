import { AuthProvider, AuthUser } from './auth.provider.interface.js';
import jwt from 'jsonwebtoken';
import { redisClient } from '../redis.js';
import { db } from '../db/prisma.js';
import { logger } from '../logger/index.js';
import { JWT_SECRET } from './secrets.js';

export class JwtAuthProvider implements AuthProvider {
  private secret: string = JWT_SECRET;

  constructor() {}

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, this.secret) as AuthUser;
      
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
        //   (a) super-admin / system tenant → dùng db.systemBypass() (bypass RLS hoàn toàn, có audit)
        //   (b) tenant user bình thường      → dùng db.withTenant() trong transaction (set RLS đúng)
        //   (c) không có tenantId            → dùng db.system() (Prisma-level guard, không set RLS)
        //
        // db.forTenant() chỉ inject `where.tenantId` ở Prisma layer nhưng KHÔNG set PostgreSQL
        // session variable → không đủ để pass RLS. Đây là bug kiến trúc cần fix triệt để.

        const SYSTEM_TENANT_IDS = new Set(['SYSTEM', 'PLATFORM', 'tenant_system']);
        const isSystemLevel = !decoded.tenantId ||
          SYSTEM_TENANT_IDS.has(decoded.tenantId) ||
          decoded.role === 'super-admin';

        let staff: { tokenVersion: number } | null = null;

        try {
          if (isSystemLevel) {
            // System/super-admin: bypass RLS, truy vấn trực tiếp cross-tenant
            staff = await db.systemBypass().staff.findUnique({
              where: { id: decoded.id },
              select: { tokenVersion: true }
            });
          } else {
            // Tenant user: cần set RLS context đúng qua withTenant transaction
            await db.withTenant(decoded.tenantId, async (tx) => {
              staff = await tx.staff.findUnique({
                where: { id: decoded.id },
                select: { tokenVersion: true }
              });
            });
          }
        } catch (dbErr) {
          logger.warn({ err: (dbErr as any)?.message, userId: decoded.id }, '[verifyToken] DB lookup failed, denying token');
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

  async createToken(user: AuthUser, expiresIn: string = '1h'): Promise<string> {
    return jwt.sign(user, this.secret, { expiresIn: expiresIn as any });
  }
}
