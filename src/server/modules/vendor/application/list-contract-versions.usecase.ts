import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { contractVersionParamsSchema } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';

export class ListContractVersionsUseCase extends BaseUseCase<{ contractId: string }, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: { contractId: string }): Promise<void> {
    contractVersionParamsSchema.pick({ contractId: true }).parse(request);
  }

  protected async internalExecute(context: SecurityContext, request: { contractId: string }): Promise<any> {
    return await VendorRepository.listContractVersions(context, request.contractId);
  }
}
