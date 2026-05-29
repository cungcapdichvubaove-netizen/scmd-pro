import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { monthlyAcceptanceVersionBindingSchema } from '../report.schema.js';

function buildVersionBindingResponse(report: any) {
  return {
    reportId: report.id,
    tenantId: report.tenantId,
    month: report.month,
    vendorId: report.vendorId,
    contractId: report.contractId,
    siteId: report.siteId,
    status: report.status,
    contractVersionId: report.contractVersionId ?? null,
    contractSnapshot: report.contractSnapshot ?? null,
    summaryContractVersionId: typeof report.summary === 'object' && report.summary
      ? (report.summary as Record<string, unknown>).contractVersionId ?? null
      : null,
  };
}

export class GetMonthlyAcceptanceVersionBindingUseCase {
  async execute(ctx: SecurityContext, reportId: string) {
    const parsed = monthlyAcceptanceVersionBindingSchema.parse({ reportId });

    const report = await db.withTenant(ctx.tenantId, async (tx) => tx.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: ctx.tenantId,
        id: parsed.reportId,
      },
      select: {
        id: true,
        tenantId: true,
        month: true,
        vendorId: true,
        contractId: true,
        siteId: true,
        status: true,
        contractVersionId: true,
        contractSnapshot: true,
        summary: true,
      },
    }));

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    return buildVersionBindingResponse(report);
  }
}
