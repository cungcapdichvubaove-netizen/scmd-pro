import { Request, Response, NextFunction } from 'express';
import { NotificationRepository } from './notification.repository.js';
import { logger } from '../../core/logger/index.js';
import { z } from 'zod';

export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId as string;
      const notifications = await NotificationRepository.findByTenant(tenantId);
      
      return res.json(notifications);
    } catch (err) {
      logger.error({ err }, 'Failed to list notifications');
      return next(err);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
      const tenantId = (req as any).user.tenantId as string;

      await NotificationRepository.markAsRead(id, tenantId);
      
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Failed to mark notification as read');
      return next(err);
    }
  }

  /**
   * POST /api/notifications/mark-all-read
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId as string;
      const userId = (req as any).user.id as string;

      await NotificationRepository.markAllAsRead(tenantId, userId);
      
      return res.json({ success: true });
    } catch (err) {
      logger.error({ err }, 'Failed to mark all notifications as read');
      return next(err);
    }
  }
}
