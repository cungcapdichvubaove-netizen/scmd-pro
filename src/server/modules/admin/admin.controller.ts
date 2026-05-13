import { Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { metrics } from '../../core/metrics.js';
import { db } from '../../core/db/prisma.js';
import { z } from 'zod';

export class AdminController {
  /**
   * Returns aggregated SLO metrics for Super Admin Dashboard.
   */
  static async getSLOMetrics(_req: any, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Aggregated Error Rates by Tenant
      const errorStats = await db.system().auditLog.groupBy({
        by: ['tenantId'],
        where: {
          status: 'ERROR',
          createdAt: { gte: past24h }
        },
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      // System-wide Latency Snapshot
      const metricsSnapshot = metrics.getSnapshot();
      const sloMetrics = metricsSnapshot.metrics.filter(m => 
        m.key.includes('duration') || m.key.includes('errors')
      );

      // Specific Tenant SLO status (Sample check for top error tenants)
      const healthStatus = errorStats.map((stat: any) => ({
        tenantId: stat.tenantId,
        errorCount: stat._count.id,
        status: stat._count.id > 20 ? 'CRITICAL' : stat._count.id > 10 ? 'WARNING' : 'HEALTHY'
      }));

      return res.json({
        healthStatus,
        sloMetrics,
        systemHealth: metricsSnapshot.process,
        timestamp: now.toISOString()
      });
    } catch (err: any) {
      logger.error({ err }, 'Get SLO metrics error');
      return next(err);
    }
  }

  /**
   * Returns specific SLO violations/alerts.
   */
  static async getSLOAlerts(req: any, res: Response, next: NextFunction) {
    try {
      const { limit } = z.object({ limit: z.string().optional() }).parse(req.query);
      
      const rawLimit = parseInt(limit as string, 10);
      const safeLimit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

      const alerts = await db.system().auditLog.findMany({
        where: {
          action: { in: ['SLO_VIOLATION', 'PROACTIVE_ALERT', 'ERROR_RATE_SPIKE'] },
          createdAt: { gte: since }
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit
      });

      return res.json(alerts);
    } catch (err: any) {
      logger.error({ err }, 'Get SLO alerts error');
      return next(err);
    }
  }
}
