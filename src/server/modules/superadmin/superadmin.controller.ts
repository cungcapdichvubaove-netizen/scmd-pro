import { Request, Response, NextFunction } from 'express';
import { SuperAdminService } from './superadmin.service.js';
import { NewsRepository } from '../news/news.repository.js';
import { logger } from '../../core/logger/index.js';
import { onboardTenantSchema, updateSubscriptionSchema } from './superadmin.schema.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { UpdateTenantSubscriptionUseCase } from './application/update-tenant-subscription.usecase.js';
import { db } from '../../core/db/prisma.js';
import { cache } from '../../core/cache/index.js';
import { GetGlobalAuditLogsUseCase } from './application/get-global-audit-logs.usecase.js';
import { QueueService } from '../../core/queue/index.js';
import { UserRole } from '../../core/architecture/types.js';
import { permissionsSchema, refreshDynamicPermissions, Permission } from '../../core/auth/permissions.js';
import { z } from 'zod';
import { FEATURE_FLAG_KEYS } from '../../../shared/business/feature-flags.js';

import { SubscriptionPlan } from '@prisma/client';

export class SuperAdminController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SuperAdminService.getStats();
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_GET_STATS',
        resource: 'system/stats',
        status: 'SUCCESS'
      });
      return res.json(stats);
    } catch (err: any) {
      logger.error({ err }, 'Get stats error');
      return next(err);
    }
  }

  static async runIntegrityCheck(req: Request, res: Response) {
    const ctx = RequestContextResolver.resolve(req);
    await AuditService.log({
      userId: ctx.userId,
      tenantId: 'SYSTEM',
      action: 'SUPERADMIN_RUN_INTEGRITY_CHECK',
      resource: 'system/integrity',
      status: 'SUCCESS'
    });
    return res.json({ 
      success: true, 
      message: "Tính toàn vẹn dữ liệu được đảm bảo bởi PostgreSQL.",
      report: { total: 0, outOfSync: 0, fixed: 0, errors: [] }
    });
  }

  static async listTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const cursor = req.query.cursor as string | undefined;
      const take = parseInt(req.query.limit as string) || 50;
      const tenants = await SuperAdminService.listTenantsPaginated(cursor, take);
      
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_LIST_TENANTS',
        resource: 'system/tenants',
        status: 'SUCCESS'
      });

      return res.json(tenants);
    } catch (err: any) {
      logger.error({ err }, 'List tenants error');
      return next(err);
    }
  }

  static async getMediaSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await SuperAdminService.getStorageConfig();
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_GET_MEDIA_SETTINGS',
        resource: 'system/settings/media',
        status: 'SUCCESS'
      });
      return res.json(config);
    } catch (err: any) {
      logger.error({ err }, 'Get media settings error');
      return next(err);
    }
  }

  static async updateMediaSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const data = z.record(z.any()).parse(req.body);
      const config = await SuperAdminService.updateStorageConfig(data);
      
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'UPDATE_MEDIA_SETTINGS',
        resource: 'system/settings/media',
        status: 'SUCCESS',
        payload: data
      });

      res.json(config);
      return;
    } catch (err: any) {
      logger.error({ err }, 'Update media settings error');
      return next(err);
    }
  }

  static async onboardTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const validatedData = onboardTenantSchema.parse(req.body);
      const tenant = await SuperAdminService.onboardTenant(validatedData);

      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'PLATFORM',
        action: 'ONBOARD_TENANT',
        resource: `tenant/${tenant.id}`,
        status: 'SUCCESS',
        payload: { subdomain: tenant.subdomain }
      });

      return res.json(tenant);
    } catch (err: any) {
      logger.error({ err }, 'Onboard tenant error');
      return next(err);
    }
  }

  static async activateTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.tenantId as string;
      await SuperAdminService.updateTenantStatus(id, 'active');
      
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'PLATFORM',
        action: 'ACTIVATE_TENANT',
        resource: `tenant/${id}`,
        status: 'SUCCESS'
      });

      return res.json({ success: true });
    } catch (err: any) {
      return next(err);
    }
  }

  static async suspendTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.tenantId as string;
      await SuperAdminService.updateTenantStatus(id, 'suspended');

      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'PLATFORM',
        action: 'SUSPEND_TENANT',
        resource: `tenant/${id}`,
        status: 'SUCCESS'
      });

      return res.json({ success: true });
    } catch (err: any) {
      return next(err);
    }
  }

  static async updateFeatures(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.tenantId as string;
      const featureShape = FEATURE_FLAG_KEYS.reduce((shape, key) => {
        shape[key] = z.boolean().optional();
        return shape;
      }, {} as Record<string, z.ZodBoolean | z.ZodOptional<z.ZodBoolean>>);
      const { features_enabled } = z.object({
        features_enabled: z.object(featureShape).partial(),
      }).parse(req.body);
      const result = await SuperAdminService.updateTenantFeatures(id, features_enabled);

      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'PLATFORM',
        action: 'UPDATE_TENANT_FEATURES',
        resource: `tenant/${id}`,
        status: 'SUCCESS',
        payload: {
          diff: {
            before: result.before,
            after: result.after,
          },
          features_enabled: result.after,
        }
      });

      return res.json({ success: true, features_enabled: result.after });
    } catch (err: any) {
      return next(err);
    }
  }

  static async updateMaxEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.tenantId as string;
      const { max_employees } = z.object({ max_employees: z.number().int().positive() }).parse(req.body);
      await SuperAdminService.updateTenantMaxEmployees(id, Number(max_employees));
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_UPDATE_MAX_EMPLOYEES',
        resource: `tenant/${id}`,
        status: 'SUCCESS',
        payload: { max_employees }
      });
      return res.json({ success: true });
    } catch (err: any) {
      return next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.tenantId as string;
      const { new_password } = z.object({ new_password: z.string().min(8) }).parse(req.body);
      await SuperAdminService.resetTenantAdminPassword(id, new_password);
      
      await AuditService.log({
        userId: ctx.userId,
        tenantId: id,
        action: 'ADMIN_PASSWORD_RESET',
        resource: `tenant/${id}/admin`,
        payload: { targetTenant: id },
        ip: req.ip,
        userAgent: req.get('user-agent'),
        status: 'SUCCESS',
        traceId: res.locals?.span?.spanContext()?.traceId || undefined
      });

      return res.json({ success: true });
    } catch (err: any) {
      return next(err);
    }
  }

  // News Management
  static async listNews(req: Request, res: Response, next: NextFunction) {
    try {
      const { cursor, limit } = req.query;
      const news = await NewsRepository.getAll(
        cursor as string,
        limit ? parseInt(limit as string, 10) : 20
      );
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_LIST_NEWS',
        resource: 'system/news',
        status: 'SUCCESS'
      });
      return res.json(news);
    } catch (err: any) {
      logger.error({ err }, 'List news error');
      return next(err);
    }
  }

  static async createNews(req: Request, res: Response, next: NextFunction) {
    try {
      const data = z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        status: z.enum(['draft', 'published']).optional(),
      }).parse(req.body);

      const news = await NewsRepository.create(data);
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_CREATE_NEWS',
        resource: 'system/news',
        status: 'SUCCESS',
        payload: data
      });
      return res.json(news);
    } catch (err: any) {
      logger.error({ err }, 'Create news error');
      return next(err);
    }
  }

  static async updateNews(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = z.object({
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        status: z.enum(['draft', 'published']).optional(),
      }).parse(req.body);

      const news = await NewsRepository.update(id, data);
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_UPDATE_NEWS',
        resource: `system/news/${id}`,
        status: 'SUCCESS',
        payload: data
      });
      return res.json(news);
    } catch (err: any) {
      logger.error({ err }, 'Update news error');
      return next(err);
    }
  }

  static async deleteNews(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await NewsRepository.delete(id);
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_DELETE_NEWS',
        resource: `system/news/${id}`,
        status: 'SUCCESS'
      });
      return res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, 'Delete news error');
      return next(err);
    }
  }

  static async listUpgradeRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const cursor = req.query.cursor as string | undefined;
      const take = parseInt(req.query.limit as string) || 100;
      
      const [requests, total] = await db.withTenant('SYSTEM', async (tx) => {
        return Promise.all([
          tx.feedback.findMany({
            where: { type: 'UPGRADE_REQUEST' },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            ...(cursor && { skip: 1, cursor: { id: cursor } }),
          }),
          tx.feedback.count({ where: { type: 'UPGRADE_REQUEST' } }),
        ]);
      }, { callerRole: 'super-admin' });
      
      let nextCursor: string | null = null;
      if (requests.length > take) {
        const nextItem = requests.pop();
        if (nextItem) nextCursor = nextItem.id;
      }
      
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_LIST_UPGRADE_REQUESTS',
        resource: 'system/upgrade_requests',
        status: 'SUCCESS'
      });

      return res.json({ data: requests, nextCursor, total });
    } catch (err: any) {
      logger.error({ err }, 'List upgrade requests error');
      return next(err);
    }
  }

  static async resolveUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const feedbackId = req.params['feedbackId'] as string;
      const { action } = z.object({ action: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body); // 'APPROVED' | 'REJECTED'

      // Cập nhật trạng thái feedback
      const feedback = await db.withTenant('SYSTEM', async (tx) => {
        return tx.feedback.update({
          where: { id: feedbackId },
          data: { status: action === 'APPROVED' ? 'RESOLVED' : 'CLOSED' },
        });
      }, { callerRole: 'super-admin' });

      // Nếu duyệt → tự động nâng cấp plan
      if (action === 'APPROVED') {
        const upgradeNotification = await db.withTenant('SYSTEM', async (tx) => {
          return tx.notification.findFirst({
            where: {
              tenantId: 'SYSTEM',
              type: 'UPGRADE_REQUEST',
              metadata: { path: ['feedbackId'], equals: feedbackId },
            },
            select: { metadata: true },
            orderBy: { createdAt: 'desc' },
          });
        }, { callerRole: 'super-admin' });

        const requestedPlan = (upgradeNotification?.metadata as any)?.requestedPlan;
        const parsedPlan = z.nativeEnum(SubscriptionPlan).safeParse(requestedPlan);
        if (!parsedPlan.success || parsedPlan.data === SubscriptionPlan.FREE) {
          return res.status(409).json({
            error: 'Khong the duyet yeu cau nang cap vi thieu metadata goi can nang cap.',
            code: 'UPGRADE_PLAN_METADATA_REQUIRED'
          });
        }

        const subscriptionPlan = parsedPlan.data;
        await db.system().tenant.update({
          where: { id: feedback.tenantId },
          data: { subscriptionPlan, plan: subscriptionPlan },
        });
        await Promise.all([
          cache.del(`tenant:status:${feedback.tenantId}`),
          cache.del(`tenant:${feedback.tenantId}`),
          cache.del(`tenant:features:${feedback.tenantId}`),
        ]);
      }

      // Đánh dấu notification SYSTEM đã đọc (nếu có)
      await db.withTenant('SYSTEM', async (tx) => {
        return tx.notification.updateMany({
          where: {
            tenantId: 'SYSTEM',
            type: 'UPGRADE_REQUEST',
            metadata: { path: ['feedbackId'], equals: feedbackId },
            status: 'UNREAD',
          },
          data: { status: 'READ' },
        });
      }, { callerRole: 'super-admin' }).catch((err: any) => {
        logger.warn({ err, feedbackId }, 'Non-fatal error: Failed to mark system notifications as read');
      }); // non-fatal

      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_RESOLVE_UPGRADE_REQUEST',
        resource: `system/upgrade_requests/${feedbackId}`,
        status: 'SUCCESS',
        payload: { action, tenantId: feedback.tenantId }
      });

      return res.json({ success: true, action, tenantId: feedback.tenantId });
    } catch (err: any) {
      logger.error({ err }, 'Resolve upgrade request error');
      return next(err);
    }
  }

  static async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const tenantId = req.params.tenantId as string;
      const { plan } = updateSubscriptionSchema.parse(req.body);

      const useCase = new UpdateTenantSubscriptionUseCase();
      await useCase.execute(ctx, { tenantId, plan });

      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'UPDATE_TENANT_SUBSCRIPTION',
        resource: `tenants/${tenantId}`,
        status: 'SUCCESS',
        payload: { plan }
      });

      return res.json({ success: true, message: `Tenant đã được chuyển sang gói ${plan}` });
    } catch (err: any) {
      logger.error({ err }, 'Update subscription error');
      return next(err);
    }
  }

  static async deleteTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const id = req.params.tenantId as string;
      await SuperAdminService.deleteTenant(id);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'PLATFORM',
        action: 'DELETE_TENANT',
        resource: `tenant/${id}`,
        status: 'SUCCESS'
      });
      return res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, 'Delete tenant error');
      return next(err);
    }
  }

  static async getGlobalAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new GetGlobalAuditLogsUseCase();
      const result = await useCase.execute(req.query, ctx);
      return res.json(result);
    } catch (err: any) {
      if (err.message?.includes('Max time range allowed')) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
      }
      logger.error({ err }, 'getGlobalAuditLogs error');
      return next(err);
    }
  }

  static async listDLQJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10;
      const jobs = await QueueService.getDLQJobs(limit);
      
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_LIST_DLQ_JOBS',
        resource: 'system/jobs/dlq',
        status: 'SUCCESS'
      });

      return res.json(jobs);
    } catch (err: any) {
      logger.error({ err }, 'List DLQ jobs error');
      return next(err);
    }
  }

  static async replayDLQJob(req: Request, res: Response, next: NextFunction) {
    try {
      const jobId = req.params['jobId'] as string;
      const result = await QueueService.replayDLQJob(jobId);
      
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'REPLAY_DLQ_JOB',
        resource: `jobs/dlq/${jobId}`,
        status: 'SUCCESS',
        payload: { jobId }
      });

      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Replay DLQ job error');
      return next(err);
    }
  }

  static async getRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await db.system().systemConfig.findUnique({
        where: { key: 'role_permissions' }
      });
      
      const ctx = RequestContextResolver.resolve(req);
      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_GET_PERMISSIONS',
        resource: 'system/permissions',
        status: 'SUCCESS'
      });

      // RolePermissions được lưu trong src/server/core/auth/permissions.ts là mặc định
      // Nếu có trong DB thì trả về từ DB, không thì trả null để Client dùng default
      return res.json(config?.value || null);
    } catch (err: any) {
      logger.error({ err }, 'Get role permissions error');
      return next(err);
    }
  }

  static async updateRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { permissions } = req.body;
      const ctx = RequestContextResolver.resolve(req);

      // Fix (a): Zod validation
      permissionsSchema.parse(permissions);

      // Fix (b): Strip SUPER_ADMIN key to prevent removal/modification of SA permissions
      const { [UserRole.SUPER_ADMIN]: _, ...safePerms } = permissions;

      // [FIX H-05]: Chặn privilege escalation — GUARD và TECHNICIAN không được gán quyền nguy hiểm.
      // permissionsSchema chỉ validate type (array of ALL_PERMISSIONS), không chặn semantic.
      // Không có guard này → Super Admin có thể vô tình (hoặc cố ý) gán system:manage cho Guard.
      const FORBIDDEN_PERMS_FOR_LOW_ROLES: Partial<Record<UserRole, Permission[]>> = {
        [UserRole.GUARD]: ['system:manage', 'tenant:manage', 'billing:read', 'billing:write'],
        [UserRole.TECHNICIAN]: ['system:manage', 'tenant:manage', 'billing:read', 'billing:write'],
        [UserRole.SUPERVISOR]: ['system:manage', 'tenant:manage', 'billing:write', 'report:finalize', 'vendor:write', 'violation:resolve'],
        [UserRole.VENDOR_COMMANDER]: ['system:manage', 'tenant:manage', 'billing:read', 'billing:write', 'report:finalize', 'vendor:write', 'violation:resolve'],
        [UserRole.VENDOR_REPRESENTATIVE]: ['system:manage', 'tenant:manage', 'billing:read', 'billing:write', 'report:finalize', 'vendor:write', 'violation:resolve', 'staff:write'],
      };
      for (const [role, forbidden] of Object.entries(FORBIDDEN_PERMS_FOR_LOW_ROLES)) {
        const assigned: string[] = safePerms[role as UserRole] || [];
        const violations = assigned.filter((p) => (forbidden as string[]).includes(p));
        if (violations.length > 0) {
          logger.warn({ role, violations, userId: ctx.userId }, 'SECURITY: Permission escalation attempt blocked');
          return res.status(422).json({
            error: 'FORBIDDEN_PERMISSION_ESCALATION',
            role,
            violations,
          });
        }
      }

      // [FIX H-05]: Lấy giá trị hiện tại để log diff before/after
      const existingConfig = await db.system().systemConfig.findUnique({
        where: { key: 'role_permissions' },
        select: { value: true }
      });
      const permsBefore = existingConfig?.value ?? null;

      const config = await db.system().systemConfig.upsert({
        where: { key: 'role_permissions' },
        create: {
          key: 'role_permissions',
          value: safePerms as any
        },
        update: {
          value: safePerms as any
        }
      });

      // Fix (c): Invalidate distributed cache AND local process cache
      await cache.del('system:permissions');
      await refreshDynamicPermissions();

      await AuditService.log({
        userId: ctx.userId,
        tenantId: 'SYSTEM',
        action: 'SUPERADMIN_UPDATE_PERMISSIONS',
        resource: 'system/permissions',
        status: 'SUCCESS',
        // [FIX H-05]: Ghi diff đầy đủ để audit trail có thể điều tra thay đổi
        payload: { before: permsBefore, after: safePerms }
      });

      return res.json(config.value);
    } catch (err: any) {
      logger.error({ err }, 'Update role permissions error');
      return next(err);
    }
  }
}
