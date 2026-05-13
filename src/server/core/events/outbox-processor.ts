import { IncidentStatus, IncidentSeverity } from '@prisma/client';
import { db } from '../../core/db/prisma.js';
import { logger, loggerContext } from '../../core/logger/index.js';
import { SocketService } from '../../infra/socket/service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { NotificationService } from '../../modules/notification/notification.service.js';

export class OutboxProcessor {
  private static consecutiveErrors = 0;
  private static maxConsecutiveErrors = 5;

  /**
   * Polls the EventOutbox for pending events and processes them.
   */
  static async processPendingEvents() {
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      logger.debug('Skipping outbox polling due to consecutive DB errors.');
      return;
    }

    try {
      const allNotifications: any[] = [];

      // FIX [H-04]: Perform claiming and processing in a stable manner.
      // We wrap the batch acquisition in a transaction to hold the locks until we update the status.
      // Processing is done individually to minimize transaction duration for each event.
      
      const pendingEvents = await db.system().$transaction(async (tx: any) => {
        const records = await tx.$queryRaw`
          SELECT * FROM "event_outbox" 
          WHERE "status" = 'PENDING' 
          ORDER BY "created_at" ASC 
          LIMIT 50 
          FOR UPDATE SKIP LOCKED
        ` as any[];
        
        if (!records || records.length === 0) return [];

        // Mark them as 'PROCESSING' within the SAME transaction to claim them securely
        const ids = records.map(r => r.id);
        await tx.eventOutbox.updateMany({
          where: { id: { in: ids } },
          data: { status: 'PROCESSING' }
        });
        
        return records;
      }, { timeout: 5000 });

      if (pendingEvents.length === 0) return;

      for (const event of pendingEvents) {
        // Individual processing - we use withTenant for each to ensure RLS session is set correctly
        await db.withTenant(event.tenantId, async (tx: any) => {
          await loggerContext.run({ 
            traceId: event.traceId || undefined, 
            tenantId: event.tenantId 
          }, async () => {
            try {
              const notifications = await this.handleEvent(event, tx);
              allNotifications.push(...notifications);

              await tx.eventOutbox.update({
                where: { id: event.id },
                data: { status: 'PROCESSED', processedAt: new Date() }
              });
              logger.info({ eventId: event.id, type: event.eventType }, 'Successfully processed outbox event');
            } catch (err: any) {
              logger.error({ err, eventId: event.id }, 'Failed to process outbox event');
              
              const attempts = (event.attempts || 0) + 1;
              const maxRetries = 5;
              const isDeadLetter = attempts >= maxRetries;
              
              await tx.eventOutbox.update({
                where: { id: event.id },
                data: { 
                  attempts,
                  status: isDeadLetter ? 'DEAD_LETTER' : 'PENDING',
                  lastError: err.message
                }
              });
            }
          });
        }, { timeout: 8000 });
      }

      // Output emitted notifications
      if (allNotifications.length > 0) {
        setImmediate(() => {
          try {
            const io = SocketService.getIO();
            if (io) {
              allNotifications.forEach(n => {
                io.to(n.room).emit(n.event, n.data);
              });
            }
          } catch (err) {
            logger.error({ err }, 'Failed to emit socket events from OutboxProcessor');
          }
        });
      }

      this.consecutiveErrors = 0;
    } catch (err: any) {
      const isConnectionError = 
        err.code === 'P1001' || 
        err.name === 'PrismaClientInitializationError' || 
        err.name === 'PrismaClientKnownRequestError' ||
        (err.message && err.message.includes('connect to the database'));

      if (isConnectionError) {
        this.consecutiveErrors++;
        // Use debug or trace so it doesn't pollute standard ERROR logs constantly
        logger.debug('DB Connection error during outbox polling (will backoff)');
        return;
      }
      logger.error({ err }, 'Error during outbox polling');
    }
  }

  /**
   * Replay strategy for Dead Letter events.
   * This can be triggered manually by an admin via a special API.
   */
  static async replayEvent(eventId: string) {
    logger.warn({ eventId }, 'Replaying dead-letter event');
    await db.system().eventOutbox.update({
      where: { id: eventId },
      data: { status: 'PENDING', attempts: 0, lastError: null }
    });
  }

  private static async handleEvent(event: any, tx: any) {
    const payload = event.payload as any;
    const actorId = payload._actorId;
    const deferredNotifications: any[] = [];

    // Strict Event Versioning Guard
    const SUPPORTED_VERSIONS = ['1.0', '1.1'];
    if (!SUPPORTED_VERSIONS.includes(event.version)) {
      throw new Error(`INCOMPATIBLE_EVENT_VERSION: Received v${event.version}, expected [${SUPPORTED_VERSIONS.join(',')}]`);
    }

    switch (event.eventType) {
      case 'STAFF_CREATED':
        await AuditService.log({
          userId: actorId,
          tenantId: event.tenantId,
          action: 'CREATE_STAFF',
          resource: `staff/${payload.staffId}`,
          status: 'SUCCESS',
          payload: { staffId: payload.staffId, fullName: payload.fullName }
        }, tx);

        // Sync to Socket.io for real-time dashboards (Deferred)
        deferredNotifications.push({ 
          room: `tenant:${event.tenantId}`, 
          event: 'DATA_UPDATED', 
          data: { 
            type: 'DATA_UPDATED', 
            entity: 'staff', 
            data: {
              id: payload.staffId,
              tenantId: event.tenantId,
              fullName: payload.fullName,
              role: payload.role,
              status: payload.status || 'Active',
              updatedAt: new Date().toISOString()
            } 
          } 
        });

        const n1 = await NotificationService.create({
          tenantId: event.tenantId,
          title: 'Nhân viên mới',
          message: `Nhân viên mới đã được tạo: ${payload.fullName || 'Thành công'}`,
          type: 'INFO',
          metadata: { staffId: payload.staffId }
        }, tx);
        deferredNotifications.push({ room: `tenant:${event.tenantId}`, event: 'notification', data: n1 });
        break;

      case 'STAFF_UPDATED':
        await AuditService.logSensitiveChange(actorId, event.tenantId, 'UPDATE_STAFF', `staff/${payload.staffId}`, payload.before, payload.after, undefined, tx);
        
        // Sync to Socket.io (Deferred)
        deferredNotifications.push({ 
          room: `tenant:${event.tenantId}`, 
          event: 'DATA_UPDATED', 
          data: { 
            type: 'DATA_UPDATED', 
            entity: 'staff', 
            data: {
              id: payload.staffId,
              tenantId: event.tenantId,
              fullName: payload.after.fullName,
              role: payload.after.role,
              status: payload.after.status,
              updatedAt: new Date().toISOString()
            } 
          } 
        });

        const n2 = await NotificationService.create({
          tenantId: event.tenantId,
          title: 'Cập nhật nhân viên',
          message: `Thông tin nhân viên ${payload.fullName || payload.staffId} đã được cập nhật.`,
          type: 'INFO',
          metadata: { staffId: payload.staffId }
        }, tx);
        deferredNotifications.push({ room: `tenant:${event.tenantId}`, event: 'notification', data: n2 });
        break;

      case 'STAFF_DELETED':
        await AuditService.logSensitiveChange(actorId, event.tenantId, 'DELETE_STAFF', `staff/${payload.staffId}`, payload.before, null, undefined, tx);
        
        // Remove from Socket.io clients (Deferred)
        deferredNotifications.push({ 
          room: `tenant:${event.tenantId}`, 
          event: 'DATA_DELETED', 
          data: { 
            type: 'DATA_DELETED', 
            entity: 'staff', 
            data: {
              id: payload.staffId
            } 
          } 
        });
        
        const n3 = await NotificationService.create({
          tenantId: event.tenantId,
          title: 'Xóa nhân viên',
          message: `Một nhân viên vừa bị xóa khỏi hệ thống.`,
          type: 'WARNING',
          metadata: { staffId: payload.staffId }
        }, tx);
        deferredNotifications.push({ room: `tenant:${event.tenantId}`, event: 'notification', data: n3 });
        break;
      
      case 'SOS_SIGNAL':
        await AuditService.log({
          userId: actorId,
          tenantId: event.tenantId,
          action: 'SOS_SIGNAL',
          resource: `staff/${actorId}`,
          status: 'SUCCESS',
          payload
        }, tx);

        const incident = await tx.incident.create({
          data: {
            tenantId: event.tenantId,
            staffId: actorId,
            type: 'SOS',
            severity: IncidentSeverity.CRITICAL,
            description: `Tín hiệu SOS khẩn cấp được phát ra`,
            location: payload.location,
            status: IncidentStatus.REPORTED
          }
        });

        const { QueueService } = await import('../queue/index.js');
        // Delay escalation check by 5 minutes 
        // GAP G - Deterministic Job ID for escalation:
        // We use incidentId as a stable salt to ensure idempotency even across worker replicas.
        await QueueService.addJob('sos-escalation-check', {
          incidentId: incident.id,
          tenantId: event.tenantId,
          staffId: actorId
        }, `escalation:${incident.id}`, { delay: 5 * 60 * 1000 });

        const nSOS = await NotificationService.create({
          tenantId: event.tenantId,
          title: '🚨 Tín hiệu SOS SOS SOS',
          message: `Nhân viên vừa kích hoạt tín hiệu khẩn cấp! Vui lòng kiểm tra ngay.`,
          type: 'SOS',
          metadata: { ...payload, actorId, isSecurityAlert: true }
        }, tx);
        deferredNotifications.push({ room: `tenant:${event.tenantId}`, event: 'notification', data: nSOS });
        break;

      case 'AI_ANOMALY_DETECTED':
        await AuditService.log({
          userId: 'SYSTEM_AI',
          tenantId: event.tenantId,
          action: 'AI_ANOMALY',
          resource: payload.resource || 'unknown',
          status: 'SUCCESS',
          payload
        }, tx);

        const nAI = await NotificationService.create({
          tenantId: event.tenantId,
          title: '🚨 Phát hiện bất thường AI',
          message: payload.reason || 'AI đã phát hiện hành vi đáng ngờ trong phiên tuần tra.',
          type: 'AI_ANOMALY',
          metadata: { ...payload, isSecurityAlert: true }
        }, tx);
        deferredNotifications.push({ room: `tenant:${event.tenantId}`, event: 'notification', data: nAI });
        break;

      case 'NOTIFICATION_EMIT':
        // Xử lý emit socket trì hoãn từ NotificationService.send
        const notification = await tx.notification.findUnique({
          where: { id: payload.notificationId }
        });
        if (notification) {
          deferredNotifications.push({ 
            room: payload.userId ? `user:${payload.userId}` : `tenant:${event.tenantId}`, 
            event: 'notification', 
            data: notification 
          });
        }
        break;

      default:
        logger.debug({ type: event.eventType }, 'No specific handler for event type');
    }

    return deferredNotifications;
  }
}
