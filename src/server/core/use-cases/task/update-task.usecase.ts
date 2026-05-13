import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';

interface UpdateTaskRequest {
  id: string;
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
  }
}

export class UpdateTaskUseCase extends BaseUseCase<UpdateTaskRequest, unknown> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, request: UpdateTaskRequest): Promise<unknown> {
    const { tenantId, userId } = context;
    const { id, data } = request;
    const { title, description, status, priority, dueDate, assigneeId } = data;

    const existingTask = await db.forTenant(tenantId).task.findFirst({
      where: { id, tenantId }
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    const updatedTask = await db.forTenant(tenantId).task.update({
      where: { id, tenantId },
      data: {
        title: title ?? existingTask.title,
        description: description !== undefined ? description : existingTask.description,
        status: status ?? existingTask.status,
        priority: priority ?? existingTask.priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existingTask.dueDate,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : existingTask.assigneeId
      }
    });

    await AuditService.logSensitiveChange(
      userId,
      tenantId,
      'TASK_UPDATED',
      `task/${id}`,
      { status: existingTask.status, assigneeId: existingTask.assigneeId, priority: existingTask.priority },
      { status: updatedTask.status, assigneeId: updatedTask.assigneeId, priority: updatedTask.priority }
    );

    // Notify on reassignment
    if (assigneeId && assigneeId !== existingTask.assigneeId) {
      const { NotificationService } = await import('../../../modules/notification/notification.service.js');
      await NotificationService.send({
        tenantId,
        userId: assigneeId,
        title: 'Công việc mới được giao',
        message: `Bạn được giao công việc: ${updatedTask.title}`,
        type: 'TASK_ASSIGNED',
        metadata: { taskId: updatedTask.id }
      });
    }

    // Notify admin on completion
    if (status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      const { NotificationService } = await import('../../../modules/notification/notification.service.js');
      await NotificationService.send({
        tenantId,
        title: 'Công việc đã hoàn thành',
        message: `Công việc "${updatedTask.title}" đã được hoàn thành`,
        type: 'TASK_COMPLETED',
        metadata: { taskId: updatedTask.id, completedBy: userId }
      });
    }

    return updatedTask;
  }
}
