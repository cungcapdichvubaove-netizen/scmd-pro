import { NotificationRepository, CreateNotificationInput } from './notification.repository.js';
import { SocketService } from '../../infra/socket/service.js';
import { logger } from '../../core/logger/index.js';

export class NotificationService {
  /**
   * Creates a notification record in DB.
   * If tx is provided, it runs within that transaction.
   */
  static async create(input: CreateNotificationInput, tx?: any) {
    return await NotificationRepository.create(input, tx);
  }

  /**
   * Emits a notification via Socket.io.
   */
  static emit(input: { tenantId: string; userId?: string; payload: any }) {
    try {
      const io = SocketService.getIO();
      const room = input.userId 
        ? `user:${input.userId}` 
        : `tenant:${input.tenantId}`;

      io.to(room).emit('notification', {
        ...input.payload,
        timestamp: input.payload.createdAt || new Date().toISOString()
      });
      
      logger.debug({ tenantId: input.tenantId, type: input.payload.type }, 'Notification emitted via socket');
    } catch (err) {
      logger.warn({ err }, 'Failed to emit notification via socket');
    }
  }

  /**
   * Sends a notification immediately (DB + Socket).
   * Ưu tiên dùng Outbox Pattern nếu có transaction context để tránh race condition.
   */
  static async send(input: CreateNotificationInput, tx?: any) {
    const notification = await this.create(input, tx);
    
    if (tx) {
      // ✅ SCMB Pro Rule: Sử dụng Outbox Pattern cho sự kiện quan trọng trong giao dịch
      const { EventBus } = await import('../../core/events/event-bus.js');
      await EventBus.dispatch({
        type: 'NOTIFICATION_EMIT',
        version: '1.0',
        tenantId: input.tenantId,
        actorId: 'SYSTEM',
        payload: {
          notificationId: notification.id,
          userId: input.userId
        }
      }, tx);
    } else {
      setImmediate(() => this.emit({
        tenantId: input.tenantId,
        userId: input.userId,
        payload: notification
      }));
    }

    return notification;
  }

  /**
   * Helper: Lấy Metadata thông báo của Tenant có bộ nhớ đệm (Layered Cache)
   * Sửa lỗi [M-03]: Tránh gọi DB findUnique nhiều lần cho cùng 1 tenant trong 1 flow.
   */
  private static async getTenantNotificationMetadata(tenantId: string) {
    const { CacheManager } = await import('../../core/cache/manager.js');
    const { db } = await import('../../core/db/prisma.js');

    return await CacheManager.wrap(`tenant:notify_meta:${tenantId}`, async () => {
      const tenant = await db.system().tenant.findUnique({
        where: { id: tenantId },
        select: { featuresEnabled: true }
      });
      
      const admins = await db.forTenant(tenantId, { readOnly: true }).staff.findMany({
        where: { role: { in: ['admin', 'supervisor'] }, status: 'active' },
        select: { email: true, phone: true, fullName: true, id: true }
      });

      const settings = tenant?.featuresEnabled as any || {};
      const notifyConfig = settings?.notifications || { zalo: { enabled: true }, email: { enabled: false } };

      return { admins, notifyConfig };
    }, 60); // Cache 1 phút là đủ an toàn cho Metadata
  }

  /**
   * Specifically for critical security alerts (SOS, AI Anomaly)
   */
  static async sendSecurityAlert(tenantId: string, title: string, message: string, type: 'SOS' | 'AI_ANOMALY', metadata?: any) {
    if (type === 'AI_ANOMALY') {
      const { AlertAggregatorService } = await import('../../core/queue/aggregator.service.js');
      await AlertAggregatorService.addAlert({
        tenantId,
        staffId: metadata?.staffId || 'system',
        type,
        title,
        message,
        metadata
      });
      
      const n = await this.create({
        tenantId,
        title: `🚨 ${title}`,
        message,
        type,
        metadata: { ...metadata, isSecurityAlert: true }
      });

      // Notification Dispatch logic
      try {
        const { admins, notifyConfig } = await this.getTenantNotificationMetadata(tenantId);
        let zaloSent = false;

        // Try Zalo if enabled
        if (notifyConfig.zalo?.enabled !== false) {
          try {
            const { ZaloService } = await import('../../infra/zalo/service.js');
            await ZaloService.notifyAdmins(tenantId, `[AI CẢNH BÁO] ${title}: ${message}`, async () => admins);
            zaloSent = true;
          } catch (err) {
             logger.warn({ err }, 'Failed to send Zalo notification for AI Anomaly');
          }
        }

        // Try Email if configured and enabled, OR if Zalo failed
        if (notifyConfig.email?.enabled || (!zaloSent && notifyConfig.email?.smtpHost)) {
          try {
            const emails = admins.map((a: any) => a.email).filter(Boolean) as string[];
            if (emails.length > 0) {
              const { EmailService } = await import('../../infra/email/service.js');
              await EmailService.sendNotification(
                tenantId,
                notifyConfig.email,
                emails,
                `[AI CẢNH BÁO] ${title}`,
                message
              );
            }
          } catch (err) {
            logger.warn({ err }, 'Failed to send Email fallback for AI Anomaly');
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to process notifications for AI Anomaly');
      }

      return n;
    }

    const n = await this.send({
      tenantId,
      title: `🚨 ${title}`,
      message,
      type,
      metadata: {
        ...metadata,
        isSecurityAlert: true
      }
    });

    // SOS Dispatch Logic
    const sosStartTime = Date.now();
    try {
      const { admins, notifyConfig } = await this.getTenantNotificationMetadata(tenantId);

      // Notice: SOS ALWAYS sends to Zalo regardless of time-windows, but respects enablement toggle if false
      if (notifyConfig.zalo?.enabled !== false) {
        try {
          const { ZaloService } = await import('../../infra/zalo/service.js');
          await ZaloService.notifyAdmins(tenantId, `[SOS KHẨN CẤP] ${title}: ${message}`, async () => admins);
        } catch (zaloErr) {
          logger.warn({ err: zaloErr }, 'Failed to send Zalo notification for SOS');
          throw zaloErr; // to be caught by outer block for SLO metrics
        }
      } else {
        throw new Error('Zalo notification is disabled by tenant');
      }
    } catch (err) {
      const duration = Date.now() - sosStartTime;
      import('../../core/metrics.js').then(({ metrics }) => {
        metrics.recordSLO('sos_zalo_dispatch_duration', duration, {
          tenant_id: tenantId,
          outcome: 'error'
        });
        metrics.incrementCounter('sos_dispatch_errors', { tenant_id: tenantId });
      });
      
      // Fallback to Email
      try {
        const { admins, notifyConfig } = await this.getTenantNotificationMetadata(tenantId);
        
        if (notifyConfig.email?.smtpHost) {
          const emails = admins.map((a: any) => a.email).filter(Boolean) as string[];
          if (emails.length > 0) {
            const { EmailService } = await import('../../infra/email/service.js');
            await EmailService.sendNotification(
              tenantId,
              notifyConfig.email,
              emails,
              `[SOS KHẨN CẤP] ${title}`,
              message
            );
            logger.info('SOS Email fallback activated successfully.');
          }
        }
      } catch (emailErr) {
        logger.error({ err: emailErr }, 'Failed to send Email fallback for SOS');
      }

      // Also create an AuditLog so SLO_MONITORING can track it across replicas
      import('../../core/db/prisma.js').then(({ db }) => {
        db.forTenant(tenantId).auditLog.create({
          data: {
            userId: 'SYSTEM',
            action: 'SOS_DISPATCH',
            resource: 'ZaloService/EmailService',
            status: 'ERROR',
            timestamp: BigInt(Date.now()),
            payload: { error: String(err) }
          }
        }).catch((e: any) => logger.error({ err: e }, 'Failed to write AuditLog for SOS dispatch error'));
      });
      
      return n; 
    }

    const duration = Date.now() - sosStartTime;
    import('../../core/metrics.js').then(({ metrics }) => {
      metrics.recordSLO('sos_zalo_dispatch_duration', duration, {
        tenant_id: tenantId,
        outcome: 'success'
      });
    });

    return n;
  }
}


