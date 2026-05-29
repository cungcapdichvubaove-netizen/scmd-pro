import { SecurityContext } from '../../../core/architecture/types.js';
import { assertClientDisputeDecisionAuthority } from './report-authorization.shared.js';
import { createMonthlyComplianceRevision } from './monthly-compliance.shared.js';

export class CreateMonthlyAcceptanceRevisionUseCase {
  async execute(ctx: SecurityContext, input: { reportId: string; notes?: string | null }) {
    assertClientDisputeDecisionAuthority(ctx);
    return createMonthlyComplianceRevision({
      tenantId: ctx.tenantId,
      reportId: input.reportId,
      actorId: ctx.userId,
      notes: input.notes ?? null,
    });
  }
}
