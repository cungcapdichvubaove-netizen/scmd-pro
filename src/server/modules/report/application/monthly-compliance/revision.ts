import { db } from '../../../../core/db/prisma.js';

import type { MonthlyComplianceRevisionInput } from './contracts.js';

export async function createMonthlyComplianceRevision(input: MonthlyComplianceRevisionInput) {
  return db.withTenant(input.tenantId, async (tx: any) => {
    const report = await tx.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.reportId,
      },
    });

    if (!report) {
      throw new Error('REPORT_NOT_FOUND');
    }

    if (report.status !== 'FINALIZED') {
      throw new Error('REPORT_REVISION_REQUIRES_FINALIZED_SOURCE');
    }

    const existingDraftRevision = await tx.monthlyAcceptanceReport.findFirst({
      where: {
        tenantId: input.tenantId,
        previousRevisionId: report.id,
        status: 'DRAFT',
      },
    });

    if (existingDraftRevision) {
      return existingDraftRevision;
    }

    const revision = await tx.monthlyAcceptanceReport.create({
      data: {
        tenantId: report.tenantId,
        vendorId: report.vendorId,
        contractId: report.contractId,
        siteId: report.siteId,
        month: report.month,
        status: 'DRAFT',
        scorecardId: report.scorecardId,
        revisionNumber: report.revisionNumber + 1,
        revisionRootId: report.revisionRootId ?? report.id,
        previousRevisionId: report.id,
        generatedAt: new Date(),
        generatedBy: input.actorId,
        finalizedAt: null,
        finalizedBy: null,
        totalPenaltyAmount: report.totalPenaltyAmount,
        totalConfirmedViolations: report.totalConfirmedViolations,
        totalPendingViolations: report.totalPendingViolations,
        contractVersionId: report.contractVersionId,
        summary: {
          ...((report.summary as Record<string, unknown> | null) ?? {}),
          revisionSourceReportId: report.id,
          revisionReason: input.notes ?? null,
        },
        contractSnapshot: report.contractSnapshot,
        vendorSnapshot: report.vendorSnapshot,
        siteSnapshot: report.siteSnapshot,
        slaPolicySnapshot: report.slaPolicySnapshot,
        penaltyPolicySnapshot: report.penaltyPolicySnapshot,
        scoreFormulaVersion: report.scoreFormulaVersion,
        violationSnapshots: report.violationSnapshots,
        evidenceSnapshots: report.evidenceSnapshots,
        penaltyCalculationDetails: report.penaltyCalculationDetails,
        generatedDataHash: report.generatedDataHash,
      },
    });

    const penaltyItems = await tx.penaltyItem.findMany({
      where: {
        tenantId: input.tenantId,
        reportId: report.id,
      },
    });

    if (penaltyItems.length > 0) {
      await tx.penaltyItem.createMany({
        data: penaltyItems.map((item: any) => ({
          tenantId: item.tenantId,
          reportId: revision.id,
          violationEventId: item.violationEventId,
          penaltyRuleId: item.penaltyRuleId,
          vendorId: item.vendorId,
          contractId: item.contractId,
          siteId: item.siteId,
          type: item.type,
          status: 'SUGGESTED',
          baseAmount: item.baseAmount,
          unit: item.unit,
          quantity: item.quantity,
          graceApplied: item.graceApplied,
          capApplied: item.capApplied,
          finalAmount: item.finalAmount,
          amount: item.amount,
          reason: item.reason,
          calculationDetail: item.calculationDetail,
          contractVersionSnapshot: item.contractVersionSnapshot,
          metadata: item.metadata,
        })),
      });
    }

    return revision;
  });
}
