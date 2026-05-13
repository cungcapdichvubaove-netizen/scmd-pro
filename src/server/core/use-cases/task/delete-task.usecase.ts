import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';

export class DeleteTaskUseCase extends BaseUseCase<string, void> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, id: string): Promise<void> {
    const { tenantId, userId } = context;

    const existingTask = await db.forTenant(tenantId).task.findFirst({
      where: { id, tenantId }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    await db.forTenant(tenantId).task.delete({
      where: { id, tenantId }
    });

    await AuditService.logSensitiveChange(
      userId,
      tenantId,
      'TASK_DELETED',
      `task/${id}`,
      { title: existingTask.title, status: existingTask.status, assigneeId: existingTask.assigneeId },
      null
    );
  }
}
