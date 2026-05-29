import { SecurityContext } from '../../../core/architecture/types.js';
import { NotFoundError } from '../../../core/errors/domain.error.js';
import { IncidentRepository } from '../incident.repository.js';

export class GetIncidentUseCase {
  async execute(ctx: SecurityContext, id: string) {
    const repository = new IncidentRepository();
    const incident = await repository.findById(ctx, id);
    if (!incident) throw new NotFoundError('Khong tim thay su co');
    return incident;
  }
}
