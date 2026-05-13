import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { PatrolService } from '../patrol/patrol.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { GetMeUseCase } from './application/get-me.usecase.js';
import { SubmitFeedbackUseCase } from './application/submit-feedback.usecase.js';
import { RequestUpgradeUseCase } from './application/request-upgrade.usecase.js';
import { cache } from '../../core/cache/index.js';
import { db } from '../../core/db/prisma.js';
import { z } from 'zod';

export class TenantController {
  static async requestUpgrade(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const data = z.object({
        plan: z.string().default('PRO'),
        note: z.string().optional()
      }).parse(req.body);

      if (!['PRO', 'ENTERPRISE'].includes(data.plan)) {
        return res.status(400).json({ error: 'Gói nâng cấp không hợp lệ.' });
      }

      const useCase = new RequestUpgradeUseCase();
      const result = await useCase.execute({ tenantId, userId, plan: data.plan, note: data.note });

      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Request upgrade error');
      return next(err);
    }
  }

  static async submitFeedback(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const data = z.object({
        title: z.string(),
        description: z.string(),
        severity: z.string().optional(),
        type: z.string().optional()
      }).parse(req.body);

      const useCase = new SubmitFeedbackUseCase();
      const feedback = await useCase.execute({
        tenantId,
        userId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        type: data.type
      });

      return res.status(201).json(feedback);
    } catch (err: any) {
      logger.error({ err }, 'Submit feedback error');
      return next(err);
    }
  }

  static async getSettings(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const tenant = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: { featuresEnabled: true }
      });
      return res.json({ settings: tenant?.featuresEnabled || {} });
    } catch (err: any) {
      logger.error({ err }, 'Get settings error');
      return next(err);
    }
  }

  static async updateSettings(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const data = z.object({
        settings: z.record(z.any())
      }).parse(req.body);
      
      const current = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: { featuresEnabled: true }
      });
      
      const updatedFeatures = {
        ...(current?.featuresEnabled as object || {}),
        ...data.settings
      };
      
      await db.system().tenant.update({
        where: { id: tenantId },
        data: { featuresEnabled: updatedFeatures }
      });
      
      try {
        await AuditService.log({
          userId: req.user.id,
          tenantId,
          action: 'UPDATE_TENANT_SETTINGS',
          resource: 'Tenant',
          status: 'SUCCESS',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          diff: {
            before: current?.featuresEnabled as object || {},
            after: updatedFeatures
          }
        });
      } catch(auditErr) {
        logger.error({ err: auditErr }, 'Failed to write audit log for update settings');
      }
      
      return res.json({ success: true, settings: updatedFeatures });
    } catch (err: any) {
      logger.error({ err }, 'Update settings error');
      return next(err);
    }
  }

  static async getMe(req: any, res: Response, next: NextFunction) {
    try {
      const ctx = {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        role: req.user.role,
        clientContext: req.clientContext
      };
      
      const useCase = new GetMeUseCase();
      const result = await useCase.execute(ctx as any, undefined);
      
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Get me error');
      return next(err);
    }
  }

  static async getStats(req: any, res: Response, next: NextFunction) {
    try {
      const ctx = {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        role: req.user.role,
        clientContext: req.clientContext
      };
      
      // Redis caching layer
      const cacheKey = `dashboard_stats:${ctx.tenantId}`;
      const cachedStats = await cache.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

      // FIX 3.3: Chuyển từ việc truyền string tenantId sang truyền full SecurityContext đối tượng
      // Điều này đảm bảo PatrolService có thể thực hiện kiểm tra IS_GUARD và lọc theo ownerId chính xác.
      const [logsResult, checkpointsResult] = await Promise.all([
        PatrolService.getLogs(ctx as any),
        PatrolService.getCheckpoints(ctx as any)
      ]) as any;

      const logs = (Array.isArray(logsResult) ? logsResult : (logsResult?.data || []));
      const checkpoints = (Array.isArray(checkpointsResult) ? checkpointsResult : (checkpointsResult?.data || []));

      const totalCheckpoints = checkpoints.length || 0;
      const today = new Date().toISOString().split('T')[0];
      const logsToday = logs.filter((l: any) => {
        // Defensive normalization: handles both Date objects (Prisma) and ISO strings (Legacy/Firestore)
        const d = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
        return d.toISOString().startsWith(today);
      });
      
      // Calculate completion rate based on unique checkpoints scanned today
      const uniqueCheckpointsToday = new Set(logsToday.map((l: any) => l.checkpointId));
      const completionRate = totalCheckpoints > 0 
        ? Math.round((uniqueCheckpointsToday.size / totalCheckpoints) * 100) 
        : 0;

      const result = {
        completionRate,
        totalCheckpoints,
        completedCheckpoints: uniqueCheckpointsToday.size,
        dailyStats: [
          { name: 'Hôm nay', completion: completionRate }
        ]
      };

      // Set to redis, expire in 5 minutes (300 seconds)
      await cache.set(cacheKey, result, 300);

      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Get tenant stats error');
      return next(err);
    }
  }

  static async getPricing(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({
        currency: 'VND',
        methods: ['bank_transfer', 'momo', 'vnpay'],
        plans: {
          basic: { name: 'Cơ bản', price: 500000, max_guards: 5, ai_enabled: false },
          pro: { name: 'Chuyên nghiệp', price: 2000000, max_guards: 20, ai_enabled: true },
          enterprise: { name: 'Doanh nghiệp', price: 5000000, max_guards: 100, ai_enabled: true }
        }
      });
    } catch (err: any) {
      logger.error({ err }, 'Get pricing error');
      return next(err);
    }
  }

  static async getAuditLogs(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const { limit = 50, cursor } = req.query;
      const logs = await AuditService.getLogsByTenant(
        tenantId,
        cursor as string,
        parseInt(limit as string, 10)
      );
      return res.json(logs);
    } catch (err: any) {
      logger.error({ err }, 'Get audit logs error');
      return next(err);
    }
  }
}
