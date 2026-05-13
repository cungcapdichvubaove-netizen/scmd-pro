
import { SecurityContext } from '../../../core/architecture/types.js';
import { IncidentRepository } from '../incident.repository.js';
import { IncidentStatus } from '@prisma/client';

export interface ListIncidentsInput {
  status?: string;
  type?: string;
  limit?: number;
  cursor?: string;
  view?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ListIncidentsUseCase {
  private repository: IncidentRepository;

  constructor() {
    this.repository = new IncidentRepository();
  }

  async execute(ctx: SecurityContext, input: ListIncidentsInput) {
    const { status, type, limit = 50, cursor, view, sortBy, sortOrder = 'desc' } = input;
    
    const isMobile = view === 'mobile';
    
    // Normalize status string to Prisma Enum
    let statusEnum: IncidentStatus | undefined;
    if (status) {
      const normalized = status.toUpperCase() as IncidentStatus;
      if (Object.values(IncidentStatus).includes(normalized)) {
        statusEnum = normalized;
      }
    }

    const { items, hasMore, limit: actualLimit } = await this.repository.list(ctx.tenantId, {
      status: statusEnum,
      type,
      limit,
      cursor,
      sortBy,
      sortOrder,
      isMobile
    });

    return {
      items,
      hasMore,
      limit: actualLimit,
      nextCursor: hasMore ? (items.length > 0 ? items[items.length - 1].id : null) : null
    };
  }
}
