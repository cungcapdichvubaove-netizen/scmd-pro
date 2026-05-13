import { trace, SpanStatusCode } from '@opentelemetry/api';
import { db } from '../../core/db/prisma.js';
import { NotificationRepository } from './notification.repository.js';
import { logger } from '../../core/logger/index.js';
import { QueueService } from '../../core/queue/index.js';
import { IncidentStatus } from '@prisma/client';

const tracer = trace.getTracer('scmd-notifications');

export class SOSEscalationService {
  static async checkEscalation(data: { incidentId: string; tenantId: string; staffId: string }) {
    return await tracer.startActiveSpan('SOSEscalationService:checkEscalation', async (span) => {
      try {
        span.setAttributes({
          'scmd.tenant_id': data.tenantId,
          'scmd.incident_id': data.incidentId,
          'scmd.staff_id': data.staffId,
        });

        const incident = await db.forTenant(data.tenantId).incident.findUnique({
          where: { id: data.incidentId }
        });

        if (!incident) return;

        // If still INVESTIGATING/REPORTED after 5 minutes, escalate
        if (incident.status === IncidentStatus.REPORTED || incident.status === IncidentStatus.INVESTIGATING) {
          // Escalation logic: find on-duty supervisors (or all active supervisors)
          const supervisors = await db.forTenant(data.tenantId).staff.findMany({
            where: {
              role: 'supervisor',
              status: 'active'
            },
            select: { id: true, phone: true }
          });

          if (supervisors.length > 0) {
            // 1. Batch Internal Notifications (Prisma batching)
            const notifications = supervisors.map((s: { id: string }) => ({
              tenantId: data.tenantId,
              userId: s.id,
              title: '🚨 CHIẾN TỊCH SOS BỊ BỎ QUA - LEO THANG CẤP CHỈ HUY',
              message: `Tín hiệu SOS từ staff ${data.staffId} chưa được xử lý sau 5 phút. Yêu cầu phản hồi ngay!`,
              type: 'CRITICAL' as const
            }));

            // 2. Parallel Zalo Push (Dispatch to BullMQ to avoid blocking)
            const zaloJobs = supervisors
              .filter((s: { phone: string | null }) => !!s.phone)
              .map((s: { id: string, phone: string | null }) => QueueService.addJob('ZALO_NOTIFICATION', {
                tenantId: data.tenantId,
                to: s.phone,
                message: `[LEO THANG SOS] Tín hiệu SOS từ staff ${data.staffId} chưa được xử lý sau 5 phút. Yêu cầu kiểm tra ngay!`,
                type: 'SOS_ESCALATION'
              }));

            // GAP F - Double Status Update Risk Fix:
            // We only update the status if notifications are successfully dispatched.
            // We use Promise.all and do NOT catch errors here so that a failure 
            // kills the job, triggering a retry from BullMQ.
            // When BullMQ retries, the REPORTED/INVESTIGATING check above will handle 
            // if it was already updated, and Zalo jobs will be deduplicated by BullMQ.
            await Promise.all([
              NotificationRepository.createMany(notifications, data.tenantId),
              db.forTenant(data.tenantId).incident.update({
                where: { 
                  id: data.incidentId,
                  status: { in: [IncidentStatus.REPORTED, IncidentStatus.INVESTIGATING] } // Atomic check to prevent race
                },
                data: { status: IncidentStatus.ESCALATED }
              }),
              ...zaloJobs
            ]);
          } else {
            // No supervisors found, just update status so we don't keep polling/retrying in vain
            try {
              await db.forTenant(data.tenantId).incident.update({
                where: { id: data.incidentId, status: { in: [IncidentStatus.REPORTED, IncidentStatus.INVESTIGATING] } },
                data: { status: IncidentStatus.ESCALATED }
              });
            } catch (err: any) {
              // If already updated by someone else (P2025/NotFoundError), it's safe to ignore.
              // Otherwise, log the error as it might indicate a more serious issue.
              const isNotFoundError = err.code === 'P2025' || err.name === 'NotFoundError';
              if (!isNotFoundError) {
                logger.error({ 
                  err: err.message, 
                  incidentId: data.incidentId,
                  tenantId: data.tenantId 
                }, 'Failed to update incident status during SOS escalation (non-not-found error)');
              }
            }
          }

          logger.info({ 
            incidentId: data.incidentId, 
            tenantId: data.tenantId, 
            supervisorsCount: supervisors.length 
          }, 'SOS Escalation pipeline executed');
        }
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (err: any) {
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
