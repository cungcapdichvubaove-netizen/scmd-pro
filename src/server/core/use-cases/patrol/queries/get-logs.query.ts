import { BaseUseCase } from '../../../architecture/usecase.js';
import { SecurityContext } from '../../../architecture/types.js';
import { PatrolRepository } from '../../../../modules/patrol/repositories/patrol.repository.js';

export class GetLogsQuery extends BaseUseCase<{ cursor?: string; limit?: number; view?: string } | undefined, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    // Basic auth check, tenant isolation handled in repository via withTenant
    if (!context.userId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, params?: { cursor?: string; limit?: number; view?: string }): Promise<any> {
    const limit = params?.limit || 50;
    return await PatrolRepository.getLogsByTenant(context, params?.cursor, limit, params?.view);
  }
}
