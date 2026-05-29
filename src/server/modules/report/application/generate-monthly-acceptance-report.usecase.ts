import { SecurityContext } from '../../../core/architecture/types.js';
import { complianceScopeSchema } from '../report.schema.js';
import { generateMonthlyComplianceSnapshot } from './monthly-compliance.shared.js';

export class GenerateMonthlyAcceptanceReportUseCase {
  async execute(ctx: SecurityContext, input: unknown) {
    const parsed = complianceScopeSchema.parse(input);
    return generateMonthlyComplianceSnapshot({
      tenantId: ctx.tenantId,
      month: parsed.month,
      vendorId: parsed.vendorId,
      contractId: parsed.contractId ?? null,
      siteId: parsed.siteId ?? null,
      actorId: ctx.userId,
    });
  }
}
