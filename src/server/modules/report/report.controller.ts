import { Request, Response, NextFunction } from 'express';
import { QueueService } from '../../core/queue/index.js';
import { logger } from '../../core/logger/index.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { db } from '../../core/db/prisma.js';
import { GeminiService } from '../../core/ai/gemini.service.js';
import { ListVendorScorecardsUseCase } from './application/list-vendor-scorecards.usecase.js';
import { ListMonthlyAcceptanceReportsUseCase } from './application/list-monthly-acceptance-reports.usecase.js';
import { ListViolationDisputesUseCase } from './application/list-violation-disputes.usecase.js';
import { GenerateMonthlyAcceptanceReportUseCase } from './application/generate-monthly-acceptance-report.usecase.js';
import { FinalizeMonthlyAcceptanceReportUseCase } from './application/finalize-monthly-acceptance-report.usecase.js';
import { CreateMonthlyAcceptanceRevisionUseCase } from './application/create-monthly-acceptance-revision.usecase.js';
import { GetMonthlyAcceptanceVersionBindingUseCase } from './application/get-monthly-acceptance-version-binding.usecase.js';
import { SubmitViolationDisputeUseCase } from './application/submit-violation-dispute.usecase.js';
import { ResolveViolationDisputeUseCase } from './application/resolve-violation-dispute.usecase.js';
import { QueueMonthlyAcceptanceExportUseCase } from './application/queue-monthly-acceptance-export.usecase.js';
import { GetMonthlyAcceptanceArtifactUseCase } from './application/get-monthly-acceptance-artifact.usecase.js';
import { ReportArtifactStorageService } from './application/report-artifact-storage.service.js';
import {
  complianceScopeSchema,
  createMonthlyAcceptanceRevisionSchema,
  exportMonthlyAcceptanceReportSchema,
  finalizeMonthlyAcceptanceReportSchema,
  resolveViolationDisputeSchema,
  submitViolationDisputeSchema,
} from './report.schema.js';

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
  static async listVendorScorecards(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListVendorScorecardsUseCase();
      const result = await useCase.execute(ctx, req.query);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'List vendor scorecards error');
      return next(err);
    }
  }

  static async listMonthlyAcceptanceReports(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListMonthlyAcceptanceReportsUseCase();
      const result = await useCase.execute(ctx, req.query);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'List monthly acceptance reports error');
      return next(err);
    }
  }

  static async generateMonthlyAcceptanceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = complianceScopeSchema.parse(req.body);
      const useCase = new GenerateMonthlyAcceptanceReportUseCase();
      const result = await useCase.execute(ctx, payload);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Generate monthly acceptance report error');
      return next(err);
    }
  }

  static async listViolationDisputes(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ListViolationDisputesUseCase();
      const result = await useCase.execute(ctx, req.query);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'List violation disputes error');
      return next(err);
    }
  }

  static async finalizeMonthlyAcceptanceReport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = finalizeMonthlyAcceptanceReportSchema.parse(req.body);
      const useCase = new FinalizeMonthlyAcceptanceReportUseCase();
      const result = await useCase.execute(ctx, {
        reportId: req.params.id as string,
        notes: payload.notes,
      });
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Finalize monthly acceptance report error');
      return next(err);
    }
  }

  static async getMonthlyAcceptanceVersionBinding(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new GetMonthlyAcceptanceVersionBindingUseCase();
      const result = await useCase.execute(ctx, req.params.id as string);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Get monthly acceptance version binding error');
      return next(err);
    }
  }

  static async createMonthlyAcceptanceRevision(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = createMonthlyAcceptanceRevisionSchema.parse(req.body);
      const useCase = new CreateMonthlyAcceptanceRevisionUseCase();
      const result = await useCase.execute(ctx, {
        reportId: req.params.id as string,
        notes: payload.notes,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Create monthly acceptance revision error');
      return next(err);
    }
  }

  static async submitViolationDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = submitViolationDisputeSchema.parse(req.body);
      const useCase = new SubmitViolationDisputeUseCase();
      const result = await useCase.execute(ctx, payload);
      return res.status(201).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Submit violation dispute error');
      return next(err);
    }
  }

  static async resolveViolationDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = resolveViolationDisputeSchema.parse(req.body);
      const useCase = new ResolveViolationDisputeUseCase();
      const result = await useCase.execute(ctx, req.params.id as string, payload);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Resolve violation dispute error');
      return next(err);
    }
  }

  static async queueMonthlyAcceptanceExport(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const payload = exportMonthlyAcceptanceReportSchema.parse(req.body);
      const useCase = new QueueMonthlyAcceptanceExportUseCase();
      const result = await useCase.execute(ctx, req.params.id as string, payload);
      return res.status(202).json(result);
    } catch (err: any) {
      logger.error({ err }, 'Queue monthly acceptance export error');
      return next(err);
    }
  }

  static async downloadMonthlyAcceptanceArtifact(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new GetMonthlyAcceptanceArtifactUseCase();
      const attachment = await useCase.execute(ctx, req.params.id as string, req.params.attachmentId as string);
      const metadata = attachment.metadata && typeof attachment.metadata === 'object'
        ? attachment.metadata as Record<string, any>
        : {};
      const fileName = typeof metadata.fileName === 'string' ? metadata.fileName : attachment.name;
      const buffer = await ReportArtifactStorageService.read(attachment);
      res.setHeader('Content-Type', attachment.fileType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length.toString());
      return res.send(buffer);
    } catch (err: any) {
      logger.error({ err }, 'Download monthly acceptance artifact error');
      return next(err);
    }
  }

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
        return res.status(404).json({ error: 'Không tìm thấy tác vụ' });
      }

      // Bug-V2-04: Tenant isolation for job status
      if (job.data?.tenantId !== ctx.tenantId) {
        return res.status(403).json({ error: 'Từ chối truy cập: bạn không có quyền xem tác vụ này' });
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

      // AGGREGATION [P2]: Avoid fetching 1000s of raw rows. Use DB-level aggregation for AI insights.
      const [
        totalAtt, validAtt, invalidAtt,
        totalPatrols, uniqueCPData,
        totalIncidents, incidentsBySeverity, incidentsByType,
        staffCount
      ] = await db.withTenant(ctx.tenantId, async (tenantDb) => Promise.all([
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
      ]));

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
        })
          .filter((item) => item.date)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-31);
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
