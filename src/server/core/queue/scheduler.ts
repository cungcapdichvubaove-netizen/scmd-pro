import { getLightQueue } from './index.js';
import { logger } from '../logger/index.js';

export class Scheduler {
  private static outboxInterval: NodeJS.Timeout;

  static async init() {
    logger.info('Initializing automated job scheduler');

    try {
      // 1. Event Outbox Polling (every 5 seconds)
      // We use a repeatable job instead of setInterval for better distributed guarantees
      await getLightQueue().add(
        'OUTBOX_POLLING',
        { type: 'OUTBOX_POLLING' },
        {
          repeat: {
            every: 30000, // 30 seconds
          },
          jobId: 'outbox_polling_singleton', // Ensure only one exists cluster-wide
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Event Outbox Polling scheduled (every 30s)');

      await getLightQueue().add(
        'STAFF_METRICS_UPDATE',
        { type: 'STAFF_METRICS_UPDATE' },
        {
          repeat: {
            pattern: '0 2 * * *', // Every day at 2 AM
          },
          jobId: 'staff_metrics_update_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Staff Performance Metrics calculation scheduled (daily at 2AM)');

      await getLightQueue().add(
        'SHIFT_RECONCILIATION',
        { type: 'SHIFT_RECONCILIATION' },
        {
          repeat: {
            pattern: '0 1 * * *', // Every day at 1 AM
          },
          jobId: 'shift_reconciliation_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Shift Reconciliation scheduled (daily at 1AM)');

      // 4. QR Hash Rotation (Monthly at 1st day 0:00)
      await getLightQueue().add(
        'QR_HASH_ROTATION',
        { type: 'QR_HASH_ROTATION' },
        {
          repeat: {
            pattern: '0 0 1 * *', // 1st day of every month
          },
          jobId: 'qr_hash_rotation_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('QR Hash Rotation scheduled (monthly at 1st day)');

      // 5. Task Deadline Check (Every 1 hour)
      await getLightQueue().add(
        'TASK_DEADLINE_CHECK',
        { type: 'TASK_DEADLINE_CHECK' },
        {
          repeat: {
            pattern: '0 * * * *', // Every hour
          },
          jobId: 'task_deadline_check_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Task Deadline Check scheduled (every hour)');
      
      // 6. Monthly AI Strategy Analysis (1st day of every month at 3 AM)
      const { getHeavyQueue } = await import('./index.js');
      await getHeavyQueue().add(
        'MONTHLY_AI_STRATEGY',
        { type: 'MONTHLY_AI_STRATEGY' },
        {
          repeat: {
            pattern: '0 3 1 * *', // 3 AM on 1st day of month
          },
          jobId: 'monthly_ai_strategy_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Monthly AI Strategy Analysis scheduled (monthly at 1st day 3AM)');

      // 7. ⚡ PROACTIVE SLO MONITORING (Every 1 minute)
      await getLightQueue().add(
        'SLO_MONITORING',
        { type: 'SLO_MONITORING' },
        {
          repeat: {
            every: 60000, 
          },
          jobId: 'slo_monitoring_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Proactive SLO Monitoring scheduled (every 1 minute)');

      // 8. Idempotency Cleanup (Every 4 hours)
      await getLightQueue().add(
        'IDEMPOTENCY_CLEANUP',
        { type: 'IDEMPOTENCY_CLEANUP' },
        {
          repeat: {
            pattern: '0 */4 * * *', // Every 4 hours
          },
          jobId: 'idempotency_cleanup_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Idempotency Cleanup scheduled (every 4 hours)');
      
      // 9. Audit Log Cleanup (Every week at 4 AM Sunday)
      await getHeavyQueue().add(
        'AUDIT_LOG_CLEANUP',
        { type: 'AUDIT_LOG_CLEANUP', retentionDays: 180 },
        {
          repeat: {
            pattern: '0 4 * * 0', // 4 AM on Sunday
          },
          jobId: 'audit_log_cleanup_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Audit Log Cleanup scheduled (Weekly at Sun 4AM)');

      // 10. Auto Downgrade & Subscription Warning (Daily at 1 AM)
      await getLightQueue().add(
        'SUBSCRIPTION_AUTO_DOWNGRADE',
        { type: 'SUBSCRIPTION_AUTO_DOWNGRADE' },
        {
          repeat: {
            pattern: '0 1 * * *', // Every day at 1 AM
          },
          jobId: 'subscription_auto_downgrade_singleton',
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.info('Subscription Auto-Downgrade & Warning scheduled (daily at 1AM)');

    } catch (err) {
      logger.error({ err }, 'Failed to schedule automated jobs');
    }
  }

  static stop() {
    if (this.outboxInterval) {
      clearInterval(this.outboxInterval);
    }
  }
}
