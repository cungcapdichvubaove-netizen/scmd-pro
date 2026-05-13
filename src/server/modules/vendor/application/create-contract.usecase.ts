import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { VendorRepository } from '../vendor.repository.js';
import { contractSchema, ContractDTO } from '../vendor.schema.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { Contract } from '@prisma/client';

export class CreateContractUseCase extends BaseUseCase<ContractDTO, Contract> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: ContractDTO): Promise<Contract> {
    const validated = contractSchema.parse(data);
    const contract = await VendorRepository.createContract(context, validated);

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_CONTRACT',
      resource: `vendor/${validated.vendorId}/contract/${contract.id}`,
      payload: { vendorId: validated.vendorId },
      status: 'SUCCESS'
    });

    return contract;
  }
}
