import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { QueueService } from '../../../core/queue/index.js';
import { exportMonthlyAcceptanceReportSchema } from '../report.schema.js';

export class QueueMonthlyAcceptanceExportUseCase {
  async execute(ctx: SecurityContext, reportId: string, input: unknown) {
    const parsed = exportMonthlyAcceptanceReportSchema.parse(input);
    const tenantDb = db.forTenant(ctx.tenantId);

    const report = await tenantDb.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: ctx.tenantId,
        id: reportId,
      },
    });

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    if (report.status !== 'FINALIZED') {
      throw new Error('REPORT_EXPORT_REQUIRES_FINALIZED_STATUS');
    }

    const type = parsed.format === 'pdf'
      ? 'EXPORT_MONTHLY_ACCEPTANCE_PDF'
      : 'EXPORT_MONTHLY_ACCEPTANCE_EXCEL';

    const job = await QueueService.addJob(type, {
      type,
      tenantId: ctx.tenantId,
      reportId,
      userId: ctx.userId,
      format: parsed.format,
    });

    await tenantDb.monthlyAcceptanceReport.update({
      where: { id: reportId },
      data: parsed.format === 'pdf'
        ? { exportPdfJobId: String(job.id) }
        : { exportExcelJobId: String(job.id) },
    });

    return { jobId: job.id, status: 'queued', format: parsed.format };
  }
}
