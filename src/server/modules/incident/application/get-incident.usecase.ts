import { SecurityContext } from '../../../core/architecture/types.js';
import { db as pgDb } from '../../../core/db/prisma.js';
import { CacheManager } from '../../../core/cache/manager.js';
import { NotFoundError } from '../../../core/errors/domain.error.js';

export class GetIncidentUseCase {
  async execute(ctx: SecurityContext, id: string) {
    const cacheKey = `incident:detail:${id}`;

    return await CacheManager.wrap(cacheKey, async () => {
      const incident = await pgDb.forTenant(ctx.tenantId).incident.findUnique({
        where: { id },
        include: {
          reporter: { select: { fullName: true, username: true } },
          assignee: { select: { fullName: true, username: true } }
        }
      });
      
      if (!incident) throw new NotFoundError('Không tìm thấy sự cố');
      
      return incident;
    }, 600); // 10 minutes cache for details
  }
}
