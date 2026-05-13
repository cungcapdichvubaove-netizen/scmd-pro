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

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    role: string;
    tenantId: string;
  };
  tenantId: string;
  clientContext: {
    ip: string;
    userAgent: string;
  };
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
        return res.status(401).json({ error: 'Print token has been revoked' });
      }

      const decoded = jwt.verify(printToken, JWT_SECRET) as any;
      
      if (decoded && decoded.purpose === 'print' && (decoded.incidentId === req.params.id || decoded.type === 'watcher')) {
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

  // [H-06] Anti-CSRF Guard
  // The system strictly relies on JWT Bearer tokens for authentication, which inherently mitigates CSRF.
  // We explicitly BLOCK any cookie-based authentication fallback to prevent CSRF exposure.
  if ((req as any).cookies && ((req as any).cookies.token || (req as any).cookies.jwt || (req as any).cookies.session)) {
    logger.warn({ ip: clientIp }, 'CSRF Protection: Blocked attempt to use cookie-based authentication. Only Bearer tokens are allowed.');
    return res.status(403).json({ error: 'Forbidden: Cookie-based authentication is strictly blocked due to CSRF protection.' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
  }

  const token = authHeader.split(' ')[1];
  
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
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // Check tenant status and token revocation
    if (decoded.tenantId && 
        decoded.tenantId !== 'SYSTEM' && 
        decoded.tenantId !== 'PLATFORM' && 
        decoded.role !== UserRole.SUPER_ADMIN) {
      const authMetadataKey = `auth_metadata:${decoded.id}`;
      
      // FIX [H-06]: Use CacheManager.wrap for distributed thundering herd protection
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
          return { error: 'Tenant is suspended or inactive', status: 403 };
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
             return { error: 'User account is suspended', status: 403 };
          }
          
          if (user.tenantId !== decoded.tenantId) {
             return { error: 'Invalid workspace context for this user', status: 403 };
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
        
        return { error: 'User not found', status: 401 };
      }, 60);

      if (result && result.error) {
        return res.status(result.status as number).json({ error: result.error });
      }

      // Check token version after fetching/checking cache
      if (decoded.tokenVersion && result.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'Token revoked' });
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
            error: 'Forbidden: You do not have access to this workspace.',
            code: 'TENANT_MISMATCH'
          });
        }
      }

    req.user = decoded;
    req.tenantId = decoded.tenantId;

    return next();
  } catch (err: any) {
    logger.error({ err }, 'Auth Middleware internal error');
    return res.status(500).json({ error: 'Internal Server Error during Authentication' });
  }
};

import { Permission, hasPermission } from '../../core/auth/permissions.js';

export const requirePermission = (permission: Permission) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
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
          error: 'Forbidden: Insufficient permissions for this operation',
          debug: debugInfo
        });
      }
      
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions for this operation'
      });
    }

    return next();
  };
};

export const requireRole = (roles: (UserRole | string)[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
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
          error: 'Forbidden: Insufficient permissions for this operation',
          debug: debugInfo
        });
      }

      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions for this operation'
      });
    }

    return next();
  };
};
