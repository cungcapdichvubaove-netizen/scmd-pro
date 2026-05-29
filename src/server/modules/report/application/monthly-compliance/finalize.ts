import { db } from '../../../../core/db/prisma.js';

import type { MonthlyComplianceFinalizeInput } from './contracts.js';

export async function finalizeMonthlyComplianceReport(input: MonthlyComplianceFinalizeInput) {
  return db.withTenant(input.tenantId, async (tx: any) => {
    const report = await tx.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.reportId,
      },
      include: {
        penaltyItems: true,
      },
    });

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    if (report.status === 'SUPERSEDED') {
      throw new Error('REPORT_SUPERSEDED_AND_IMMUTABLE');
    }

    if (report.status === 'FINALIZED') {
      return report;
    }

    const violationIds = report.penaltyItems
      .map((item: { violationEventId: string | null }) => item.violationEventId)
      .filter(Boolean);

    const violations = violationIds.length > 0
      ? await tx.violationEvent.findMany({
          where: {
            tenantId: input.tenantId,
            id: { in: violationIds },
          },
          select: {
            evidence: true,
          },
        })
      : [];

    const incidentIds = new Set<string>();
    for (const violation of violations) {
      const evidence = violation.evidence && typeof violation.evidence === 'object'
        ? violation.evidence as Record<string, any>
        : null;
      if (typeof evidence?.incidentId === 'string' && evidence.incidentId) {
        incidentIds.add(evidence.incidentId);
      }
    }

    if (incidentIds.size > 0) {
      await tx.incidentEvidence.updateMany({
        where: {
          tenantId: input.tenantId,
          incidentId: { in: [...incidentIds] },
          OR: [
            { isReportLocked: false },
            { lockedByReportId: report.id },
          ],
        },
        data: {
          isReportLocked: true,
          lockedByReportId: report.id,
          lockedAt: new Date(),
        },
      });
    }

    await tx.penaltyItem.updateMany({
      where: {
        tenantId: input.tenantId,
        reportId: report.id,
      },
      data: {
        status: 'FINALIZED',
      },
    });

    const finalizedAt = new Date();
    const updated = await tx.monthlyAcceptanceReport.update({
      where: { id: report.id },
      data: {
        status: 'FINALIZED',
        finalizedAt,
        finalizedBy: input.actorId,
        summary: {
          ...((report.summary as Record<string, any> | null) ?? {}),
          finalizedNotes: input.notes ?? null,
        },
      },
    });

    if (report.previousRevisionId) {
      await tx.monthlyAcceptanceReport.update({
        where: { id: report.previousRevisionId },
        data: {
          status: 'SUPERSEDED',
          supersededAt: finalizedAt,
          supersededBy: input.actorId,
          supersededByReportId: report.id,
        },
      });
    }

    if (report.scorecardId) {
      await tx.vendorScorecard.update({
        where: { id: report.scorecardId },
        data: { status: 'FINALIZED' },
      });
    }

    return updated;
  });
}
