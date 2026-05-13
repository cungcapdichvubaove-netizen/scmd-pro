import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { createWorker } from './index.js';
import { PDFClient } from '../../infra/pdf/client.js';
import { logger } from '../logger/index.js';

let _heavyWorker: any = null;

const heavyProcessor = async (job: any) => {
  const { type, url, options } = job.data;
  logger.info({ jobId: job.id, type }, 'HeavyWorker: Executing job');

  switch (type) {
    case 'GENERATE_PDF':
    case 'generate-pdf':
      return await PDFClient.generate(url, options);
    case 'SCREENSHOT':
      return await PDFClient.screenshot(url);
    case 'AI_ANALYSIS': {
      const { logId, tenantId } = job.data;
      if (!logId) {
        throw new Error('AI_ANALYSIS job failed: Missing logId in job data');
      }
      logger.info({ jobId: job.id, logId, tenantId }, 'AI_ANALYSIS job started');
      const { AnalyzeLogUseCase } = await import('../../core/use-cases/patrol/analyze-log.usecase.js');
      const { UserRole } = await import('../../core/architecture/types.js');
      const useCase = new AnalyzeLogUseCase();
      // Use case requires authorization. Workers run as SYSTEM_ADMIN/SUPER_ADMIN.
      return await useCase.execute({
        userId: 'SYSTEM_WORKER',
        role: UserRole.SUPER_ADMIN,
        tenantId: tenantId || 'SYSTEM',
        email: 'system@scmdpro.com'
      }, { logId });
    }
    case 'AI_INCIDENT_IMAGE_ANALYSIS': {
      const { incidentId, tenantId, imageUri, description } = job.data;
      logger.info({ incidentId, tenantId }, 'AI_INCIDENT_IMAGE_ANALYSIS starting');
      
      if (!imageUri) return;
      
      const { GeminiService } = await import('../../core/ai/gemini.service.js');
      const result = await GeminiService.analyzeIncidentImage(imageUri, description || '');
      
      if (result.isHighSeverity) {
        const { db } = await import('../../core/db/prisma.js');
        const { NotificationService } = await import('../../modules/notification/notification.service.js');

        // Update DB
        await db.forTenant(tenantId).incident.update({
          where: { id: incidentId },
          data: { 
            severity: IncidentSeverity.HIGH, 
            type: result.classification,
            status: IncidentStatus.ESCALATED
          } // using enums
        });

        // Send alert
        await NotificationService.sendSecurityAlert(
          tenantId,
          `🚨 AI PHÁT HIỆN SỰ CỐ NGHIÊM TRỌNG: ${result.classification}`,
          `${result.reason}`,
          'SOS',
          { incidentId }
        );
      }
      return result;
    }
    case 'MONTHLY_AI_STRATEGY': {
      const { db } = await import('../../core/db/prisma.js');
      const { Prisma } = await import('@prisma/client');
      const { GeminiService } = await import('../../core/ai/gemini.service.js');
      const { NotificationService } = await import('../../modules/notification/notification.service.js');
      const { default: pLimit } = await import('p-limit');

      const { SubscriptionPlan } = await import('@prisma/client');

      const tenants = await db.system().tenant.findMany({
        where: { 
          status: 'active',
          subscriptionPlan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.ENTERPRISE] } // predictive analysis available for PRO and ENTERPRISE
        },
        select: { id: true, name: true }
      });

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
      const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      logger.info({ tenantCount: tenants.length, month: monthStr }, 'MONTHLY_AI_STRATEGY: Starting bulk analysis (Concurrency: 3)');

      const limit = pLimit(3);
      const jobs = tenants.map((t: any) => limit(async () => {
        try {
          const tId = t.id;
          const tenantDb = db.forTenant(tId);

          // AGGREGATION [P2]: Efficient summarizing instead of raw row fetching
          const [
            totalAtt, validAtt, invalidAtt,
            totalPatrols, uniqueCPs,
            totalIncidents, incidentsBySeverity, incidentsByType,
            staffCount
          ] = await Promise.all([
            tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
            tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, isValid: true } }),
            tenantDb.attendanceRecord.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, isValid: false } }),
            
            tenantDb.patrolLog.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
            tenantDb.checkpoint.count({ where: { patrolLogs: { some: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } } } }),
            
            tenantDb.incident.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
            tenantDb.incident.groupBy({
              by: ['severity'],
              where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
              _count: { id: true }
            }),
            tenantDb.incident.groupBy({
              by: ['type'],
              where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
              _count: { id: true }
            }),
            
            tenantDb.staff.count({ where: { status: 'active' } })
          ]);

          // Fetch daily trends for AI context (Efficient aggregation via DB DATE_TRUNC)
          const dailyAttData = await db.withTenant(tId, async (tx) => tx.$queryRaw(Prisma.sql`
            SELECT DATE_TRUNC('day', created_at) as date, COUNT(id)::int as count
            FROM attendance_records
            WHERE created_at >= ${startOfLastMonth} 
              AND created_at <= ${endOfLastMonth}
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at) ASC
          `), { allowRaw: true, readOnly: true });
          
          const dailyPatrolData = await db.withTenant(tId, async (tx) => tx.$queryRaw(Prisma.sql`
            SELECT DATE_TRUNC('day', created_at) as date, COUNT(id)::int as count
            FROM patrol_logs
            WHERE created_at >= ${startOfLastMonth} 
              AND created_at <= ${endOfLastMonth}
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at) ASC
          `), { allowRaw: true, readOnly: true });

          const toDailyTrends = (rows: any[]): { date: string, count: number }[] => {
            return rows.map(r => {
              let d = '';
              try { 
                d = r.date ? new Date(r.date).toISOString().split('T')[0] ?? '' : ''; 
              } catch(e) {
                logger.warn({ date: r.date, error: e instanceof Error ? e.message : String(e) }, 'Failed to parse date in toDailyTrends (heavy worker)');
              }
              return { date: d || '', count: parseInt(r.count, 10) || 0 };
            }).slice(-31);
          };

          const insight = await GeminiService.analyzeMonthlyStrategy({
            tenantId: tId,
            month: monthStr,
            staffCount,
            attendanceStats: {
              total: totalAtt,
              validCount: validAtt,
              invalidCount: invalidAtt,
              dailyTrends: toDailyTrends(dailyAttData)
            },
            patrolStats: {
              total: totalPatrols,
              uniqueCheckpoints: uniqueCPs,
              dailyTrends: toDailyTrends(dailyPatrolData)
            },
            incidentStats: {
              total: totalIncidents,
              bySeverity: incidentsBySeverity.reduce((acc: any, curr: any) => ({ ...acc, [curr.severity]: curr._count.id }), {}),
              byType: incidentsByType.reduce((acc: any, curr: any) => ({ ...acc, [curr.type]: curr._count.id }), {})
            }
          });

          // Store insight in dedicated table instead of just AuditLog
          await tenantDb.monthlyStrategyInsight.upsert({
            where: { tenantId_month: { tenantId: tId, month: monthStr } },
            update: {
              summary: insight.summary,
              fraudRiskScore: insight.fraudRiskScore,
              fraudDetails: insight.fraudDetails as any,
              efficiencyScore: insight.efficiencyScore,
              topPerformers: insight.topPerformers as any,
              criticalIssues: insight.criticalIssues as any,
              recommendations: insight.recommendations as any,
              fullPayload: insight as any,
              createdAt: new Date()
            },
            create: {
              tenantId: tId,
              month: monthStr,
              summary: insight.summary,
              fraudRiskScore: insight.fraudRiskScore,
              fraudDetails: insight.fraudDetails as any,
              efficiencyScore: insight.efficiencyScore,
              topPerformers: insight.topPerformers as any,
              criticalIssues: insight.criticalIssues as any,
              recommendations: insight.recommendations as any,
              fullPayload: insight as any
            }
          });

          await NotificationService.emit({
            tenantId: tId,
            payload: {
              type: 'AI_STRATEGY_READY',
              title: `Báo cáo chiến lược tháng ${monthStr}`,
              message: insight.summary,
              metadata: { month: monthStr }
            }
          });

          logger.info({ tenantId: tId }, 'MONTHLY_AI_STRATEGY: Insight generated and stored');
        } catch (err: any) {
          logger.error({ err: err.message, tenantId: t.id }, 'MONTHLY_AI_STRATEGY: Failed for tenant');
        }
      }));

      await Promise.all(jobs);
      return { processedTenants: tenants.length };
    }
    case 'AUDIT_LOG_CLEANUP': {
      logger.info('AUDIT_LOG_CLEANUP job started');
      const { AuditService } = await import('../../core/audit/audit.service.js');
      const count = await AuditService.pruneLogs(job.data.retentionDays || 180);
      return { prunedCount: count };
    }
    default:
      throw new Error(`Unknown heavy job type: ${type}`);
  }
};

export const initHeavyWorker = async () => {
  if (!_heavyWorker) {
    _heavyWorker = createWorker('heavy-jobs', heavyProcessor, 3);
    
    _heavyWorker.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'HeavyWorker encountered an error - BullMQ will attempt to keep it running');
    });

    _heavyWorker.on('closed', () => {
      logger.warn('HeavyWorker closed. This usually happens on shutdown or critical failure.');
    });
  }

  logger.info('✅ Heavy worker initialized (Concurrency: 3, Autorun: true)');
};

export const closeHeavyWorker = async () => {
  if (_heavyWorker) {
    logger.info('🛑 Closing Heavy Worker...');
    await _heavyWorker.close();
    _heavyWorker = null;
    logger.info('✅ Heavy Worker closed');
  }
};
