import { db } from '../../core/db/prisma.js';
import { logger } from '../../core/logger/index.js';

export interface CreateNotificationInput {
  tenantId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SOS' | 'AI_ANOMALY' | 'TASK_ASSIGNED' | 'TASK_COMPLETED';
  metadata?: any;
}

export class NotificationRepository {
  static async create(data: CreateNotificationInput, tx?: any) {
    const client = tx || db.forTenant(data.tenantId);
    try {
      return await client.notification.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId || null,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata || {},
          status: 'UNREAD'
        }
      });
    } catch (err) {
      logger.error({ err, tenantId: data.tenantId }, 'Failed to create notification');
      throw err;
    }
  }

  static async createMany(items: CreateNotificationInput[], tenantId: string, tx?: any) {
    const client = tx || db.forTenant(tenantId);
    try {
      return await client.notification.createMany({
        data: items.map(item => ({
          tenantId: item.tenantId,
          userId: item.userId || null,
          title: item.title,
          message: item.message,
          type: item.type,
          metadata: item.metadata || {},
          status: 'UNREAD'
        }))
      });
    } catch (err) {
      logger.error({ err, tenantId }, 'Failed to batch create notifications');
      throw err;
    }
  }

  static async findByTenant(tenantId: string, limit = 50) {
    return await db.forTenant(tenantId).notification.findMany({
      where: { status: 'UNREAD' },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  static async markAsRead(id: string, tenantId: string) {
    return await db.forTenant(tenantId).notification.updateMany({
      where: { id },
      data: { 
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  static async markAllAsRead(tenantId: string, userId?: string) {
    return await db.forTenant(tenantId).notification.updateMany({
      where: { 
        userId: userId || null,
        status: 'UNREAD'
      },
      data: { 
        status: 'READ',
        readAt: new Date()
      }
    });
  }
}
