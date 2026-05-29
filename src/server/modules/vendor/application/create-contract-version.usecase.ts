import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { contractVersionCreateSchema, ContractVersionCreateDTO, contractVersionParamsSchema } from '../vendor.schema.js';
import { VendorRepository } from '../vendor.repository.js';

export class CreateContractVersionUseCase extends BaseUseCase<{ contractId: string; data: ContractVersionCreateDTO }, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected override async validate(request: { contractId: string; data: ContractVersionCreateDTO }): Promise<void> {
    contractVersionParamsSchema.pick({ contractId: true }).parse({ contractId: request.contractId });
    contractVersionCreateSchema.parse(request.data);
  }

  protected async internalExecute(context: SecurityContext, request: { contractId: string; data: ContractVersionCreateDTO }): Promise<any> {
    return await VendorRepository.createContractVersion(context, request.contractId, request.data);
  }
}
