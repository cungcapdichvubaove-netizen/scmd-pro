import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, CreateCheckpointDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { Checkpoint } from '../../../../server/domain/entities.js';

export class CreateCheckpointUseCase extends BaseUseCase<CreateCheckpointDTO, Checkpoint> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, request: CreateCheckpointDTO): Promise<Checkpoint> {
    const checkpoint = await PatrolRepository.createCheckpoint(context.tenantId, request) as Checkpoint;

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_CHECKPOINT',
      resource: `checkpoint/${checkpoint.id}`,
      status: 'SUCCESS',
      payload: { name: checkpoint.name }
    });

    return checkpoint;
  }
}
