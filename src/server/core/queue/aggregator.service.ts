import { redis } from '../../infra/redis/client.js';
import { QueueService } from './index.js';
import { logger } from '../logger/index.js';
import { metrics } from '../metrics.js';

export interface AlertData {
  tenantId: string;
  staffId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

export class AlertAggregatorService {
  private static WINDOW_SECONDS = 60;

  /**
   * Adds an alert to the aggregation window.
   */
  static async addAlert(alert: AlertData) {
    const tId = alert.tenantId;
    const sId = alert.staffId;
    const aType = alert.type;
    
    const groupKey = `alerts:pending:${tId}:${sId}:${aType}`;
    
    try {
      const exists = await redis.exists(groupKey);
      
      if (!exists) {
        // First alert: Initialize group
        await redis.hset(groupKey, {
          tenantId: tId,
          staffId: sId,
          type: aType,
          title: alert.title,
          message: alert.message,
          metadata: JSON.stringify(alert.metadata || {}),
          count: '1',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString()
        });
        
        await redis.expire(groupKey, this.WINDOW_SECONDS + 60); // 1 minute buffer
        
        await QueueService.addJob('dispatch-grouped-alert', { groupKey }, `agg:${groupKey}`, {
          delay: this.WINDOW_SECONDS * 1000
        });
        
        metrics.record('alert_aggregator_window_started', 1, { tenantId: tId, type: aType });
        logger.debug({ groupKey }, 'Smart Alert: Grouping window started');
      } else {
        const count = await redis.hincrby(groupKey, 'count', 1);
        await redis.hset(groupKey, 'lastSeen', new Date().toISOString());
        
        metrics.record('alert_aggregator_incremented', 1, { tenantId: tId, type: aType });
        logger.debug({ groupKey, count }, 'Smart Alert: Incremented aggregation count');
      }
    } catch (err) {
      logger.error({ err, groupKey }, 'Failed to aggregate alert');
    }
  }

  /**
   * Dispatches the grouped alert after the window closes.
   */
  static async dispatchGroupedAlert(groupKey: string) {
    try {
      const data = await redis.hgetall(groupKey);
      if (!data || Object.keys(data).length === 0) {
        logger.debug({ groupKey }, 'Aggregator: Group key already processed or missing');
        return null;
      }

      const count = parseInt(data.count || '1', 10);
      
      // FIX [RESILIENCE]: Before deleting, we assume the caller will handle retries 
      // if this function returns data but the notification fails. 
      // In light.worker.ts, we wrap the notification logic.
      
      // We keep the data for a bit longer just in case of failure (TTL will handle it)
      // but rename the key to "processing" to avoid double dispatch if worker retries.
      const processingKey = `alerts:processing:${groupKey.split(':').pop()}:${Date.now()}`;
      await redis.rename(groupKey, processingKey);
      await redis.expire(processingKey, 300); // 5 minutes to debug/audit if needed

      metrics.record('alert_aggregator_dispatched', count, { 
        tenantId: data.tenantId as string, 
        type: data.type as string 
      });

      return {
        tenantId: data.tenantId as string,
        staffId: data.staffId as string,
        type: data.type as string,
        title: data.title as string,
        message: data.message as string,
        metadata: JSON.parse(data.metadata || '{}'),
        count,
        firstSeen: data.firstSeen as string,
        lastSeen: data.lastSeen as string,
        isGrouped: true,
        archiveKey: processingKey
      };
    } catch (err) {
      logger.error({ err, groupKey }, 'Failed to dispatch grouped alert');
      metrics.record('alert_aggregator_error', 1, { groupKey });
      return null;
    }
  }

  static async getAggregationMetrics() {
    let cursor = '0';
    let totalKeys = 0;
    
    try {
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'alerts:pending:*', 'COUNT', 100);
        cursor = nextCursor;
        totalKeys += keys.length;
      } while (cursor !== '0');

      return {
        pendingGroups: totalKeys,
        windowSeconds: this.WINDOW_SECONDS
      };
    } catch (err) {
      logger.error({ err }, 'Failed to get aggregation metrics via SCAN');
      return { pendingGroups: 0, windowSeconds: this.WINDOW_SECONDS };
    }
  }
}
