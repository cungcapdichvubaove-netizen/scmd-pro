import { SecurityContext } from '../../../core/architecture/types.js';
import { finalizeMonthlyComplianceReport } from './monthly-compliance.shared.js';
import { assertClientDisputeDecisionAuthority } from './report-authorization.shared.js';

export class FinalizeMonthlyAcceptanceReportUseCase {
  async execute(ctx: SecurityContext, input: { reportId: string; notes?: string | null }) {
    assertClientDisputeDecisionAuthority(ctx);
    return finalizeMonthlyComplianceReport({
      tenantId: ctx.tenantId,
      reportId: input.reportId,
      actorId: ctx.userId,
      notes: input.notes ?? null,
    });
  }
}
