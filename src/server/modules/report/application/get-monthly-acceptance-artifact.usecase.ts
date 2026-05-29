import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';

export class GetMonthlyAcceptanceArtifactUseCase {
  async execute(ctx: SecurityContext, reportId: string, attachmentId: string) {
    const report = await db.withTenant(ctx.tenantId, async (tx) => tx.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: ctx.tenantId,
        id: reportId,
        OR: [
          { exportPdfAttachmentId: attachmentId },
          { exportExcelAttachmentId: attachmentId },
        ],
      },
    }));

    if (!report) {
      throw new Error('REPORT_ARTIFACT_NOT_FOUND');
    }

    const attachment = await db.withTenant(ctx.tenantId, async (tx) => tx.attachment.findFirst({
      where: {
        tenantId: ctx.tenantId,
        id: attachmentId,
        category: 'REPORT',
      },
    }));

    if (!attachment) {
      throw new Error('ATTACHMENT_NOT_FOUND');
    }

    return attachment;
  }
}
