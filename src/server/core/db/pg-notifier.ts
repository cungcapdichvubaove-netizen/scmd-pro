import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger/index.js';
import { SocketService } from '../../infra/socket/service.js';
import { db } from './prisma.js';

/**
 * PGNotifier handles PostgreSQL LISTEN/NOTIFY events 
 * and broadcasts them to connected clients via Socket.io
 */
export class PGNotifier {
  private static client: pg.Client;
  private static attempt: number = 0;
  private static reconnectTimer: NodeJS.Timeout | null = null;

  static async init() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      logger.warn('DATABASE_URL not set, PG Real-time will not be initialized');
      return;
    }

    try {
      this.client = new pg.Client({ 
        connectionString: dbUrl,
        connectionTimeoutMillis: 5000 
      });
      await this.client.connect();
      logger.info('PG Notifier connected to PostgreSQL');
      this.attempt = 0; // Reset attempts on successful connection

      // Apply Real-time Triggers if they exist
      const triggerSqlPath = path.join(process.cwd(), 'prisma', 'realtime_triggers.sql');
      if (fs.existsSync(triggerSqlPath)) {
        try {
          const sql = fs.readFileSync(triggerSqlPath, 'utf8');
          await this.client.query(sql);
          logger.info('Applied PG Real-time triggers successfully');
        } catch (sqlErr) {
          logger.error(sqlErr, 'Failed to apply PG Real-time triggers SQL');
        }
      }

      // Listen for patrol log events and outbox events
      await this.client.query('LISTEN patrol_log_event');
      await this.client.query('LISTEN outbox_new_event');

      // Import up here instead of inside the loop
      const { OutboxProcessor } = await import('../events/outbox-processor.js');
      
      this.client.on('notification', async (msg) => {
        if (msg.channel === 'outbox_new_event') {
          OutboxProcessor.processPendingEvents().catch(err => {
             logger.error({ err }, 'Error processing pending events from PG Notify');
          });
          return;
        }
        if (msg.channel === 'patrol_log_event' && msg.payload) {
          try {
            const data = JSON.parse(msg.payload);
            const record = data.record;
            
            logger.info({ id: record.id, tenantId: record.tenant_id }, 'PG Real-time event received, enriching...');

            // Enrich the notification data with Names from DB
            // BẮT BUỘC dùng db.withTenant() để đảm bảo RLS Isolation — KHÔNG bypass prisma trực tiếp
            const tenantId: string = record.tenant_id;
            const patrolLog = await db.withTenant(tenantId, async (tx: any) => {
              return tx.patrolLog.findUnique({
                where: { id: record.id },
                include: {
                  checkpoint: true,
                  staff: true
                }
              });
            });

            if (patrolLog) {
              const io = SocketService.getIO();
              const room = `tenant:${record.tenant_id}`;
              io.to(room).emit('patrol_update', {
                ...record,
                staffId: patrolLog.staff?.username || 'Unknown',
                checkpointName: patrolLog.checkpoint?.name || 'Unknown',
                status: 'COMPLETED',
                timestamp: new Date().toISOString(),
                source: 'pg_notify'
              });
              logger.info({ id: record.id, room }, 'Broadcasted enriched patrol update to tenant room');
            }
          } catch (err) {
            logger.error(err, 'Error parsing/enriching PG notification payload');
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error(err, 'PG Notifier client error');
        this.reconnect();
      });

    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        logger.warn({ host: err.address, port: err.port }, 'PostgreSQL server not reachable. PG Real-time Listen/Notify disabled.');
      } else {
        logger.error(err, 'Failed to initialize PG Notifier');
      }
      this.reconnect();
    }
  }

  private static reconnect() {
    if (this.reconnectTimer) return;

    this.attempt++;
    const baseDelayMs = 1000;
    const maxDelayMs = 30000;
    const cappedExponentialDelay = Math.min(baseDelayMs * 2 ** Math.min(this.attempt - 1, 5), maxDelayMs);
    const delay = Math.floor(Math.random() * cappedExponentialDelay);
    logger.info({ attempt: this.attempt, delay }, 'Scheduled PG Notifier reconnection');
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.client?.end().catch(() => undefined);
      } finally {
        await this.init();
      }
    }, delay);
  }

  static async cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      await this.client.end();
    }
  }
}
