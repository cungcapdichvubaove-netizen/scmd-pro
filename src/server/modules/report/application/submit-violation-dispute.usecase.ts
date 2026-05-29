import { db } from '../../../core/db/prisma.js';
import { SecurityContext } from '../../../core/architecture/types.js';
import { submitViolationDisputeSchema } from '../report.schema.js';
import { assertVendorActorValueInScope } from '../../../shared/security/vendor-actor-scope.js';

export class SubmitViolationDisputeUseCase {
  async execute(ctx: SecurityContext, input: unknown) {
    const parsed = submitViolationDisputeSchema.parse(input);

    return db.withTenant(ctx.tenantId, async (tx) => {
      const violation = await tx.violationEvent.findFirst({
        where: {
          tenantId: ctx.tenantId,
          id: parsed.violationEventId,
        },
      });

      if (!violation) {
        throw new Error('VIOLATION_NOT_FOUND');
      }
      assertVendorActorValueInScope(ctx, {
        vendorId: violation.vendorId ?? null,
        contractId: violation.contractId ?? null,
        siteId: violation.siteId ?? null,
      });

      const report = parsed.reportId
        ? await tx.monthlyAcceptanceReport.findFirst({
            where: {
              tenantId: ctx.tenantId,
              id: parsed.reportId,
            },
          })
        : null;

      if (parsed.reportId && !report) {
        throw new Error('REPORT_NOT_FOUND');
      }
      if (report) {
        assertVendorActorValueInScope(ctx, {
          vendorId: report.vendorId,
          contractId: report.contractId ?? null,
          siteId: report.siteId ?? null,
        });
      }

      if (report?.status === 'FINALIZED') {
        throw new Error('REPORT_ALREADY_FINALIZED');
      }

      const dispute = await tx.violationDispute.create({
        data: {
          tenantId: ctx.tenantId,
          violationEventId: violation.id,
          reportId: report?.id ?? null,
          vendorId: violation.vendorId,
          contractId: violation.contractId,
          siteId: violation.siteId,
          submittedBy: ctx.userId,
          status: 'SUBMITTED',
          reason: parsed.reason,
          responseNote: parsed.responseNote ?? null,
          metadata: {
            previousViolationStatus: violation.status,
          },
        },
      });

      await tx.violationEvent.update({
        where: { id: violation.id },
        data: { status: 'DISPUTED' },
      });

      return dispute;
    });
  }
}
