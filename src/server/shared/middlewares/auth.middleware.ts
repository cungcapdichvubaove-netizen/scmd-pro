import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthProviderFactory } from '../../core/auth/auth.provider.factory.js';
import { UserRole } from '../../core/architecture/types.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { logger } from '../../core/logger/index.js';
import { db } from '../../core/db/prisma.js';
import { CacheManager } from '../../core/cache/manager.js';
import { JWT_SECRET } from '../../core/auth/secrets.js';
import { cache } from '../../core/cache/index.js';
import { redis } from '../../infra/redis/client.js';
import {
  normalizeFeatureFlagOverrides,
  resolveTenantFeatureFlags,
  validateFeatureDependencies,
} from '../../../shared/business/feature-flags.js';
import type { FeatureFlagKey } from '../../../shared/business/feature-flags.js';
import { AUTH_CSRF_COOKIE, AUTH_CSRF_HEADER, getAccessTokenCookie, getAuthCookies } from '../../modules/auth/auth.cookies.js';

const AI_CONTRACT_SCAN_UNAVAILABLE_MESSAGE = 'AI Contract Scan chưa khả dụng cho đến khi Contract Rule Engine hoàn tất.';

function isContractRuleEngineReadyForAiScan() {
  // Giai đoạn 5 chỉ dựng khung. Chỉ được mở AI scan khi đã có đầy đủ đích lưu dữ liệu
  // cho ContractVersion, ContractLineItem, ContractPenaltyRule,
  // ContractStaffStandard, ContractShiftRequirement và ContractChecklistRequirement.
  // Hiện tại Contract Rule Engine chưa hoàn tất nên bắt buộc chặn cứng ở backend,
  // kể cả khi feature flag `ai_contract_scan` bị bật ngoài ý muốn.
  return false;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    role: string;
    tenantId: string;
    assignedVendorId?: string | null;
    assignedSiteId?: string | null;
    assignedContractId?: string | null;
  };
  tenantFeatures?: Record<string, boolean>;
  tenantId: string;
  clientContext: {
    ip: string;
    userAgent: string;
  };
}

async function loadTenantFeatureContext(req: any): Promise<{
  resolved: Record<string, boolean>;
  rawOverrides: Record<string, boolean>;
}> {
  if (req.user?.role === UserRole.SUPER_ADMIN || req.user?.tenantId === 'SYSTEM' || req.user?.tenantId === 'PLATFORM') {
    return { resolved: {}, rawOverrides: {} };
  }

  if (req.tenantFeatures) {
    return {
      resolved: req.tenantFeatures,
      rawOverrides: req.tenantFeatureOverrides ?? {},
    };
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return { resolved: {}, rawOverrides: {} };
  }

  const cacheKey = `tenant:features:${tenantId}`;
  const cached = await cache.get<{ resolved: Record<string, boolean>; rawOverrides: Record<string, boolean> }>(cacheKey);
  if (cached) {
    req.tenantFeatures = cached.resolved;
    req.tenantFeatureOverrides = cached.rawOverrides;
    return cached;
  }

  let tenant: any = null;
  await db.withTenant('SYSTEM', async (tx) => {
    tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionPlan: true,
        plan: true,
        featuresEnabled: true,
      }
    });
  });

  const rawOverrides = normalizeFeatureFlagOverrides(tenant?.featuresEnabled);
  const resolved = resolveTenantFeatureFlags(
    tenant?.subscriptionPlan ?? tenant?.plan ?? null,
    tenant?.featuresEnabled,
  );
  const featureContext = { resolved, rawOverrides };
  await cache.set(cacheKey, featureContext, 60);
  req.tenantFeatures = resolved;
  req.tenantFeatureOverrides = rawOverrides;
  return featureContext;
}

/**
 * IN-PROCESS REQUEST COALESCING (SINGLE-FLIGHT) - DEPRECATED IN FAVOR OF DISTRIBUTED WRAP
 * 
 * Sửa lỗi [H-06]: Chuyển từ local Map sang CacheManager.wrap để bảo vệ hệ thống 
 * khỏi Thundering Herd trên toàn bộ các replicas (Multi-process safety).
 */

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const printToken = req.query.printToken as string;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  req.clientContext = { ip: clientIp, userAgent };

  // Support for short-lived Print Tokens (bypass normal auth header)
  if (!authHeader && printToken) {
    try {
      const isBlacklisted = await cache.get(`print_token_blacklist:${printToken}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Mã truy cập bản in đã bị thu hồi' });
      }

      const decoded = jwt.verify(printToken, JWT_SECRET) as any;
      
      // [FIX H-02]: Với nhánh watcher, phải verify decoded.tenantId khớp với tenant của request
      // để ngăn một watcher token của tenant A fetch incident của tenant B.
      // req.tenantId chưa được set tại đây → dùng subdomain/header như chuẩn SEC-06 của codebase.
      const requestTenantId = (req as any).subdomain || req.headers['x-tenant-id'];
      const tenantMatchesRequest = !requestTenantId || decoded.tenantId === requestTenantId;
      const isIncidentPrintToken = Boolean(decoded.incidentId) &&
        decoded.incidentId === req.params.id &&
        tenantMatchesRequest;
      const isWatcherPrintToken = decoded.type === 'watcher' &&
        tenantMatchesRequest &&
        typeof req.path === 'string' &&
        req.path.startsWith('/tenant/monitor/');
      if (decoded && decoded.purpose === 'print' && (isIncidentPrintToken || isWatcherPrintToken)) {
        req.user = {
          id: 'pdf-worker',
          username: 'pdf-worker',
          role: 'PDF_WORKER',
          permissions: decoded.permissions || ['staff:read', 'log:read'],
          tenantId: decoded.tenantId
        };
        req.tenantId = decoded.tenantId;
        return next();
      }
    } catch (err) {
      logger.warn({ err, printToken }, 'Invalid print token attempt');
    }
  }

  const cookies = getAuthCookies(req);
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = getAccessTokenCookie(cookies);
  const token = bearerToken || cookieToken;
  const isCookieAuth = Boolean(!bearerToken && cookieToken);

  if (!token) {
    return res.status(401).json({ error: 'Không được phép truy cập: bắt buộc cung cấp mã xác thực' });
  }

  if (isCookieAuth && !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
    const csrfCookie = cookies[AUTH_CSRF_COOKIE];
    const csrfHeader = req.headers[AUTH_CSRF_HEADER] as string | undefined;
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logger.warn({ ip: clientIp, method: req.method, path: req.originalUrl }, 'CSRF Protection: missing or mismatched double-submit token.');
      return res.status(403).json({ error: 'Từ chối truy cập: CSRF token không hợp lệ.' });
    }
  }
  
  try {
    const authProvider = AuthProviderFactory.getProvider();
    const decoded = await authProvider.verifyToken(token) as any;

    if (!decoded || !decoded.id || !decoded.tenantId) {
      await AuditService.log({
        userId: 'anonymous',
        tenantId: 'system',
        action: 'ACCESS_DENIED',
        resource: req.originalUrl,
        ip: clientIp,
        userAgent,
        status: 'FAILURE',
        payload: { reason: 'Invalid or expired token' }
      });
      return res.status(401).json({ error: 'Không được phép truy cập: mã xác thực không hợp lệ hoặc đã hết hạn' });
    }

    // Check tenant status and token revocation
    if (decoded.tenantId && 
        decoded.tenantId !== 'SYSTEM' && 
        decoded.tenantId !== 'PLATFORM' && 
        decoded.role !== UserRole.SUPER_ADMIN) {
      const authMetadataKey = `auth_metadata:${decoded.id}`;
      
      // [FIX H-03]: Giảm TTL wrap xuống 15s cho critical auth path.
      // TTL 60s gây race window: sau khi revoke session (tokenVersion tăng),
      // CacheManager.wrap vẫn trả cached result cũ tối đa 60s → token revocation không tức thì.
      const result = await CacheManager.wrap(authMetadataKey, async () => {
        // RLS-FIX: bảng tenants và tenant_subscriptions require app.current_tenant_id='SYSTEM'
        // db.system() không set session variable này → dùng withTenant('SYSTEM')
        let tenant: any = null;
        await db.withTenant('SYSTEM', async (tx) => {
          tenant = await tx.tenant.findUnique({
            where: { id: decoded.tenantId },
            select: { id: true, status: true, plan: true }
          });
        });
        
        if (!tenant || tenant.status !== 'active') {
          return { error: 'Không gian làm việc đang bị tạm dừng hoặc không còn hiệu lực', status: 403 };
        }
        
        // Caching for subscription
        const subCacheKey = `sub:${tenant.id}`;
        let parsedSub: any = await cache.get(subCacheKey);
        
        if (!parsedSub) {
          let dbSub: any = null;
          await db.withTenant('SYSTEM', async (tx) => {
            dbSub = await tx.tenantSubscription.findUnique({
              where:  { tenantId: tenant.id },
              select: { plan: true, paidUsers: true, expiresAt: true, gracePeriodDays: true },
            });
          });
          parsedSub = dbSub || null;
          if (parsedSub) await cache.set(subCacheKey, parsedSub, 60);
        }
        
        const now           = new Date();
        const expiresAt     = parsedSub?.expiresAt ? new Date(parsedSub.expiresAt) : null;
        const graceDays     = parsedSub?.gracePeriodDays ?? 3;
        const graceEnd      = expiresAt ? new Date(expiresAt.getTime() + graceDays * 86_400_000) : null;
        const withinGrace   = graceEnd ? graceEnd > now : false;
        const isActive      = expiresAt ? expiresAt > now : false;

        const effectivePlan = (parsedSub?.plan !== 'FREE' && (isActive || withinGrace)) 
          ? parsedSub!.plan as any 
          : 'FREE';

        const user = await db.forTenant(decoded.tenantId).staff.findUnique({
          where: { id: decoded.id },
          select: { tokenVersion: true, status: true, role: true, tenantId: true }
        });
        
        if (user) {
          if (user.status !== 'active') {
             return { error: 'Tài khoản người dùng đang bị tạm dừng', status: 403 };
          }
          
          if (user.tenantId !== decoded.tenantId) {
             return { error: 'Ngữ cảnh không gian làm việc không hợp lệ với người dùng này', status: 403 };
          }
          
          return {
             tokenVersion: user.tokenVersion,
             status: user.status,
             role: user.role,
             tenantId: user.tenantId,
             tenantStatus: tenant.status,
             effectivePlan,
             isInGracePeriod: !isActive && withinGrace,
             paidUsers: parsedSub?.paidUsers ?? 0
          };
        }
        
        return { error: 'Không tìm thấy người dùng', status: 401 };
      // [FIX H-03]: TTL=15s thay vì 60s. Giảm race window sau khi revoke session:
      // revokeSessions → del(auth_metadata:{id}) → tối đa 15s cache cũ còn sống,
      // thay vì 60s như trước. Balance giữa DB load và security response time.
      }, 15);

      if (result && result.error) {
        return res.status(result.status as number).json({ error: result.error });
      }

      if (decoded.tokenVersion) {
        const latestTokenVersion = await redis.get(`user_token_version:${decoded.id}`);
        if (latestTokenVersion && Number(latestTokenVersion) !== decoded.tokenVersion) {
          await CacheManager.del(authMetadataKey);
          return res.status(401).json({ error: 'Mã xác thực đã bị thu hồi' });
        }
      }

      // Check token version after fetching/checking cache
      if (decoded.tokenVersion && result.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'Mã xác thực đã bị thu hồi' });
      }
      
      req.tenantContext = {
        id: result.tenantId,
        status: result.tenantStatus,
        effectivePlan: result.effectivePlan,
        isInGracePeriod: result.isInGracePeriod,
        paidUsers: result.paidUsers
      };
    }

      // --- SaaS Security Core: Tenant Cross-Access Guard ---
      // FIX 4.3: Strict Subdomain Verification
      // SEC-06 Fix: Always verify tenantId from token against context, ensuring isolation even if subdomain is missing
      if (decoded.role !== UserRole.SUPER_ADMIN) {
        const targetTenantId = req.subdomain || req.headers['x-tenant-id'];
        
        if (targetTenantId && targetTenantId !== decoded.tenantId && decoded.tenantId !== 'SYSTEM') {
          logger.warn({ 
            userId: decoded.id, 
            tokenTenant: decoded.tenantId, 
            requestTenant: targetTenantId 
          }, 'SECURITY ALERT: Tenant Mismatch (Cross-Tenant Access Attempt blocked)');
          
          return res.status(403).json({ 
            error: 'Từ chối truy cập: bạn không có quyền vào không gian làm việc này.',
            code: 'TENANT_MISMATCH'
          });
        }
      }

    req.user = decoded;
    req.tenantId = decoded.tenantId;

    return next();
  } catch (err: any) {
    logger.error({ err }, 'Auth Middleware internal error');
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ trong quá trình xác thực' });
  }
};

import { Permission, hasPermission } from '../../core/auth/permissions.js';

const FORBIDDEN_PERMISSIONS_BY_ROLE: Partial<Record<UserRole, Permission[]>> = {
  [UserRole.SUPERVISOR]: ['vendor:write', 'report:finalize', 'violation:resolve', 'system:manage', 'tenant:manage', 'billing:write'],
  [UserRole.VENDOR_COMMANDER]: ['vendor:write', 'report:finalize', 'violation:resolve', 'system:manage', 'tenant:manage', 'billing:read', 'billing:write'],
};

function isPermissionForbiddenForRole(role: UserRole | string, permission: Permission): boolean {
  const forbiddenPermissions = FORBIDDEN_PERMISSIONS_BY_ROLE[role as UserRole] || [];
  return forbiddenPermissions.includes(permission);
}

export const requirePermission = (permission: Permission) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Không được phép truy cập' });
    }

    if (isPermissionForbiddenForRole(req.user.role, permission)) {
      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'FORBIDDEN_PERMISSION_ROLE_BLOCK',
        resource: req.originalUrl,
        ip: req.clientContext.ip,
        userAgent: req.clientContext.userAgent,
        payload: {
          blockedPermission: permission,
          userRole: req.user.role,
        },
        status: 'FAILURE'
      });

      return res.status(403).json({
        error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này'
      });
    }

    let hasPerm = false;
    if (req.user.permissions && Array.isArray(req.user.permissions)) {
      hasPerm = req.user.permissions.includes(permission);
    } else {
      hasPerm = await hasPermission(req.user.role, permission);
    }

    if (!hasPerm) {
      const debugInfo = {
        requiredPermission: permission,
        userRole: req.user.role,
        userPermissions: req.user.permissions,
        userId: req.user.id,
        tenantId: req.user.tenantId
      };
      
      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'INSUFFICIENT_PERMISSIONS',
        resource: req.originalUrl,
        ip: req.clientContext.ip,
        userAgent: req.clientContext.userAgent,
        payload: debugInfo,
        status: 'FAILURE'
      });
      
      // SECURITY [C-02]: Do not leak debug info in production
      if (process.env.NODE_ENV !== 'production') {
        return res.status(403).json({ 
          error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này',
          debug: debugInfo
        });
      }
      
      return res.status(403).json({ 
        error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này'
      });
    }

    return next();
  };
};

export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Không được phép truy cập' });
    }

    const allowedPermissions = permissions.filter((permission) => !isPermissionForbiddenForRole(req.user.role, permission));
    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions as string[] : null;
    const hasPerm = allowedPermissions.length > 0 && (
      userPermissions
        ? allowedPermissions.some((permission) => userPermissions.includes(permission))
        : (await Promise.all(allowedPermissions.map((permission) => hasPermission(req.user.role, permission)))).some(Boolean)
    );

    if (!hasPerm) {
      const debugInfo = {
        requiredAnyPermission: permissions,
        userRole: req.user.role,
        userPermissions: req.user.permissions,
        userId: req.user.id,
        tenantId: req.user.tenantId
      };

      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'INSUFFICIENT_PERMISSIONS',
        resource: req.originalUrl,
        ip: req.clientContext.ip,
        userAgent: req.clientContext.userAgent,
        payload: debugInfo,
        status: 'FAILURE'
      });

      if (process.env.NODE_ENV !== 'production') {
        return res.status(403).json({
          error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này',
          debug: debugInfo
        });
      }

      return res.status(403).json({
        error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này'
      });
    }

    return next();
  };
};

export const requireRole = (roles: (UserRole | string)[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Không được phép truy cập' });
    }

    if (!roles.includes(req.user.role)) {
      const debugInfo = {
        requiredRoles: roles,
        userRole: req.user.role,
        userId: req.user.id,
        tenantId: req.user.tenantId
      };

      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'INSUFFICIENT_PERMISSIONS',
        resource: req.originalUrl,
        ip: req.clientContext.ip,
        userAgent: req.clientContext.userAgent,
        payload: debugInfo,
        status: 'FAILURE'
      });
      
      // SECURITY [C-02]: Do not leak debug info in production, change 418 to 403
      if (process.env.NODE_ENV !== 'production') {
        return res.status(403).json({ 
          error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này',
          debug: debugInfo
        });
      }

      return res.status(403).json({ 
        error: 'Từ chối truy cập: bạn không đủ quyền để thực hiện thao tác này'
      });
    }

    return next();
  };
};

export const requireFeature = (feature: FeatureFlagKey) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role === UserRole.SUPER_ADMIN || req.user.tenantId === 'SYSTEM' || req.user.tenantId === 'PLATFORM') {
      return next();
    }

    const { resolved: resolvedFeatures, rawOverrides } = await loadTenantFeatureContext(req);
    const enabled = resolvedFeatures[feature] === true;

    const dependencyIssues = validateFeatureDependencies(feature, {
      ...resolvedFeatures,
      [feature]: enabled,
    });

    if (dependencyIssues.length > 0) {
      const issue = dependencyIssues[0];
      if (!issue) {
        return res.status(403).json({
          error: 'FEATURE_DEPENDENCY_MISSING',
        });
      }

      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'FEATURE_DEPENDENCY_BLOCKED',
        resource: req.originalUrl,
        ip: req.clientContext?.ip,
        userAgent: req.clientContext?.userAgent,
        payload: {
          feature: issue.feature,
          missing: issue.missing,
          resolvedFeatures,
          rawOverrides,
        },
        status: 'FAILURE'
      });

      return res.status(403).json({
        error: 'FEATURE_DEPENDENCY_MISSING',
        feature: issue.feature,
        missing: issue.missing,
      });
    }

    if (!enabled) {
      await AuditService.log({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        action: 'FEATURE_ACCESS_BLOCKED',
        resource: req.originalUrl,
        ip: req.clientContext?.ip,
        userAgent: req.clientContext?.userAgent,
        payload: {
          feature,
          resolvedFeatures,
        },
        status: 'FAILURE'
      });

      return res.status(403).json({
        error: 'FEATURE_DISABLED',
        feature,
      });
    }

    return next();
  };
};

export const requireContractRuleEngineReady = () => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (isContractRuleEngineReadyForAiScan()) {
      return next();
    }

    await AuditService.log({
      userId: req.user?.id ?? 'anonymous',
      tenantId: req.user?.tenantId ?? req.tenantId ?? 'UNKNOWN',
      action: 'AI_CONTRACT_SCAN_BLOCKED',
      resource: req.originalUrl,
      ip: req.clientContext?.ip,
      userAgent: req.clientContext?.userAgent,
      payload: {
        reason: 'CONTRACT_RULE_ENGINE_NOT_READY',
        requiredTargets: [
          'ContractVersion',
          'ContractLineItem',
          'ContractPenaltyRule',
          'ContractStaffStandard',
          'ContractShiftRequirement',
          'ContractChecklistRequirement',
        ],
      },
      status: 'FAILURE'
    });

    return res.status(409).json({
      error: AI_CONTRACT_SCAN_UNAVAILABLE_MESSAGE,
      feature: 'ai_contract_scan',
      status: 'BLOCKED_BY_GOVERNANCE',
      reason: 'CONTRACT_RULE_ENGINE_NOT_READY',
      runtimeEnabled: false,
      enabledByPlan: true,
      blockedByGovernance: true,
    });
  };
};
