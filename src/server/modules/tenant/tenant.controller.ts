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


const maskSensitiveSettings = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(maskSensitiveSettings);
  if (!value || typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/pass(word)?|secret|token|key/i.test(key)) {
      result[key] = child ? '********' : child;
    } else {
      result[key] = maskSensitiveSettings(child);
    }
  }
  return result;
};

const preserveMaskedSecrets = (current: any, next: any): any => {
  const smtpPass = next?.notifications?.email?.smtpPass;
  if ((smtpPass === '' || smtpPass === '********') && current?.notifications?.email?.smtpPass) {
    return {
      ...next,
      notifications: {
        ...next.notifications,
        email: {
          ...next.notifications.email,
          smtpPass: current.notifications.email.smtpPass,
        },
      },
    };
  }
  return next;
};

const feedbackSeverityValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const feedbackTypeValues = ['BUG', 'SUPPORT', 'FEATURE_REQUEST', 'OTHER'] as const;

const normalizeUpper = (value: unknown) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

const feedbackPayloadSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(4000).optional(),
  message: z.string().trim().min(5).max(4000).optional(),
  severity: z.preprocess(normalizeUpper, z.enum(feedbackSeverityValues).optional()),
  priority: z.preprocess(normalizeUpper, z.enum(feedbackSeverityValues).optional()),
  type: z.preprocess(normalizeUpper, z.enum(feedbackTypeValues).optional()),
}).superRefine((value, ctx) => {
  if (!value.description && !value.message) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'description is required', path: ['description'] });
  }

  if (value.severity && value.priority && value.severity !== value.priority) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AMBIGUOUS_FEEDBACK_SEVERITY',
      path: ['severity'],
    });
  }
});

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
      const data = feedbackPayloadSchema.parse(req.body);
      const severity = data.severity || data.priority || 'LOW';

      const useCase = new SubmitFeedbackUseCase();
      const feedback = await useCase.execute({
        tenantId,
        userId,
        title: data.title,
        description: data.description || data.message || '',
        severity,
        type: data.type || 'SUPPORT'
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
      const tenant = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { featuresEnabled: true }
        });
      });
      return res.json({ settings: maskSensitiveSettings(tenant?.featuresEnabled || {}) });
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
      
      const current = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { featuresEnabled: true }
        });
      });
      
      const currentFeatures = (current?.featuresEnabled as Record<string, any>) || {};
      const requestedFeatures = {
        ...currentFeatures,
        ...data.settings
      };
      const updatedFeatures = preserveMaskedSecrets(currentFeatures, requestedFeatures);
      
      await db.withTenant('SYSTEM', async (tx) => {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { featuresEnabled: updatedFeatures }
        });
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
            before: maskSensitiveSettings(current?.featuresEnabled as object || {}),
            after: maskSensitiveSettings(updatedFeatures)
          }
        });
      } catch(auditErr) {
        logger.error({ err: auditErr }, 'Failed to write audit log for update settings');
      }
      
      return res.json({ success: true, settings: maskSensitiveSettings(updatedFeatures) });
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

  static async getGuardProfile(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const today = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await db.withTenant(tenantId, async (tx) => {
        const staff = await tx.staff.findFirst({
          where: { id: userId },
          select: {
            id: true,
            fullName: true,
            staffId: true,
            status: true,
            assignedVendorId: true,
            assignedSiteId: true,
            assignedContractId: true,
          },
        });

        if (!staff) {
          return null;
        }

        const [vendor, site, contract, assignment, attendanceHistory] = await Promise.all([
          staff.assignedVendorId
            ? tx.vendor.findFirst({
                where: { id: staff.assignedVendorId },
                select: { id: true, name: true, status: true },
              })
            : Promise.resolve(null),
          staff.assignedSiteId
            ? tx.site.findFirst({
                where: { id: staff.assignedSiteId },
                select: { id: true, siteName: true, address: true, status: true },
              })
            : Promise.resolve(null),
          staff.assignedContractId
            ? tx.contract.findFirst({
                where: { id: staff.assignedContractId },
                select: { id: true, contractName: true, contractCode: true, status: true },
              })
            : Promise.resolve(null),
          tx.shiftAssignment.findFirst({
            where: {
              staffId: staff.id,
              status: 'ASSIGNED',
              ...(staff.assignedVendorId ? { vendorId: staff.assignedVendorId } : {}),
              ...(staff.assignedSiteId ? { siteId: staff.assignedSiteId } : {}),
              ...(staff.assignedContractId ? { contractId: staff.assignedContractId } : {}),
              shiftSchedule: {
                date: today,
                ...(staff.assignedSiteId ? { siteId: staff.assignedSiteId } : {}),
                ...(staff.assignedContractId ? { contractId: staff.assignedContractId } : {}),
              },
            },
            orderBy: { assignedAt: 'desc' },
            select: {
              id: true,
              status: true,
              shiftSchedule: {
                select: {
                  id: true,
                  date: true,
                  shiftType: true,
                  startTime: true,
                  endTime: true,
                  positionName: true,
                  guardPost: {
                    select: { id: true, postName: true, postType: true },
                  },
                },
              },
            },
          }),
          tx.attendanceRecord.findMany({
            where: {
              staffId: staff.id,
              createdAt: { gte: sevenDaysAgo },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
              id: true,
              type: true,
              createdAt: true,
              isValid: true,
              checkInAt: true,
              checkOutAt: true,
              lateMinutes: true,
              earlyLeaveMinutes: true,
              shiftSchedule: {
                select: {
                  id: true,
                  date: true,
                  shiftType: true,
                  siteId: true,
                  guardPost: {
                    select: { id: true, postName: true },
                  },
                },
              },
            },
          }),
        ]);

        const warnings = [
          !staff.staffId ? 'Thiếu mã nhân sự/ID.' : null,
          !staff.assignedVendorId ? 'Chưa gắn vendor phụ trách.' : null,
          !staff.assignedSiteId ? 'Chưa gắn site làm việc.' : null,
          !staff.assignedContractId ? 'Chưa gắn hợp đồng/SLA.' : null,
          !assignment ? 'Chưa có ca trực được phân công hôm nay.' : null,
        ].filter(Boolean);

        return {
          guard: {
            id: staff.id,
            fullName: staff.fullName,
            staffId: staff.staffId,
            status: staff.status,
          },
          scope: {
            vendor,
            site,
            contract,
          },
          todayShift: assignment?.shiftSchedule ?? null,
          attendanceHistory,
          warnings,
        };
      });

      if (!result) {
        return res.status(404).json({ error: 'GUARD_PROFILE_NOT_FOUND' });
      }

      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Get guard profile error');
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

      // Operational dashboard data must not stay stale after patrol/incident updates.
      await cache.set(cacheKey, result, 60);

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
