import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { createWorker } from './index.js';
import { PDFClient } from '../../infra/pdf/client.js';
import { logger } from '../logger/index.js';

let _heavyWorker: any = null;

const heavyProcessor = async (job: any) => {
  const { type, url, options } = job.data;
  logger.info({ jobId: job.id, type }, 'HeavyWorker: Executing job');

  const createReportAttachment = async (params: {
    tenantId: string;
    reportId: string;
    fileName: string;
    fileType: string;
    content: Buffer;
    kind: 'pdf' | 'excel';
    generatedBy: string;
  }) => {
    const { ReportArtifactStorageService } = await import('../../modules/report/application/report-artifact-storage.service.js');
    return ReportArtifactStorageService.store({
      tenantId: params.tenantId,
      reportId: params.reportId,
      fileName: params.fileName,
      fileType: params.fileType,
      content: params.content,
      kind: params.kind,
      generatedBy: params.generatedBy,
    });
  };

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
        await db.withTenant(tenantId, async (tx) => tx.incident.update({
          where: { id: incidentId },
          data: { 
            severity: IncidentSeverity.HIGH, 
            type: result.classification,
            status: IncidentStatus.ESCALATED
          } // using enums
        }));

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
          await db.withTenant(tId, async (tenantDb) => {

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
            })
              .filter((item) => item.date)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-31);
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
          });
        } catch (err: any) {
          logger.error({ err: err.message, tenantId: t.id }, 'MONTHLY_AI_STRATEGY: Failed for tenant');
        }
      }));

      await Promise.all(jobs);
      return { processedTenants: tenants.length };
    }
    case 'MONTHLY_COMPLIANCE': {
      const { runMonthlyComplianceForAllTenants } = await import('../../modules/report/application/monthly-compliance.shared.js');
      return runMonthlyComplianceForAllTenants(job.data.month);
    }
    case 'EXPORT_MONTHLY_ACCEPTANCE_PDF': {
      const { db } = await import('../../core/db/prisma.js');
      const { jsPDF } = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule.default ?? autoTableModule) as any;

      const { tenantId, reportId } = job.data;
      const generatedBy = typeof job.data.userId === 'string' && job.data.userId ? job.data.userId : 'system';
      const tenant = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          contactPhone: true,
          ownerName: true,
          address: true,
        },
      });
      const report = await db.withTenant(tenantId, async (tx) => tx.monthlyAcceptanceReport.findFirst({
        where: { tenantId, id: reportId },
        include: { penaltyItems: true, disputes: true },
      }));
      if (!report) {
        throw new Error('REPORT_NOT_FOUND');
      }

      const summary = report.summary && typeof report.summary === 'object'
        ? report.summary as Record<string, any>
        : {};
      const totals = summary.totals && typeof summary.totals === 'object'
        ? summary.totals as Record<string, any>
        : {};
      const vendorSnapshot = report.vendorSnapshot && typeof report.vendorSnapshot === 'object'
        ? report.vendorSnapshot as Record<string, any>
        : {};
      const contractSnapshot = report.contractSnapshot && typeof report.contractSnapshot === 'object'
        ? report.contractSnapshot as Record<string, any>
        : null;
      const siteSnapshot = report.siteSnapshot && typeof report.siteSnapshot === 'object'
        ? report.siteSnapshot as Record<string, any>
        : null;
      const violationSnapshots = Array.isArray(report.violationSnapshots)
        ? report.violationSnapshots as Array<Record<string, any>>
        : [];
      const evidenceSnapshots = Array.isArray(report.evidenceSnapshots)
        ? report.evidenceSnapshots as Array<Record<string, any>>
        : [];
      const penaltyDetails = report.penaltyCalculationDetails && typeof report.penaltyCalculationDetails === 'object'
        ? report.penaltyCalculationDetails as Record<string, any>
        : {};
      const openDisputes = report.disputes.filter((item: any) => !['RESOLVED', 'CLOSED'].includes(String(item.status || '').toUpperCase()));
      const incidentEvidenceIds = new Set(
        evidenceSnapshots
          .map((item) => typeof item.incidentId === 'string' ? item.incidentId : null)
          .filter(Boolean),
      );
      const incidents = incidentEvidenceIds.size > 0
        ? await db.withTenant(tenantId, async (tx) => tx.incident.findMany({
            where: { tenantId, id: { in: [...incidentEvidenceIds] } },
            select: {
              id: true,
              type: true,
              severity: true,
              status: true,
              reportedAt: true,
              resolvedAt: true,
              closedAt: true,
              responseDueAt: true,
              resolutionDueAt: true,
              slaBreached: true,
              description: true,
            },
            orderBy: { reportedAt: 'desc' },
          }))
        : [];
      const incidentSlaWithin = incidents.filter((item: any) => item.slaBreached !== true).length;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(12);
        doc.text(title, marginX, y);
      };
      const safeText = (value: unknown) => String(value ?? '');

      doc.setFontSize(16);
      doc.text('SCMD PRO - BIÊN BẢN NGHIỆM THU THÁNG', marginX, 42);
      doc.setFontSize(10);
      doc.text(`Kỳ báo cáo: ${report.month}`, marginX, 62);
      doc.text(`Trạng thái: ${report.status}`, marginX, 76);
      doc.text(`Mã báo cáo: ${report.id}`, marginX, 90);
      doc.text(`Lần revision: ${report.revisionNumber}`, marginX, 104);

      autoTable(doc, {
        startY: 118,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 0: { cellWidth: 170 }, 1: { cellWidth: pageWidth - 250 } },
        body: [
          ['Thông tin khách hàng', safeText(tenant?.name)],
          ['Người đại diện khách hàng', safeText(tenant?.ownerName)],
          ['Email khách hàng', safeText(tenant?.contactEmail)],
          ['Điện thoại khách hàng', safeText(tenant?.contactPhone)],
          ['Địa chỉ khách hàng', safeText(tenant?.address)],
          ['Thông tin nhà thầu', safeText(vendorSnapshot?.name)],
          ['Hợp đồng áp dụng', safeText(contractSnapshot?.name || contractSnapshot?.code || report.contractId)],
          ['Site áp dụng', safeText(siteSnapshot?.name || report.siteId)],
          ['Người lập', safeText(report.generatedBy)],
          ['Người duyệt', safeText(report.finalizedBy)],
          ['Ngày duyệt', safeText(report.finalizedAt ? new Date(report.finalizedAt).toISOString() : '')],
        ],
      });

      addSectionTitle('Tổng hợp nghiệm thu', ((doc as any).lastAutoTable?.finalY || 160) + 18);
      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 160) + 26,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4 },
        head: [['Chỉ tiêu', 'Giá trị']],
        body: [
          ['Tổng số ca theo hợp đồng', safeText(totals.shiftRequired ?? totals.shiftSchedulesContract ?? '')],
          ['Tổng số ca thực tế đạt', safeText(totals.shiftActualQualified ?? totals.shiftSchedulesActual ?? '')],
          ['Ca thiếu người / đi muộn / sai vị trí', `${safeText(totals.shiftMissingCount ?? '')} / ${safeText(totals.shiftLateCount ?? '')} / ${safeText(totals.shiftWrongPositionCount ?? '')}`],
          ['Tổng tuyến tuần tra bắt buộc', safeText(totals.patrolSessions ?? 0)],
          ['Tỷ lệ hoàn thành tuần tra', `${safeText(summary.patrolRate ?? 0)}%`],
          ['Tổng sự cố', safeText(totals.incidents ?? incidents.length)],
          ['Tỷ lệ xử lý đúng SLA', `${incidents.length > 0 ? Math.round((incidentSlaWithin / incidents.length) * 10000) / 100 : 100}%`],
          ['Danh sách vi phạm đã xác nhận', safeText(report.totalConfirmedViolations)],
          ['Danh sách vi phạm đang tranh chấp', safeText(openDisputes.length || report.totalPendingViolations)],
          ['Điểm vendor scorecard', safeText(summary.totalScore ?? 0)],
          ['Tổng tiền phạt đề xuất', safeText(report.totalPenaltyAmount)],
        ],
      });

      addSectionTitle('Danh sách sự cố', ((doc as any).lastAutoTable?.finalY || 280) + 18);
      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 280) + 26,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        head: [['Mã', 'Loại', 'Mức độ', 'Trạng thái', 'SLA', 'Mô tả']],
        body: incidents.length > 0
          ? incidents.map((item: any) => [
              safeText(item.id),
              safeText(item.type),
              safeText(item.severity),
              safeText(item.status),
              item.slaBreached === true ? 'TRỄ SLA' : 'ĐÚNG SLA',
              safeText(item.description),
            ])
          : [['', 'Không có sự cố', '', '', '', '']],
      });

      addSectionTitle('Vi phạm đã xác nhận', ((doc as any).lastAutoTable?.finalY || 400) + 18);
      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 400) + 26,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        head: [['Mã vi phạm', 'Loại', 'Mức độ', 'Trạng thái', 'Tiền phạt']],
        body: violationSnapshots.filter((item) => ['CONFIRMED', 'PENALIZED'].includes(String(item.normalizedStatus || '').toUpperCase())).map((item) => [
          safeText(item.id),
          safeText(item.violationType),
          safeText(item.severity),
          safeText(item.normalizedStatus || item.status),
          safeText(item.penaltyAmount),
        ]),
      });

      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 520) + 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        head: [['Vi phạm đang tranh chấp', 'Trạng thái', 'Lý do', 'Phản hồi']],
        body: openDisputes.length > 0
          ? openDisputes.map((item: any) => [
              safeText(item.violationEventId),
              safeText(item.status),
              safeText(item.reason),
              safeText(item.responseNote),
            ])
          : [['Không có', '', '', '']],
      });

      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 620) + 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        head: [['Chi tiết tính phạt', 'Giá trị']],
        body: [
          ['Tổng tiền phạt', safeText(report.totalPenaltyAmount)],
          ['Số mục phạt', safeText(report.penaltyItems.length)],
          ['Công thức score', safeText(report.scoreFormulaVersion)],
          ['Bảng penalty chi tiết', safeText(JSON.stringify(penaltyDetails))],
        ],
      });

      autoTable(doc, {
        startY: ((doc as any).lastAutoTable?.finalY || 700) + 20,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        head: [['Phụ lục bằng chứng', 'Incident', 'Payload']],
        body: evidenceSnapshots.length > 0
          ? evidenceSnapshots.map((item) => [
              safeText(item.violationEventId),
              safeText(item.incidentId),
              safeText(JSON.stringify(item.payload ?? {})),
            ])
          : [['Không có bằng chứng snapshot', '', '']],
      });

      const finalY = ((doc as any).lastAutoTable?.finalY || 760) + 20;
      doc.setFontSize(10);
      const conclusion = report.status === 'FINALIZED'
        ? 'Kết luận nghiệm thu: Hồ sơ đã được khóa sổ và sẵn sàng sử dụng trong họp nghiệm thu.'
        : 'Kết luận nghiệm thu: Hồ sơ đang ở trạng thái nháp, cần duyệt/chốt trước khi phát hành chính thức.';
      doc.text(doc.splitTextToSize(conclusion, pageWidth - (marginX * 2)), marginX, finalY);

      const buffer = Buffer.from(doc.output('arraybuffer'));
      const attachment = await createReportAttachment({
        tenantId,
        reportId,
        fileName: `monthly-acceptance-${report.month}-${report.vendorId}.pdf`,
        fileType: 'application/pdf',
        content: buffer,
        kind: 'pdf',
        generatedBy,
      });

      return { attachmentId: attachment.id };
    }
    case 'EXPORT_MONTHLY_ACCEPTANCE_EXCEL': {
      const { db } = await import('../../core/db/prisma.js');
      const { tenantId, reportId } = job.data;
      const safeText = (value: unknown) => String(value ?? '');
      const tenant = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          contactPhone: true,
          ownerName: true,
          address: true,
        },
      });
      const generatedBy = typeof job.data.userId === 'string' && job.data.userId ? job.data.userId : 'system';
      const report = await db.withTenant(tenantId, async (tx) => tx.monthlyAcceptanceReport.findFirst({
        where: { tenantId, id: reportId },
        include: { penaltyItems: true, disputes: true },
      }));
      if (!report) {
        throw new Error('REPORT_NOT_FOUND');
      }

      const summary = report.summary && typeof report.summary === 'object'
        ? report.summary as Record<string, any>
        : {};
      const totals = summary.totals && typeof summary.totals === 'object'
        ? summary.totals as Record<string, any>
        : {};
      const vendorSnapshot = report.vendorSnapshot && typeof report.vendorSnapshot === 'object'
        ? report.vendorSnapshot as Record<string, any>
        : {};
      const contractSnapshot = report.contractSnapshot && typeof report.contractSnapshot === 'object'
        ? report.contractSnapshot as Record<string, any>
        : null;
      const siteSnapshot = report.siteSnapshot && typeof report.siteSnapshot === 'object'
        ? report.siteSnapshot as Record<string, any>
        : null;
      const violationSnapshots = Array.isArray(report.violationSnapshots)
        ? report.violationSnapshots as Array<Record<string, any>>
        : [];
      const evidenceSnapshots = Array.isArray(report.evidenceSnapshots)
        ? report.evidenceSnapshots as Array<Record<string, any>>
        : [];

      const rows = [
        ['SECTION', 'FIELD', 'VALUE'],
        ['THÔNG_TIN_CHUNG', 'Thông tin khách hàng', tenant?.name ?? ''],
        ['THÔNG_TIN_CHUNG', 'Thông tin nhà thầu', safeText(vendorSnapshot?.name)],
        ['THÔNG_TIN_CHUNG', 'Hợp đồng áp dụng', safeText(contractSnapshot?.name || contractSnapshot?.code || report.contractId)],
        ['THÔNG_TIN_CHUNG', 'Site áp dụng', safeText(siteSnapshot?.name || report.siteId)],
        ['THÔNG_TIN_CHUNG', 'Kỳ báo cáo', report.month],
        ['THÔNG_TIN_CHUNG', 'Người lập', safeText(report.generatedBy)],
        ['THÔNG_TIN_CHUNG', 'Người duyệt', safeText(report.finalizedBy)],
        ['THÔNG_TIN_CHUNG', 'Ngày duyệt', safeText(report.finalizedAt ? new Date(report.finalizedAt).toISOString() : '')],
        ['TỔNG_HỢP', 'Tổng số ca theo hợp đồng', safeText(totals.shiftRequired ?? totals.shiftSchedulesContract ?? '')],
        ['TỔNG_HỢP', 'Tổng số ca thực tế đạt', safeText(totals.shiftActualQualified ?? totals.shiftSchedulesActual ?? '')],
        ['TỔNG_HỢP', 'Ca thiếu người', safeText(totals.shiftMissingCount ?? '')],
        ['TỔNG_HỢP', 'Ca đi muộn', safeText(totals.shiftLateCount ?? '')],
        ['TỔNG_HỢP', 'Ca sai vị trí', safeText(totals.shiftWrongPositionCount ?? '')],
        ['TỔNG_HỢP', 'Tổng tuyến tuần tra bắt buộc', safeText(totals.patrolSessions ?? 0)],
        ['TỔNG_HỢP', 'Tỷ lệ hoàn thành tuần tra', safeText(summary.patrolRate ?? 0)],
        ['TỔNG_HỢP', 'Tổng sự cố', safeText(totals.incidents ?? '')],
        ['TỔNG_HỢP', 'Tỷ lệ xử lý đúng SLA', safeText(summary.incidentRate ?? 0)],
        ['TỔNG_HỢP', 'Vi phạm đã xác nhận', String(report.totalConfirmedViolations)],
        ['TỔNG_HỢP', 'Vi phạm đang tranh chấp', String(report.totalPendingViolations)],
        ['TỔNG_HỢP', 'Điểm vendor scorecard', safeText(summary.totalScore ?? 0)],
        ['TỔNG_HỢP', 'Tổng tiền phạt', String(report.totalPenaltyAmount)],
        [],
        ['SECTION', 'VIOLATION_ID', 'TYPE', 'STATUS', 'SEVERITY', 'AMOUNT'],
        ...violationSnapshots.map((item) => [
          'VIOLATIONS',
          safeText(item.id),
          safeText(item.violationType),
          safeText(item.normalizedStatus || item.status),
          safeText(item.severity),
          safeText(item.penaltyAmount),
        ]),
        [],
        ['SECTION', 'DISPUTE_VIOLATION_ID', 'STATUS', 'REASON', 'RESPONSE_NOTE'],
        ...report.disputes.map((item: any) => [
          'DISPUTES',
          safeText(item.violationEventId),
          safeText(item.status),
          safeText(item.reason),
          safeText(item.responseNote),
        ]),
        [],
        ['SECTION', 'PENALTY_VIOLATION_ID', 'TYPE', 'STATUS', 'AMOUNT', 'REASON'],
        ...report.penaltyItems.map((item: any) => [
          'PENALTIES',
          safeText(item.violationEventId),
          safeText(item.type),
          safeText(item.status),
          String(item.amount),
          safeText(item.reason),
        ]),
        [],
        ['SECTION', 'EVIDENCE_VIOLATION_ID', 'INCIDENT_ID', 'PAYLOAD'],
        ...evidenceSnapshots.map((item) => [
          'EVIDENCE',
          safeText(item.violationEventId),
          safeText(item.incidentId),
          safeText(JSON.stringify(item.payload ?? {})),
        ]),
      ];

      const htmlEscape = (value: unknown) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      const sheetRows = rows.map((row) => {
        if (!row.length) {
          return '<tr><td colspan="6" style="height:12px;border:none"></td></tr>';
        }
        const isHeader = row[0] === 'SECTION';
        return `<tr>${row.map((cell: string) => `<${isHeader ? 'th' : 'td'}>${htmlEscape(cell)}</${isHeader ? 'th' : 'td'}>`).join('')}</tr>`;
      }).join('');
      const excelWorkbook = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; }
    h1 { color: #0d1324; font-size: 20px; text-transform: uppercase; }
    .meta { color: #475569; font-size: 12px; margin-bottom: 14px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #0d1324; color: #ffffff; font-weight: 700; border: 1px solid #1e293b; padding: 8px; }
    td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; mso-number-format:"@"; }
  </style>
</head>
<body>
  <h1>Báo cáo nghiệm thu tháng</h1>
  <div class="meta">Khách hàng: ${htmlEscape(tenant?.name ?? '')} · Nhà thầu: ${htmlEscape(vendorSnapshot?.name ?? '')} · Kỳ báo cáo: ${htmlEscape(report.month)}</div>
  <table>${sheetRows}</table>
</body>
</html>`;

      const attachment = await createReportAttachment({
        tenantId,
        reportId,
        fileName: `monthly-acceptance-${report.month}-${report.vendorId}.xls`,
        fileType: 'application/vnd.ms-excel;charset=utf-8;',
        content: Buffer.from(`\ufeff${excelWorkbook}`, 'utf8'),
        kind: 'excel',
        generatedBy,
      });

      return { attachmentId: attachment.id };
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
