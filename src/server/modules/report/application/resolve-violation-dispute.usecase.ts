import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { resolveViolationDisputeSchema } from '../report.schema.js';
import { generateMonthlyComplianceSnapshot } from './monthly-compliance.shared.js';
import { assertClientDisputeDecisionAuthority } from './report-authorization.shared.js';

const violationStatusByResolution: Record<string, string> = {
  CONFIRMED: 'CONFIRMED',
  WAIVED: 'WAIVED',
  PENALIZED: 'PENALIZED',
};

export class ResolveViolationDisputeUseCase {
  async execute(ctx: SecurityContext, disputeId: string, input: unknown) {
    assertClientDisputeDecisionAuthority(ctx);
    const parsed = resolveViolationDisputeSchema.parse(input);

    const result = await db.withTenant(ctx.tenantId, async (tx) => {
      const dispute = await tx.violationDispute.findFirst({
        where: {
          tenantId: ctx.tenantId,
          id: disputeId,
        },
      });

      if (!dispute) {
        throw new Error('DISPUTE_NOT_FOUND');
      }

      const violation = await tx.violationEvent.findFirst({
        where: {
          tenantId: ctx.tenantId,
          id: dispute.violationEventId,
        },
      });

      if (!violation) {
        throw new Error('VIOLATION_NOT_FOUND');
      }

      await tx.violationEvent.update({
        where: { id: violation.id },
        data: { status: violationStatusByResolution[parsed.resolution] },
      });

      if (dispute.reportId) {
        await tx.penaltyItem.updateMany({
          where: {
            tenantId: ctx.tenantId,
            reportId: dispute.reportId,
            violationEventId: violation.id,
          },
          data: {
            status: parsed.resolution === 'WAIVED' ? 'WAIVED' : 'CONFIRMED',
          },
        });
      }

      const updatedDispute = await tx.violationDispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolvedBy: ctx.userId,
          resolution: parsed.resolution,
          responseNote: parsed.responseNote,
        },
      });

      return { dispute: updatedDispute, violation };
    });

    if (!result.violation.vendorId) {
      throw new Error('VIOLATION_VENDOR_SCOPE_REQUIRED');
    }

    await generateMonthlyComplianceSnapshot({
      tenantId: ctx.tenantId,
      month: new Date(result.violation.occurredAt).toISOString().slice(0, 7),
      vendorId: result.violation.vendorId,
      contractId: result.violation.contractId ?? null,
      siteId: result.violation.siteId ?? null,
      actorId: ctx.userId,
    });

    return result.dispute;
  }
}
