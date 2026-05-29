import { createWorker } from './index.js';
import { OutboxProcessor } from '../events/outbox-processor.js';
import { logger } from '../logger/index.js';
import { PatrolSyncService } from '../../modules/patrol/patrol.sync.service.js';
import { UpdatePerformanceMetricsUseCase } from '../../modules/staff/application/update-performance-metrics.usecase.js';
import { buildBulkUpdateCaseSql } from '../db/sql-builders.js';

let _lightWorker: any = null;

const lightProcessor = async (job: any) => {
  const { type, ...data } = job.data;
  logger.info({ jobId: job.id, type }, 'LightWorker: Executing job');

  switch (type) {
    case 'OUTBOX_POLLING':
      return await OutboxProcessor.processPendingEvents();
    case 'OFFLINE_SYNC_SCAN':
      return await PatrolSyncService.processOfflineScan(data);
    case 'OFFLINE_SYNC_COMPLETE':
      return await PatrolSyncService.processOfflineComplete(data);
    case 'STAFF_METRICS_UPDATE':
      return await (new UpdatePerformanceMetricsUseCase()).execute();
    case 'SHIFT_RECONCILIATION': {
      const { db } = await import('../../core/db/prisma.js');
      const { getLightQueue } = await import('./index.js');
      
      const tenants = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findMany({ select: { id: true }, where: { status: 'active' } });
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0] || '';
      
      logger.info({ tenantCount: tenants.length, date: dateStr }, 'SHIFT_RECONCILIATION: Fan-out started');
      
      const queue = getLightQueue();
      const jobs = tenants.map((t: any) => ({
        name: 'SHIFT_RECONCILIATION_TENANT',
        data: { 
          type: 'SHIFT_RECONCILIATION_TENANT', 
          tenantId: t.id,
          dateStr
        },
        opts: { jobId: `reconcile:${t.id}:${dateStr}` }
      })).filter((j: any) => j.data.tenantId);
      
      if (jobs.length > 0) {
        await queue.addBulk(jobs);
      }
      
      return { triggeredTenants: tenants.length, date: dateStr };
    }
    case 'SHIFT_RECONCILIATION_TENANT': {
      const { ShiftReconciliationUseCase } = await import('../../core/use-cases/attendance/shift-reconciliation.usecase.js');
      const { tenantId, dateStr } = data;
      
      if (!tenantId) throw new Error('MISSING_TENANT_ID');
      if (!dateStr) throw new Error('MISSING_DATE_STR');

      const useCase = new ShiftReconciliationUseCase();
      return await useCase.execute({ tenantId, dateStr });
    }
    case 'QR_HASH_ROTATION': {
      const { db } = await import('../../core/db/prisma.js');
      const { getLightQueue } = await import('./index.js');
      
      const tenants = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findMany({
          where: { status: 'active' },
          select: { id: true }
        });
      });
      
      logger.info({ tenantCount: tenants.length }, 'QR_HASH_ROTATION: Fan-out started');
      
      const queue = getLightQueue();
      const jobs = tenants.map((t: any) => ({
        name: 'QR_HASH_ROTATION_TENANT',
        data: { 
          type: 'QR_HASH_ROTATION_TENANT', 
          tenantId: t.id 
        }
      })).filter((j: any) => j.data.tenantId);
      
      if (jobs.length > 0) {
        await queue.addBulk(jobs);
      }
      
      return { triggeredTenants: tenants.length };
    }
    case 'QR_HASH_ROTATION_TENANT': {
      const { db } = await import('../../core/db/prisma.js');
      const crypto = await import('crypto');
      const { tenantId } = data;

      if (!tenantId) throw new Error('MISSING_TENANT_ID');

      // 🔥 SECURE [P3]: Sử dụng withTenant() để kích hoạt RLS và đảm bảo isolation tuyệt đối
      // PERF [V3.9.3]: Sử dụng allowRaw để thực hiện bulk update bằng raw SQL, tránh n-queries trong tx
      return await db.withTenant(tenantId, async (tx) => {
        const checkpoints = await tx.checkpoint.findMany({
          where: { status: 'active' },
          select: { id: true }
        });

        if (checkpoints.length === 0) return { rotated: 0 };

        const CHUNK_SIZE = 50;
        for (let i = 0; i < checkpoints.length; i += CHUNK_SIZE) {
          const chunk = checkpoints.slice(i, i + CHUNK_SIZE);
          if (chunk.length === 0) continue;

          // Chuẩn bị payload cho helper build SQL
          const updates = chunk.map((c: { id: string }) => ({
            id: c.id,
            value: crypto.randomBytes(16).toString('hex')
          }));

          const { sql, params } = buildBulkUpdateCaseSql(
            'checkpoints',
            'qr_hash',
            'id',
            updates,
            { tenant_id: tenantId }
          );

          // Thực thi query duy nhất cho toàn bộ chunk
          await tx.$executeRawUnsafe(sql, ...params);
        }

        return { rotated: checkpoints.length };
      }, { allowRaw: true });
    }
    case 'sos-escalation-check': {
      const { SOSEscalationService } = await import('../../modules/notification/sos-escalation.service.js');
      return await SOSEscalationService.checkEscalation(data);
    }
    case 'dispatch-grouped-alert': {
      const { AlertAggregatorService } = await import('./aggregator.service.js');
      const { NotificationService } = await import('../../modules/notification/notification.service.js');
      const groupedAlert = await AlertAggregatorService.dispatchGroupedAlert(job.data.groupKey);
      if (groupedAlert) {
        NotificationService.emit({ tenantId: groupedAlert.tenantId, payload: { ...groupedAlert, isSecurityAlert: true } });
        try {
          const { ZaloService } = await import('../../infra/zalo/service.js');
          const { db } = await import('../../core/db/prisma.js');
          const msg = `[AI GOM NHÓM - ${groupedAlert.count} sự kiện] ${groupedAlert.title}: ${groupedAlert.message}`;
          await ZaloService.notifyAdmins(groupedAlert.tenantId, msg, async (tId: string) => {
            const admins = await db.withTenant(tId, async (tx) => tx.staff.findMany({
              where: { role: { in: ['admin', 'supervisor'] }, status: 'active' },
              select: { phone: true }
            }));
            return admins;
          });
        } catch (err) {
          logger.warn({ err }, 'Failed to send Zalo notification');
        }
      }
      return { success: true };
    }
    case 'TASK_DEADLINE_CHECK': {
      const { TaskReminderService } = await import('../../modules/task/task-reminder.service.js');
      // Coordinator job will now dispatch individual tenant jobs
      return await TaskReminderService.dispatchDeadlinesCheck();
    }
    case 'TASK_DEADLINE_CHECK_TENANT': {
      const { TaskReminderService } = await import('../../modules/task/task-reminder.service.js');
      const { tenantId } = data;
      if (!tenantId) throw new Error('MISSING_TENANT_ID');
      return await TaskReminderService.processTenantDeadlines(tenantId);
    }
    case 'INCIDENT_SLA_ESCALATION_CHECK': {
      const { db } = await import('../../core/db/prisma.js');
      const { getLightQueue } = await import('./index.js');
      const tenants = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findMany({
          where: { status: 'active' },
          select: { id: true }
        });
      });
      const queue = getLightQueue();
      const jobs = tenants.map((t: any) => ({
        name: 'INCIDENT_SLA_ESCALATION_CHECK_TENANT',
        data: { type: 'INCIDENT_SLA_ESCALATION_CHECK_TENANT', tenantId: t.id },
        opts: { jobId: `incident-sla:${t.id}:${Date.now()}` }
      }));
      if (jobs.length > 0) await queue.addBulk(jobs);
      return { triggeredTenants: tenants.length };
    }
    case 'INCIDENT_SLA_ESCALATION_CHECK_TENANT': {
      const { ProcessIncidentSlaBreachUseCase } = await import('../../modules/incident/application/process-incident-sla-breach.usecase.js');
      const { tenantId } = data;
      if (!tenantId) throw new Error('MISSING_TENANT_ID');
      const useCase = new ProcessIncidentSlaBreachUseCase();
      return await useCase.execute(tenantId);
    }
    case 'PATROL_MISSED_CHECK': {
      const { PatrolService } = await import('../../modules/patrol/patrol.service.js');
      return await PatrolService.dispatchMissedPatrolChecks();
    }
    case 'PATROL_MISSED_CHECK_TENANT': {
      const { PatrolService } = await import('../../modules/patrol/patrol.service.js');
      const { tenantId } = data;
      if (!tenantId) throw new Error('MISSING_TENANT_ID');
      return await PatrolService.processMissedAssignments(tenantId);
    }
    case 'SHIFT_STAFFING_CHECK': {
      const { db } = await import('../../core/db/prisma.js');
      const { getLightQueue } = await import('./index.js');
      const tenants = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findMany({
          where: { status: 'active' },
          select: { id: true }
        });
      });
      const queue = getLightQueue();
      const jobs = tenants.map((t: any) => ({
        name: 'SHIFT_STAFFING_CHECK_TENANT',
        data: { type: 'SHIFT_STAFFING_CHECK_TENANT', tenantId: t.id },
        opts: { jobId: `shift-staffing:${t.id}:${Date.now()}` }
      }));
      if (jobs.length > 0) {
        await queue.addBulk(jobs);
      }
      return { triggeredTenants: tenants.length };
    }
    case 'SHIFT_STAFFING_CHECK_TENANT': {
      const { ProcessOverdueShiftShortagesUseCase } = await import('../../modules/vendor/application/process-overdue-shift-shortages.usecase.js');
      const { tenantId } = data;
      if (!tenantId) throw new Error('MISSING_TENANT_ID');
      return await (new ProcessOverdueShiftShortagesUseCase()).execute(tenantId);
    }
    case 'SLO_MONITORING': {
      const { db } = await import('../../core/db/prisma.js');
      const { metrics } = await import('../../core/metrics.js');
      const { ProactiveAlertService } = await import('./proactive-alert.service.js');
      
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // FIX BUG-2: isolationGuard throw SECURITY_VIOLATION khi groupBy không có where.tenantId.
      // systemBypass() wrap isolationGuard bằng $extends.$allOperations để inject
      // bypassIsolation_SYSTEM_ONLY vào args — nhưng Prisma truyền args của groupBy theo cấu trúc
      // khác findMany (having/by thay vì where thông thường), khiến $allOperations không inject
      // flag đúng vào args.where trước khi isolationGuard kiểm tra `args.where.tenantId`.
      // Fix: thêm tenantId: { not: 'tenant_system' } vào where — guard nhận diện query đã có tenant scope.
      // Loại SYSTEM tenant (tenant_system) khỏi SLO monitoring. Giá trị string hợp lệ với Prisma.

      // FIX TS: threshold chưa được khai báo trong scope (bug tiềm ẩn trong code gốc, esbuild bỏ qua
      // nhưng tsc strict bắt). Giá trị 5 errors/min là ngưỡng SLO chuẩn cho hệ thống này.
      const threshold = 5;
      const tenants = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.tenant.findMany({
          where: { status: 'active', id: { not: 'tenant_system' } },
          select: { id: true },
        });
      }, { readOnly: true }) as Array<{ id: string }>;

      const scopedErrorSpikes = (
        await Promise.all(tenants.map(async (tenant) => {
          const count = await db.withTenant(tenant.id, async (tx) => {
            return await tx.auditLog.count({
              where: {
                status: 'ERROR',
                createdAt: { gte: oneMinuteAgo },
              },
            });
          }, { readOnly: true });

          return count >= threshold
            ? { tenantId: tenant.id, errorCount: count }
            : null;
        }))
      ).filter((spike): spike is { tenantId: string; errorCount: number } => Boolean(spike));

      const scopedSosDispatchErrors = (
        await Promise.all(tenants.map(async (tenant) => {
          const count = await db.withTenant(tenant.id, async (tx) => {
            return await tx.auditLog.count({
              where: {
                action: 'SOS_DISPATCH',
                status: 'ERROR',
                createdAt: { gte: oneMinuteAgo },
              },
            });
          }, { readOnly: true });

          return count > 0
            ? { tenantId: tenant.id, errorCount: count }
            : null;
        }))
      ).filter((sosError): sosError is { tenantId: string; errorCount: number } => Boolean(sosError));

      for (const spike of scopedErrorSpikes) {
        logger.error({
          tenantId: spike.tenantId,
          errorCount: spike.errorCount,
          category: 'PROACTIVE_ALERT',
          alertType: 'ERROR_RATE_SPIKE'
        }, `SLO ALERT: Tenant ${spike.tenantId} experiencing high error rate (${spike.errorCount} errors in 1m)`);

        const { NotificationService } = await import('../../modules/notification/notification.service.js');
        await NotificationService.sendSecurityAlert(
          spike.tenantId,
          'CẢNH BÁO SLO: Hiệu năng hệ thống giảm sút',
          `Hệ thống ghi nhận tỷ lệ lỗi tăng cao đột biến (${spike.errorCount} lỗi/phút). Đội ngũ kỹ thuật đang kiểm tra.`,
          'AI_ANOMALY',
          { errorCount: spike.errorCount, time: now.toISOString() }
        );

        await ProactiveAlertService.triggerPlatformAlert({
          type: 'ERROR_RATE_SPIKE',
          title: `[SLO CẢNH BÁO] Hệ thống gặp lỗi diện rộng cho Tenant ${spike.tenantId}`,
          message: `Lỗi vượt ngưỡng ${threshold}: ghi nhận ${spike.errorCount} lỗi/phút.`
        });

        await db.withTenant(spike.tenantId, async (tx) => {
          await tx.auditLog.create({
            data: {
              tenantId: spike.tenantId,
              userId: 'SYSTEM',
              action: 'ERROR_RATE_SPIKE',
              resource: `Tenant ${spike.tenantId} error spike: ${spike.errorCount} errors/min`,
              status: 'ERROR',
              timestamp: BigInt(Date.now()),
              payload: { errorCount: spike.errorCount, threshold }
            }
          });
        });
      }

      for (const sosError of scopedSosDispatchErrors) {
        logger.error({
          tenantId: sosError.tenantId,
          sosDispatchErrorCount: sosError.errorCount,
          category: 'PROACTIVE_ALERT',
          alertType: 'SOS_DISPATCH_FAILURE'
        }, 'SLO ALERT: Failed SOS Dispatches detected.');

        await ProactiveAlertService.triggerPlatformAlert({
          type: 'SOS_DISPATCH_FAILURE',
          title: `[CRITICAL] Zalo SOS Dispatch Failed cho Tenant ${sosError.tenantId}`,
          message: `Có ${sosError.errorCount} yêu cầu cứu khẩn cấp không thể gửi qua Zalo. Hãy kiểm tra cấu hình ZALO_ACCESS_TOKEN.`
        });
      }

      const scopedSnapshot = metrics.getSnapshot();
      const scopedSlowOps = scopedSnapshot.metrics.filter(m => m.avg > 5000 && m.key.includes('duration'));
      
      if (scopedSlowOps.length > 0) {
        logger.warn({ slowOps: scopedSlowOps, category: 'SLO_MONITORING' }, 'Detected slow operations in local instance metrics');
      }

      return {
        analyzedTenants: scopedErrorSpikes.length,
        slowOpsCount: scopedSlowOps.length,
        sosErrorsDetected: scopedSosDispatchErrors.length
      };

      // FIX TS: Prisma groupBy với strict:true trả kiểu {} cho result — cần explicit type assertion
      // để tsc nhận diện đúng shape của tenantId và _count trên kết quả trả về.
      /*
      type SloGroupByResult = { tenantId: string; _count: { id: number } };

      // [FIX] db.system() thay cho db.systemBypass():
      // Prisma groupBy validate args TRƯỚC khi $allOperations strip bypassIsolation_SYSTEM_ONLY
      // → flag bị Prisma engine reject với "Unknown argument".
      // db.system() = isolationGuard trực tiếp, không inject flag.
      // tenantId: { not: 'tenant_system' } trong where đủ để isolationGuard pass + Prisma engine chấp nhận.
      const errorSpikes = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.auditLog.groupBy({
          by: ['tenantId'],
          where: {
            tenantId: { not: 'tenant_system' }, // FIX [SLO-01]: null invalid cho Prisma groupBy non-nullable field. 'tenant_system' = SYSTEM_TENANT_ID loại SYSTEM audit logs khỏi SLO.
            status: 'ERROR',
            createdAt: { gte: oneMinuteAgo }
          },
          _count: {
            id: true
          },
          having: {
            id: {
              _count: { gte: threshold }
            }
          }
        });
      }) as SloGroupByResult[];

      for (const spike of errorSpikes) {
        if (!spike.tenantId) continue;
        
        logger.error({
          tenantId: spike.tenantId,
          errorCount: spike._count.id,
          category: 'PROACTIVE_ALERT',
          alertType: 'ERROR_RATE_SPIKE'
        }, `🚨 SLO ALERT: Tenant ${spike.tenantId} experiencing high error rate (${spike._count.id} errors in 1m)`);

        // Notify Admins
        const { NotificationService } = await import('../../modules/notification/notification.service.js');
        await NotificationService.sendSecurityAlert(
          spike.tenantId,
          'CẢNH BÁO SLO: Hiệu năng hệ thống giảm sút',
          `Hệ thống ghi nhận tỷ lệ lỗi tăng cao đột biến (${spike._count.id} lỗi/phút). Đội ngũ kỹ thuật đang kiểm tra.`,
          'AI_ANOMALY',
          { errorCount: spike._count.id, time: now.toISOString() }
        );

        // Proactive Alert to Platform Admins via Email/Zalo
        await ProactiveAlertService.triggerPlatformAlert({
          type: 'ERROR_RATE_SPIKE',
          title: `[SLO CẢNH BÁO] Hệ thống gặp lỗi diện rộng cho Tenant ${spike.tenantId}`,
          message: `Lỗi vượt ngưỡng ${threshold}: ghi nhận ${spike._count.id} lỗi/phút.`
        });

        // Persist to AuditLog for dashboard visibility
        // [FIX] Dùng db.withTenant(spike.tenantId) để create đúng tenant scope
        await db.withTenant(spike.tenantId, async (tx) => {
          await tx.auditLog.create({
            data: {
              tenantId: spike.tenantId,
            userId: 'SYSTEM',
            action: 'ERROR_RATE_SPIKE',
            resource: `Tenant ${spike.tenantId} error spike: ${spike._count.id} errors/min`,
            status: 'ERROR',
            timestamp: BigInt(Date.now()),
            payload: { errorCount: spike._count.id, threshold }
            }
          });
        });
      }

      // 2. Check for SOS Dispatch Errors
      // [FIX] Same: db.system() for groupBy
      const sosDispatchErrors = await db.withTenant('SYSTEM', async (tx) => {
        return await tx.auditLog.groupBy({
          by: ['tenantId'],
          where: {
            tenantId: { not: 'tenant_system' }, // FIX [SLO-01]: null invalid cho Prisma groupBy non-nullable field. 'tenant_system' = SYSTEM_TENANT_ID loại SYSTEM audit logs khỏi SLO.
            action: 'SOS_DISPATCH',
            status: 'ERROR',
            createdAt: { gte: oneMinuteAgo }
          },
          _count: { id: true },
          having: { id: { _count: { gt: 0 } } }
        });
      }) as SloGroupByResult[];

      for (const sosError of sosDispatchErrors) {
        if (!sosError.tenantId) continue;

        logger.error({
          tenantId: sosError.tenantId,
          sosDispatchErrorCount: sosError._count.id,
          category: 'PROACTIVE_ALERT',
          alertType: 'SOS_DISPATCH_FAILURE'
        }, '🚨 SLO ALERT: Failed SOS Dispatches detected!');

        // Proactive Alert to Platform Admins via Email/Zalo
        await ProactiveAlertService.triggerPlatformAlert({
          type: 'SOS_DISPATCH_FAILURE',
          title: `[CRITICAL] Zalo SOS Dispatch Failed cho Tenant ${sosError.tenantId}`,
          message: `Có ${sosError._count.id} yêu cầu cầu cứu khẩn cấp không thể gửi qua Zalo! Xin hãy kiểm tra cấu hình Zalo_ACCESS_TOKEN.`
        });
      }

      // 3. Check Local Metrics for Latency violations
      const snapshot = metrics.getSnapshot();
      const slowOps = snapshot.metrics.filter(m => m.avg > 5000 && m.key.includes('duration'));
      
      if (slowOps.length > 0) {
        logger.warn({ slowOps, category: 'SLO_MONITORING' }, 'Detected slow operations in local instance metrics');
      }

      return { analyzedTenants: errorSpikes.length, slowOpsCount: slowOps.length, sosErrorsDetected: sosDispatchErrors.length };
    }

      */
    }
    case 'CRITICAL_INCIDENT_NOTIFY': {
      const { tenantId, incidentId, incidentType, incidentDescription } = data;
      logger.info({ incidentId, tenantId }, 'Mức độ khẩn cấp, đang kích hoạt thông báo cho quản lý qua Zalo (BullMQ).');

      const { db } = await import('../../core/db/prisma.js');
      const managers = await db.withTenant(tenantId, async (tx) => tx.staff.findMany({
        where: {
          role: { in: ['admin', 'supervisor', 'tenant-admin'] },
          status: 'active'
        },
        select: { phone: true, fullName: true }
      }));

      const validPhones = managers
        .filter((m: any) => m.phone && /^(\+84|0)[0-9]{9,10}$/.test(m.phone))
        .map((m: any) => m.phone!);

      if (validPhones.length === 0) {
        logger.warn({ tenantId, incidentId }, 
          'SOS: No supervisors with valid phone found — Zalo notification skipped');
      } else {
        const { ZaloService } = await import('../../infra/zalo/service.js');
        await ZaloService.notifyDirect(tenantId, `[SOS] Sự cố ${incidentType} tại đơn vị ${tenantId}. Mô tả: ${incidentDescription}`, validPhones);
      }
      return { success: true };
    }

    case 'SUBSCRIPTION_AUTO_DOWNGRADE': {
      const { SubscriptionExpiryCheckUseCase } = await import('../use-cases/billing/subscription-expiry-check.use-case.js');
      const useCase = new SubscriptionExpiryCheckUseCase();
      const traceId = `auto-downgrade-${Date.now()}`;
      return await useCase.execute(traceId);
    }

    case 'billing-notification': {
      const { NotificationService } = await import('../../modules/notification/notification.service.js');
      const { type, tenantId, data: payload } = job.data;
      
      let title = '';
      let message = '';
      let typeTag: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
      
      switch (type) {
        case 'SUBSCRIPTION_ACTIVATED':
          title = '✓ Gói dịch vụ đã kích hoạt';
          message = `Gói dịch vụ Pro đã được kích hoạt thành công cho ${payload?.paidUsers} nhân viên. Hết hạn: ${payload?.expiresAt ? new Date(payload.expiresAt).toLocaleDateString('vi-VN') : 'N/A'}. Mã CK: ${payload?.paymentRef}`;
          typeTag = 'INFO';
          break;
        case 'SUBSCRIPTION_EXPIRING_SOON':
          title = `⚠ Cảnh báo hết hạn (${payload?.daysLeft} ngày)`;
          message = `Gói dịch vụ của bạn sẽ hết hạn vào ngày ${payload?.expiresAt ? new Date(payload.expiresAt).toLocaleDateString('vi-VN') : 'N/A'}. Vui lòng gia hạn để duy trì dịch vụ.`;
          typeTag = 'WARNING';
          break;
        case 'SUBSCRIPTION_EXPIRED':
          title = '⛔ Gói dịch vụ đã hết hạn';
          message = 'Hệ thống đã tự động chuyển tài khoản về gói FREE. Các tính năng nâng cao đã bị khóa.';
          typeTag = 'CRITICAL';
          break;
        case 'SUBSCRIPTION_FORCE_CANCELLED':
          title = '✕ Gói dịch vụ bị hủy';
          message = `Gói dịch vụ của bạn đã bị hủy bởi quản trị viên. Lý do: ${payload?.reason || 'Không có'}`;
          typeTag = 'CRITICAL';
          break;
      }
      
      if (title && message) {
        await NotificationService.emit({
          tenantId,
          payload: { title, message, type: typeTag, metadata: payload }
        });
      }
      return { success: true };
    }

    case 'IDEMPOTENCY_CLEANUP': {
      const { IdempotencyService } = await import('../middleware/idempotency.middleware.js');
      await IdempotencyService.cleanupExpired();
      return { success: true };
    }

    default:
      throw new Error(`Unknown light job type: ${type}`);
  }
};

export const initLightWorker = async () => {
  if (!_lightWorker) {
    _lightWorker = createWorker('light-jobs', lightProcessor, 30);

    _lightWorker.on('error', (err: Error) => {
      logger.error({ err: err.message }, 'LightWorker encountered an error - BullMQ will attempt to keep it running');
    });

    _lightWorker.on('closed', () => {
      logger.warn('LightWorker closed. This usually happens on shutdown or critical failure.');
    });
  }

  logger.info('✅ Light worker initialized (Concurrency: 30, Autorun: true)');
};

export const closeLightWorker = async () => {
  if (_lightWorker) {
    logger.info('🛑 Closing Light Worker...');
    await _lightWorker.close();
    _lightWorker = null;
    logger.info('✅ Light Worker closed');
  }
};
