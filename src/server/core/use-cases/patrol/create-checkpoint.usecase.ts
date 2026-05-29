import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, CreateCheckpointDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { Checkpoint } from '../../../../server/domain/entities.js';
import { z } from 'zod';
import { db } from '../../db/prisma.js';

const createCheckpointSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  siteId: z.string().uuid().optional(),
  guardPostId: z.string().uuid().optional(),
  qr_hash: z.string().optional(),
  check_items: z.array(z.unknown()).optional(),
});

export class CreateCheckpointUseCase extends BaseUseCase<CreateCheckpointDTO, Checkpoint> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (context.role !== UserRole.TENANT_ADMIN && context.role !== UserRole.SUPER_ADMIN) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, request: CreateCheckpointDTO): Promise<Checkpoint> {
    const data = createCheckpointSchema.parse(request);

    if (data.siteId || data.guardPostId) {
      await db.withTenant(context.tenantId, async (tx: any) => {
        if (data.siteId) {
          const site = await tx.site.findFirst({ where: { id: data.siteId }, select: { id: true, status: true } });
          if (!site) throw new Error('SITE_NOT_FOUND');
          if (site.status !== 'ACTIVE') throw new Error('SITE_INACTIVE_CANNOT_BIND_CHECKPOINT');
        }
        if (data.guardPostId) {
          const guardPost = await tx.guardPost.findFirst({ where: { id: data.guardPostId }, select: { id: true, siteId: true, status: true } });
          if (!guardPost) throw new Error('GUARD_POST_NOT_FOUND');
          if (guardPost.status !== 'ACTIVE') throw new Error('GUARD_POST_INACTIVE');
          if (data.siteId && guardPost.siteId !== data.siteId) throw new Error('GUARD_POST_SITE_MISMATCH');
        }
      });
    }

    const checkpoint = await PatrolRepository.createCheckpoint(context.tenantId, data) as Checkpoint;

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
