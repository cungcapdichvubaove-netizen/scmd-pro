import { db } from '../../core/db/prisma.js';
import { NotificationService } from '../notification/notification.service.js';
import { logger } from '../../core/logger/index.js';

export class TaskReminderService {
  /**
   * Coordinator: Fetches all active tenants and dispatches individual jobs.
   */
  static async dispatchDeadlinesCheck() {
    logger.info('Dispatching task deadline check jobs (Fan-out)');
    try {
      const tenants = await db.system().tenant.findMany({
        where: { status: 'active' },
        select: { id: true }
      });

      const { getLightQueue } = await import('../../core/queue/index.js');
      const queue = getLightQueue();
      const jobs = tenants.map((tenant: any) => ({
        name: 'TASK_DEADLINE_CHECK_TENANT',
        data: {
          type: 'TASK_DEADLINE_CHECK_TENANT',
          tenantId: tenant.id
        }
      })).filter((j: any) => j.data.tenantId);

      if (jobs.length > 0) {
        await queue.addBulk(jobs);
      }

      logger.info({ tenantCount: tenants.length }, 'Dispatched deadline check jobs to queue');
      return { dispatched: tenants.length };
    } catch (err) {
      logger.error({ err }, 'Error dispatching task deadline jobs');
      throw err;
    }
  }

  /**
   * Worker logic: Processes deadlines for a single tenant.
   * Optimized with Promise.all and explicit RLS scoping.
   */
  static async processTenantDeadlines(tenantId: string) {
    const now = new Date();
    
    // SEC-NEW-7: Collect notification payloads outside of the transaction
    const pendingOverdueNotifications: any[] = [];
    const pendingDueSoonNotifications: any[] = [];
    
    const stats = await db.withTenant(tenantId, async (tx) => {
      // 1. Handle Overdue Tasks
      const overdueTasks = await tx.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        }
      });

      const overdueUpdates = [];
      for (const task of overdueTasks) {
        const metadata = (task.metadata as any) || {};
        const lastNotified = metadata.lastOverdueNotifiedAt ? new Date(metadata.lastOverdueNotifiedAt) : null;
        
        if (!lastNotified || (now.getTime() - lastNotified.getTime() > 24 * 60 * 60 * 1000)) {
          pendingOverdueNotifications.push(task);
          overdueUpdates.push(
            tx.task.update({
              where: { id: task.id },
              data: {
                metadata: {
                  ...metadata,
                  lastOverdueNotifiedAt: now.toISOString()
                }
              }
            })
          );
        }
      }

      // 2. Handle Due Soon Tasks
      const dueSoonDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dueSoonTasks = await tx.task.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: {
            gt: now,
            lt: dueSoonDate
          }
        }
      });

      const dueSoonUpdates = [];
      for (const task of dueSoonTasks) {
        const metadata = (task.metadata as any) || {};
        if (!metadata.lastDueSoonNotifiedAt) {
          pendingDueSoonNotifications.push(task);
          dueSoonUpdates.push(
            tx.task.update({
              where: { id: task.id },
              data: {
                metadata: {
                  ...metadata,
                  lastDueSoonNotifiedAt: now.toISOString()
                }
              }
            })
          );
        }
      }

      // Execute updates in parallel chunks if needed, but here we can just Promise.all
      // within the transaction to ensure atomicity for the tenant's batch.
      if (overdueUpdates.length > 0) await Promise.all(overdueUpdates);
      if (dueSoonUpdates.length > 0) await Promise.all(dueSoonUpdates);

      return {
        tenantId,
        overdueProcessed: overdueUpdates.length,
        dueSoonProcessed: dueSoonUpdates.length
      };
    });

    // Dispatch notifications after the transaction commits successfully
    await Promise.all([
      ...pendingOverdueNotifications.map(task => this.sendOverdueNotification(tenantId, task)),
      ...pendingDueSoonNotifications.map(task => this.sendDueSoonNotification(tenantId, task))
    ]);

    return stats;
  }

  /**
   * @deprecated Use dispatchDeadlinesCheck and processTenantDeadlines for scalability.
   */
  static async checkDeadlines() {
    return this.dispatchDeadlinesCheck();
  }

  private static async sendOverdueNotification(tenantId: string, task: any) {
    const title = `⚠️ Nhiệm vụ quá hạn: ${task.title}`;
    const message = `Nhiệm vụ "${task.title}" đã quá hạn vào lúc ${task.dueDate.toLocaleString('vi-VN')}. Vui lòng cập nhật trạng thái.`;
    
    await NotificationService.send({
      tenantId,
      userId: task.assigneeId || undefined, // Send to assignee if exists, else to all admins (userId: null)
      title,
      message,
      type: 'WARNING',
      metadata: {
        taskId: task.id,
        entityType: 'TASK',
        status: 'OVERDUE'
      }
    });
  }

  private static async sendDueSoonNotification(tenantId: string, task: any) {
    const title = `⏰ Nhiệm vụ sắp đến hạn: ${task.title}`;
    const message = `Nhiệm vụ "${task.title}" sắp đến hạn vào lúc ${task.dueDate.toLocaleString('vi-VN')}.`;
    
    await NotificationService.send({
      tenantId,
      userId: task.assigneeId || undefined,
      title,
      message,
      type: 'INFO',
      metadata: {
        taskId: task.id,
        entityType: 'TASK',
        status: 'DUE_SOON'
      }
    });
  }
}
