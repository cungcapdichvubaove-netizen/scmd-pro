import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole, CreateCheckpointDTO } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { Checkpoint } from '../../../../server/domain/entities.js';
import { z } from 'zod';
import { db } from '../../db/prisma.js';

const updateCheckpointSchema = z.object({
  name: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  siteId: z.string().uuid().optional(),
  guardPostId: z.string().uuid().optional(),
  qr_hash: z.string().optional(),
  check_items: z.array(z.unknown()).optional(),
});

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

    const validated = updateCheckpointSchema.parse(data);

    const resolvedSiteId = validated.siteId ?? (existing as any).siteId ?? undefined;
    const resolvedGuardPostId = validated.guardPostId ?? (existing as any).guardPostId ?? undefined;

    if (resolvedSiteId || resolvedGuardPostId) {
      await db.withTenant(context.tenantId, async (tx: any) => {
        if (resolvedSiteId) {
          const site = await tx.site.findFirst({ where: { id: resolvedSiteId }, select: { id: true, status: true } });
          if (!site) throw new Error('SITE_NOT_FOUND');
          if (site.status !== 'ACTIVE') throw new Error('SITE_INACTIVE_CANNOT_BIND_CHECKPOINT');
        }
        if (resolvedGuardPostId) {
          const guardPost = await tx.guardPost.findFirst({ where: { id: resolvedGuardPostId }, select: { id: true, siteId: true, status: true } });
          if (!guardPost) throw new Error('GUARD_POST_NOT_FOUND');
          if (guardPost.status !== 'ACTIVE') throw new Error('GUARD_POST_INACTIVE');
          if (resolvedSiteId && guardPost.siteId !== resolvedSiteId) throw new Error('GUARD_POST_SITE_MISMATCH');
        }
      });
    }

    const updated = await PatrolRepository.updateCheckpoint(context.tenantId, id, validated) as Checkpoint;

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
