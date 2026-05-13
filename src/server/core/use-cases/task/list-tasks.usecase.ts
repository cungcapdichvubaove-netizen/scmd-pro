import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';

interface ListTasksRequest {
  status?: string;
  assigneeId?: string;
  view?: string;
}

interface TaskWhereClause {
  tenantId: string;
  status?: string;
  assigneeId?: string;
}

export class ListTasksUseCase extends BaseUseCase<ListTasksRequest, unknown[]> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.tenantId) throw new Error('UNAUTHORIZED');
  }

  protected async internalExecute(context: SecurityContext, request: ListTasksRequest): Promise<unknown[]> {
    const { tenantId, userId: staffId, role } = context;
    const { status, assigneeId, view } = request;

    const query: TaskWhereClause = { tenantId };

    if (status) query.status = status;
    if (assigneeId) query.assigneeId = assigneeId;
    // Guard chỉ thấy task được giao cho mình
    if (role === UserRole.GUARD && !assigneeId) {
      query.assigneeId = staffId;
    }

    const isMobile = view === 'mobile';

    return await db.withTenant(tenantId, async (tx) => {
      return tx.task.findMany({
        where: query,
        orderBy: { createdAt: 'desc' },
        select: isMobile ? {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assigneeId: true
        } : undefined
      });
    }, { readOnly: true });
  }
}
