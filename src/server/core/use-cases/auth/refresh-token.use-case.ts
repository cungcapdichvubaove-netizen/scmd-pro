import { logger } from '../../logger/index.js';
import { redisClient } from '../../redis.js';
import { CacheManager } from '../../cache/manager.js';
import { AuthService, type AuthPayload, type AuthTokenSource } from '../../../modules/auth/auth.service.js';
import { ROLE_PERMISSIONS } from '../../auth/permissions.js';
import { UserRole } from '../../architecture/types.js';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

interface RefreshTokenClaims extends AuthPayload {}

interface AuthMetadataCache {
  tokenVersion: number;
  status: string;
  role: UserRole;
  tenantStatus: string;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
}

interface RefreshableUser extends AuthTokenSource {
  status: string;
  tenant?: {
    status: string;
  } | null;
}

interface RefreshableUserRecord extends RefreshableUser {
  username: string;
}

async function findRefreshableUser(claims: RefreshTokenClaims): Promise<RefreshableUserRecord | null> {
  const { db } = await import('../../db/prisma.js');

  const SYSTEM_TENANT_IDS = new Set(['SYSTEM', 'PLATFORM', 'tenant_system']);
  const isSystemLevel = !claims.tenantId ||
    SYSTEM_TENANT_IDS.has(claims.tenantId) ||
    claims.role === UserRole.SUPER_ADMIN;

  if (isSystemLevel) {
    return await db.withTenant('SYSTEM', async (tx) => {
      return await tx.staff.findFirst({
        where: { id: claims.id },
        select: {
          id: true,
          username: true,
          role: true,
          tenantId: true,
          tokenVersion: true,
          fullName: true,
          status: true,
          assignedVendorId: true,
          assignedSiteId: true,
          assignedContractId: true,
          tenant: {
            select: { status: true }
          }
        }
      });
    });
  }

  return await db.withTenant(claims.tenantId, async (tx) => {
    return await tx.staff.findFirst({
      where: { id: claims.id },
      select: {
        id: true,
        username: true,
        role: true,
        tenantId: true,
        tokenVersion: true,
        fullName: true,
        status: true,
        assignedVendorId: true,
        assignedSiteId: true,
        assignedContractId: true,
        tenant: {
          select: { status: true }
        }
      }
    });
  });
}

function isRefreshTokenClaims(value: unknown): value is RefreshTokenClaims {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const claims = value as Partial<RefreshTokenClaims>;

  return typeof claims.id === 'string'
    && typeof claims.username === 'string'
    && typeof claims.role === 'string'
    && Object.values(UserRole).includes(claims.role as UserRole)
    && typeof claims.tenantId === 'string'
    && typeof claims.tokenVersion === 'number'
    && typeof claims.name === 'string'
    && Array.isArray(claims.permissions);
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

    const parsedClaims: unknown = JSON.parse(payloadRaw);
    if (!isRefreshTokenClaims(parsedClaims)) {
      logger.warn({ payloadRaw }, 'SECURITY ALERT: Invalid refresh token claims payload detected');
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const claims = parsedClaims;
    const latestTokenVersion = await redisClient.get(`user_token_version:${claims.id}`);
    if (latestTokenVersion && Number(latestTokenVersion) !== claims.tokenVersion) {
      await CacheManager.del(`auth_metadata:${claims.id}`);
      logger.warn({ userId: claims.id }, 'SECURITY ALERT: Refresh attempt with revoked token version');
      throw new Error('SESSION_EXPIRED');
    }
    
    // PERF: Try to resolve from cache first to avoid DB round-trips
    // [HARDENING v4.33.2]: Always use CacheManager to ensure L1/L2 sync
    let authMetadata = await CacheManager.get<AuthMetadataCache>(`auth_metadata:${claims.id}`);
    let latestUser: RefreshableUser | null = null;

    if (authMetadata) {
      if (authMetadata.tokenVersion === claims.tokenVersion && 
          authMetadata.status === 'active' && 
          authMetadata.tenantStatus === 'active') {
        latestUser = {
          id: claims.id,
          username: claims.username,
          tokenVersion: authMetadata.tokenVersion,
          status: authMetadata.status,
          role: authMetadata.role,
          tenantId: claims.tenantId,
          fullName: claims.name,
          assignedVendorId: authMetadata.assignedVendorId ?? claims.assignedVendorId ?? null,
          assignedSiteId: authMetadata.assignedSiteId ?? claims.assignedSiteId ?? null,
          assignedContractId: authMetadata.assignedContractId ?? claims.assignedContractId ?? null,
        };
      }
    }

    if (!latestUser) {
      // FIX [RLS-REFRESH]: db.forTenant() chỉ inject tenantId ở Prisma layer nhưng KHÔNG set
      // PostgreSQL session variable `app.current_tenant_id` → RLS block khi cache miss.
      // Phân biệt 2 trường hợp:
      //   (a) super-admin / system tenant → db.withTenant('SYSTEM') — set RLS session var + AsyncLocalStorage bypass tự động
      //   (b) tenant user bình thường     → db.withTenant(tenantId) — set RLS session var đúng
      const dbUser = await findRefreshableUser(claims);

      if (dbUser) {
        latestUser = dbUser;
        authMetadata = {
          tokenVersion: dbUser.tokenVersion,
          status: dbUser.status,
          role: dbUser.role,
          tenantStatus: dbUser.tenant?.status || 'inactive',
          assignedVendorId: dbUser.assignedVendorId ?? null,
          assignedSiteId: dbUser.assignedSiteId ?? null,
          assignedContractId: dbUser.assignedContractId ?? null,
        };
        await CacheManager.set(`auth_metadata:${claims.id}`, authMetadata, 3600);
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
