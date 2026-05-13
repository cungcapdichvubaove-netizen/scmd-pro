import { logger } from '../../logger/index.js';
import { redisClient } from '../../redis.js';
import { CacheManager } from '../../cache/manager.js';
import { AuthService } from '../../../modules/auth/auth.service.js';
import { ROLE_PERMISSIONS } from '../../auth/permissions.js';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  async execute(input: RefreshTokenInput): Promise<RefreshTokenResponse> {
    const { refreshToken: oldRefreshToken } = input;

    const luaScript = `
      local payload = redis.call('GET', KEYS[1])
      if payload then
        redis.call('DEL', KEYS[1])
        return payload
      else
        return nil
      end
    `;

    const payloadRaw = await redisClient.eval(luaScript, 1, `refresh_token:${oldRefreshToken}`) as string | null;
    
    if (!payloadRaw) {
      logger.warn({ oldRefreshToken }, 'SECURITY ALERT: Refresh token reuse or invalid token detected');
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const claims = JSON.parse(payloadRaw);
    
    // PERF: Try to resolve from cache first to avoid DB round-trips
    // [HARDENING v4.33.2]: Always use CacheManager to ensure L1/L2 sync
    let authMetadata = await CacheManager.get<any>(`auth_metadata:${claims.id}`);
    let latestUser: any = null;

    if (authMetadata) {
      if (authMetadata.tokenVersion === claims.tokenVersion && 
          authMetadata.status === 'active' && 
          authMetadata.tenantStatus === 'active') {
        latestUser = {
          id: claims.id,
          tokenVersion: authMetadata.tokenVersion,
          status: authMetadata.status,
          role: authMetadata.role,
          tenantId: claims.tenantId,
          fullName: claims.name
        };
      }
    }

    if (!latestUser) {
      const { db } = await import('../../db/prisma.js');
      // [SECURITY] Use tenant scope if available to enforce RLS
      const dbInstance = claims.tenantId ? db.forTenant(claims.tenantId) : db.system();
      
      const dbUser = await dbInstance.staff.findUnique({
        where: { id: claims.id },
        include: { 
          tenant: { 
            select: { status: true } 
          } 
        }
      });

      if (dbUser) {
        latestUser = dbUser;
        await CacheManager.set(`auth_metadata:${claims.id}`, {
          tokenVersion: dbUser.tokenVersion,
          status: dbUser.status,
          role: dbUser.role,
          tenantStatus: dbUser.tenant?.status || 'inactive'
        }, 3600);
      }
    }

    if (!latestUser || latestUser.tokenVersion !== claims.tokenVersion || latestUser.status !== 'active' || (latestUser.tenant?.status || authMetadata?.tenantStatus) !== 'active') {
      logger.warn({ userId: claims.id, reason: 'Revoked, Inactive or Tenant suspended' }, 'SECURITY ALERT: Refresh attempt on invalid session');
      throw new Error('SESSION_EXPIRED');
    }

    // Role check to prevent privilege escalation
    const permissions = ROLE_PERMISSIONS[latestUser.role as keyof typeof ROLE_PERMISSIONS] || [];
    const { token, refreshToken: newRefreshToken, payload: newPayload } = AuthService.generateAuthPayload(
      { ...latestUser, fullName: latestUser.fullName ?? claims.name },
      permissions
    );
    
    await redisClient.setex(`refresh_token:${newRefreshToken}`, 7 * 24 * 60 * 60, JSON.stringify(newPayload));

    return { token, refreshToken: newRefreshToken };
  }
}
