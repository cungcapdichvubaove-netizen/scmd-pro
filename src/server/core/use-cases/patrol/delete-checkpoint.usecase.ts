import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';

export class DeleteCheckpointUseCase extends BaseUseCase<string, { success: boolean }> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, id: string): Promise<{ success: boolean }> {
    const existing = await PatrolRepository.getCheckpointById(context.tenantId, id);
    if (!existing) throw new Error('Checkpoint not found');
    if ((existing as { tenantId: string }).tenantId !== context.tenantId) throw new Error('Cross-tenant access denied');

    await PatrolRepository.deleteCheckpoint(context.tenantId, id);

    await AuditService.logSensitiveChange(
      context.userId,
      context.tenantId,
      'DELETE_CHECKPOINT',
      `checkpoint/${id}`,
      existing,
      null
    );

    return { success: true };
  }
}
