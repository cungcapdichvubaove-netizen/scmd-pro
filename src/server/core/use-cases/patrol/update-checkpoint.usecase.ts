import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, CreateCheckpointDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { Checkpoint } from '../../../../server/domain/entities.js';

export class UpdateCheckpointUseCase extends BaseUseCase<{ id: string; data: Partial<CreateCheckpointDTO> }, Checkpoint> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, request: { id: string; data: Partial<CreateCheckpointDTO> }): Promise<Checkpoint> {
    const { id, data } = request;
    const existing = await PatrolRepository.getCheckpointById(context.tenantId, id);
    if (!existing) throw new Error('Checkpoint not found');
    if ((existing as { tenantId: string }).tenantId !== context.tenantId) throw new Error('Cross-tenant access denied');

    const updated = await PatrolRepository.updateCheckpoint(context.tenantId, id, data) as Checkpoint;

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'UPDATE_CHECKPOINT',
      `checkpoint/${id}`,
      existing,
      updated
    );

    return updated;
  }
}
