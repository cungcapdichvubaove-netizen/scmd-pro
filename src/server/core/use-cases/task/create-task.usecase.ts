import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';

interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
}

export class CreateTaskUseCase extends BaseUseCase<CreateTaskRequest, unknown> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, request: CreateTaskRequest): Promise<unknown> {
    const { tenantId, userId: staffId } = context;
    const { title, description, status, priority, dueDate, assigneeId } = request;

    if (!title) {
      throw new Error('Title is required');
    }

    const task = await db.forTenant(tenantId).task.create({
      data: {
        tenantId,
        title,
        description,
        status: status || 'PENDING',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        createdBy: staffId
      }
    });

    await AuditService.log({
      userId: staffId,
      tenantId,
      action: 'TASK_CREATED',
      resource: `task/${task.id}`,
      payload: { title, priority: task.priority, assigneeId },
      status: 'SUCCESS'
    });

    if (assigneeId) {
      const { NotificationService } = await import('../../../modules/notification/notification.service.js');
      await NotificationService.send({
        tenantId,
        userId: assigneeId,
        title: 'Công việc mới được giao',
        message: `Bạn được giao công việc: ${title}`,
        type: 'TASK_ASSIGNED',
        metadata: { taskId: task.id }
      });
    }

    return task;
  }
}
