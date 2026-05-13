import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';
import { ComplianceScore } from '@prisma/client';

export class ListComplianceScoresUseCase extends BaseUseCase<{view?: string}, ComplianceScore[]> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, input: {view?: string}): Promise<ComplianceScore[]> {
    return await VendorRepository.listComplianceScores(context, input.view);
  }
}
