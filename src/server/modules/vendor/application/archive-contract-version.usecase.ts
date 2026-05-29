import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { contractVersionParamsSchema } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';

export class ArchiveContractVersionUseCase extends BaseUseCase<{ contractId: string; versionId: string }, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: { contractId: string; versionId: string }): Promise<void> {
    contractVersionParamsSchema.required({ versionId: true }).parse(request);
  }

  protected async internalExecute(context: SecurityContext, request: { contractId: string; versionId: string }): Promise<any> {
    const result = await VendorRepository.archiveContractVersion(context, request.contractId, request.versionId);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CONTRACT_VERSION_ARCHIVE',
      resource: `contracts/${request.contractId}/versions/${request.versionId}`,
      payload: { wasActive: result.wasActive },
      status: 'SUCCESS',
    });
    return result;
  }
}
