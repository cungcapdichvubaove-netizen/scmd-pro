import { Request, Response, NextFunction } from 'express';
import { QueueService } from '../../core/queue/index.js';
import { logger } from '../../core/logger/index.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { db } from '../../core/db/prisma.js';
import { GeminiService } from '../../core/ai/gemini.service.js';

const REPORT_ALLOWED_DOMAINS = (process.env.REPORT_ALLOWED_DOMAINS || 'app.scmdpro.com').split(',').map(d => d.trim());

function validateReportUrl(url: string, _tenantId: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Allow only HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs allowed');
  }

  // Whitelist hostname check
  const isAllowed = REPORT_ALLOWED_DOMAINS.some(domain =>
    parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
  );
  if (!isAllowed) {
    throw new Error(`Domain '${parsed.hostname}' not permitted for reports`);
  }

  // Block private IP ranges (SSRF protection)
  const privatePatterns = [/^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^127\./, /^169\.254\./];
  if (privatePatterns.some(p => p.test(parsed.hostname))) {
    throw new Error('Private/internal URLs not allowed');
  }
}

export class ReportController {
  static async generatePDF(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { url, options } = req.body;
      
      validateReportUrl(url, ctx.tenantId);
      
      // ENTERPRISE GUARANTEES: Explicit Idempotency via QueueService
      const job = await QueueService.addJob('generate-pdf', {
        type: 'GENERATE_PDF',
        url,
        options,
        tenantId: ctx.tenantId,
        userId: ctx.userId
      });

      return res.json({ jobId: job.id, status: 'queued' });
    } catch (err: any) {
      logger.error({ err }, 'Generate PDF error');
      return next(err);
    }
  }

  static async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { id } = req.params;
      
      // Use QueueService to check both main queue and DLQ
      const job = await QueueService.getJobStatus(id as string);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Bug-V2-04: Tenant isolation for job status
      if (job.data?.tenantId !== ctx.tenantId) {
        return res.status(403).json({ error: 'Forbidden: Access to this job is denied' });
      }

      const state = await job.getState();
      return res.json({ id: job.id, state, result: job.returnvalue });
    } catch (err: any) {
      return next(err);
    }
  }

  static async getSmartMonthlyInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { month } = req.query; // YYYY-MM
      
      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: 'Month parameter (YYYY-MM) is required' });
      }

      const parts = month.split('-');
      if (parts.length !== 2) {
        return res.status(400).json({ error: 'Invalid month format (YYYY-MM)' });
      }
      const year = Number(parts[0]);
      const monthVal = Number(parts[1]);
      
      if (isNaN(year) || year < 2020 || year > 2100) {
        return res.status(400).json({ error: 'Invalid year range (2020-2100)' });
      }
      if (isNaN(monthVal) || monthVal < 1 || monthVal > 12) {
        return res.status(400).json({ error: 'Invalid month (1-12)' });
      }

      const startDate = new Date(year, monthVal - 1, 1);
      const endDate = new Date(year, monthVal, 0, 23, 59, 59);

      const tenantDb = db.forTenant(ctx.tenantId);

      // AGGREGATION [P2]: Avoid fetching 1000s of raw rows. Use DB-level aggregation for AI insights.
      const [
        totalAtt, validAtt, invalidAtt,
        totalPatrols, uniqueCPData,
        totalIncidents, incidentsBySeverity, incidentsByType,
        staffCount
      ] = await Promise.all([
        tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startDate, lte: endDate }, isValid: true } }),
        tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startDate, lte: endDate }, isValid: false } }),
        
        tenantDb.patrolLog.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        tenantDb.patrolLog.groupBy({
          by: ['checkpointId'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true }
        }),
        
        tenantDb.incident.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
        tenantDb.incident.groupBy({
          by: ['severity'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true }
        }),
        tenantDb.incident.groupBy({
          by: ['type'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true }
        }),
        
        tenantDb.staff.count({ where: { status: 'active' } })
      ]);

      // TREND ANALYSIS: Fetch 1-row-per-day counts (Efficient aggregation via DB DATE_TRUNC)
      const { dailyAtt, dailyPatrols } = await db.withTenant(ctx.tenantId, async (tx) => {
        const dAtt = await tx.$queryRawUnsafe(`
          SELECT DATE_TRUNC('day', created_at) as date, COUNT(id)::int as count
          FROM attendance_records
          WHERE tenant_id = $1 
            AND created_at >= $2 
            AND created_at <= $3
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY DATE_TRUNC('day', created_at) ASC
        `, ctx.tenantId, startDate, endDate) as any[];
        
        const dPatrols = await tx.$queryRawUnsafe(`
          SELECT DATE_TRUNC('day', created_at) as date, COUNT(id)::int as count
          FROM patrol_logs
          WHERE tenant_id = $1 
            AND created_at >= $2 
            AND created_at <= $3
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY DATE_TRUNC('day', created_at) ASC
        `, ctx.tenantId, startDate, endDate) as any[];
        
        return { dailyAtt: dAtt, dailyPatrols: dPatrols };
      }, { allowRaw: true, readOnly: true });

      // Helper to post-process raw SQL results into clean daily buckets
      const toDailyTrends = (rows: any[]): { date: string, count: number }[] => {
        return rows.map(r => {
          let d = '';
          try { 
            d = r.date ? new Date(r.date).toISOString().split('T')[0] ?? '' : ''; 
          } catch(e) {
            logger.warn({ date: r.date, error: e instanceof Error ? e.message : String(e) }, 'Failed to parse date in toDailyTrends');
          }
          return { date: d || '', count: parseInt(r.count, 10) || 0 };
        }).slice(-31);
      };

      const insights = await GeminiService.analyzeMonthlyStrategy({
        tenantId: ctx.tenantId,
        month: month as string,
        staffCount,
        attendanceStats: {
          total: totalAtt,
          validCount: validAtt,
          invalidCount: invalidAtt,
          dailyTrends: toDailyTrends(dailyAtt)
        },
        patrolStats: {
          total: totalPatrols,
          uniqueCheckpoints: uniqueCPData.length,
          dailyTrends: toDailyTrends(dailyPatrols)
        },
        incidentStats: {
          total: totalIncidents,
          bySeverity: incidentsBySeverity.reduce((acc: any, curr: any) => ({ ...acc, [curr.severity]: curr._count.id }), {}),
          byType: incidentsByType.reduce((acc: any, curr: any) => ({ ...acc, [curr.type]: curr._count.id }), {})
        }
      });

      return res.json({
        ...insights
      });
    } catch (err: any) {
      logger.error({ err }, 'Get Smart Monthly Insights error');
      return next(err);
    }
  }
}
