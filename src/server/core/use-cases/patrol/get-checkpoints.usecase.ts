import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';

export class GetCheckpointsUseCase extends BaseUseCase<{ cursor?: string; limit?: number | 'all' } | undefined, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED: tenantId missing');
  }

  protected async internalExecute(context: SecurityContext, params?: { cursor?: string; limit?: number | 'all' }): Promise<any> {
    if (params?.limit === 'all') {
      return await PatrolRepository.getAllCheckpointsByTenant(context.tenantId);
    }
    const limit = (typeof params?.limit === 'number') ? params.limit : 50;
    return await PatrolRepository.getCheckpointsByTenant(context.tenantId, params?.cursor, limit);
  }
}
