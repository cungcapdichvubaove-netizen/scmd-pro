import { Contract } from '@prisma/client';
import { BaseUseCase } from '../../../core/architecture/usecase.js';
import { SecurityContext, UserRole } from '../../../core/architecture/types.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { VendorRepository } from '../vendor.repository.js';
import { ContractDTO } from '../vendor.schema.js';

export class UpdateContractUseCase extends BaseUseCase<{ id: string } & Partial<ContractDTO>, Contract> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (![UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN].includes(context.role as UserRole)) {
      throw new Error('FORBIDDEN_ACCESS');
    }
  }

  protected async internalExecute(context: SecurityContext, data: { id: string } & Partial<ContractDTO>): Promise<Contract> {
    const { id, ...updateData } = data;
    const contract = await VendorRepository.updateContract(context, id, updateData);
    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: updateData.status === 'ACTIVE' ? 'ACTIVATE_CONTRACT' : 'UPDATE_CONTRACT',
      resource: `contract/${contract.id}`,
      payload: updateData,
      status: 'SUCCESS',
    });
    return contract;
  }
}
