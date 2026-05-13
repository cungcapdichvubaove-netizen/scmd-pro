import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../../../core/db/prisma.js';
import { CacheManager } from '../../../core/cache/manager.js';
import { PATROL_PROXIMITY_METERS } from '../patrol.constants.js';
import { CreateCheckpointDTO, SecurityContext, UserRole } from '../../../core/architecture/types.js';

export class PatrolRepository {
  private static readonly CACHE_TTL = 300; // 5 minutes for checkpoints list
  private static readonly CP_DETAIL_TTL = 600; // 10 minutes for checkpoint detail

  private static getCacheKey(tenantId: string, id?: string) {
    // Standardized key format [P4]
    return id ? `scmd:cp:detail:${tenantId}:${id}` : `scmd:cp:list:${tenantId}`;
  }
  /**
   * Creates a new patrol log entry.
   */
  static async createLog(ctx: SecurityContext, checkpointId: string, metadata: any = {}) {
    if (!ctx.tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');

    const result = await db.withTenant(ctx.tenantId, async (tx: any) => {
      return await tx.patrolLog.create({
        data: {
          staffId: ctx.userId,
          checkpointId,
          metadata: metadata || {},
        },
      });
    });

    // Invalidate dashboard and staff logs list
    await CacheManager.delByPattern(`staff:patrol_logs:${ctx.tenantId}:*`);
    
    return result;
  }

  /**
   * Retrieves a single patrol log by ID.
   */
  static async getLogById(ctx: SecurityContext, id: string) {
    if (!ctx.tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');

    const log = await db.forTenant(ctx.tenantId, { 
      ownerId: ctx.role === UserRole.GUARD ? ctx.userId : undefined,
      readOnly: true
    }).patrolLog.findUnique({
      where: { id },
      select: {
        id: true,
        staffId: true,
        checkpointId: true,
        createdAt: true,
        metadata: true,
        staff: {
          select: {
            fullName: true,
            username: true
          }
        },
        checkpoint: {
          select: {
            name: true,
            status: true
          }
        }
      }
    });
    
    return log;
  }

  /**
   * Retrieves recent patrol logs for a specific tenant.
   * If context role is GUARD, enforces ownership filtering.
   */
  static async getLogsByTenant(ctx: SecurityContext, cursor?: string, limit: number = 50, view?: string) {
    if (!ctx.tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');

    const isGuard = ctx.role === UserRole.GUARD;
    const isMobileView = view === 'mobile';
    
    // Only cache first page for non-guards to optimize dashboard
    const cacheKey = `staff:patrol_logs:${ctx.tenantId}:${isGuard ? ctx.userId : 'all'}:${cursor || 'first'}:${view || 'web'}`;
    const ttl = isGuard ? 30 : 60; // 30s for guards, 60s for dashboard

    return await CacheManager.wrap(cacheKey, async () => {
      const logs = await db.forTenant(ctx.tenantId, {
        ownerId: isGuard ? ctx.userId : undefined,
        readOnly: true
      }).patrolLog.findMany({
        take: Math.min(limit, 200),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          checkpointId: true,
          createdAt: true,
          ...(isMobileView ? {} : {
            staffId: true,
            metadata: true,
            staff: {
              select: {
                fullName: true,
              }
            },
          }),
          checkpoint: {
            select: {
              name: true,
            }
          }
        }
      });
      
      return {
        data: logs.map((l: any) => ({
          id: l.id,
          checkpointId: l.checkpointId,
          checkpointName: l.checkpoint?.name || 'Điểm lạ',
          createdAt: l.createdAt,
          ...(isMobileView ? {} : {
            staffId: l.staffId,
            staffName: l.staff?.fullName || l.staffId,
            startTime: l.createdAt,
            isSuspicious: !!l.metadata?.isSuspicious,
            suspicionReason: l.metadata?.suspicionReason,
          })
        })),
        nextCursor: logs.length === Math.min(limit, 200) ? logs[logs.length - 1].id : null,
      };
    }, ttl);
  }

  static async getAllCheckpointsByTenant(tenantId: string) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    
    const cacheKey = `scmd:cp:all:${tenantId}`;
    
    return await CacheManager.wrap(cacheKey, async () => {
      return await db.withTenant(tenantId, async (tx: any) => {
        const rows = await tx.$queryRaw(Prisma.sql`
          SELECT id, name, status, 
                 ST_Y(location::geometry) AS latitude, 
                 ST_X(location::geometry) AS longitude, 
                 updated_at AS "updatedAt"
          FROM checkpoints
          WHERE tenant_id = ${tenantId}
          ORDER BY id ASC
        `);

        return rows.map((r: any) => ({
          id:                     r.id,
          name:                   r.name,
          status:                 r.status,
          latitude:               r.latitude  !== null ? Number(r.latitude)  : 0,
          longitude:              r.longitude !== null ? Number(r.longitude) : 0,
          updatedAt:              r.updatedAt,
        }));
      }, { allowRaw: true, readOnly: true });
    }, this.CACHE_TTL);
  }

  static async getCheckpointsByTenant(tenantId: string, cursor?: string, limit: number = 50) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    
    // Only cache the first page (no cursor)
    const cacheKey = this.getCacheKey(tenantId) + (cursor ? `:${cursor}` : ':first');
    
    return await CacheManager.wrap(cacheKey, async () => {
      return await db.withTenant(tenantId, async (tx: any) => {
        // Use Prisma.sql tagged template to ensure parameterized queries and prevent SQL injection.
        // We MUST use raw SQL here because Prisma ORM drops `Unsupported('geography')` columns,
        // so we need ST_Y and ST_X functions from PostGIS to retrieve coordinates.
        const limitVal = Math.min(limit, 200);
        const fetchLimit = limitVal + 1; // Standard optimization: Fetch 1 extra to determine hasMore
        
        const rows = cursor 
          ? await tx.$queryRaw(Prisma.sql`
              SELECT id, name, status, 
                     ST_Y(location::geometry) AS latitude, 
                     ST_X(location::geometry) AS longitude, 
                     updated_at AS "updatedAt"
              FROM checkpoints
              WHERE tenant_id = ${tenantId} AND id > ${cursor}
              ORDER BY id ASC
              LIMIT ${fetchLimit}
            `)
          : await tx.$queryRaw(Prisma.sql`
              SELECT id, name, status, 
                     ST_Y(location::geometry) AS latitude, 
                     ST_X(location::geometry) AS longitude, 
                     updated_at AS "updatedAt"
              FROM checkpoints
              WHERE tenant_id = ${tenantId}
              ORDER BY id ASC
              LIMIT ${fetchLimit}
            `);

        const hasMore = rows.length > limitVal;
        const items = hasMore ? rows.slice(0, limitVal) : rows;

        return {
          data: items.map((r: any) => ({
            id:                     r.id,
            name:                   r.name,
            status:                 r.status,
            latitude:               r.latitude  !== null ? Number(r.latitude)  : 0,
            longitude:              r.longitude !== null ? Number(r.longitude) : 0,
            updatedAt:              r.updatedAt,
          })),
          nextCursor: hasMore ? items[items.length - 1].id : null,
          hasMore
        };
      }, { allowRaw: true, readOnly: true });
    }, this.CACHE_TTL);
  }

  static async getCheckpointById(tenantId: string, id: string) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    const cacheKey = this.getCacheKey(tenantId, id);

    return await CacheManager.wrap(cacheKey, async () => {
      return await db.withTenant(tenantId, async (tx: any) => {
        // Use Prisma.sql tagged template for protection against SQL Injection.
        // We MUST use raw SQL to retrieve spatial coordinates from PostGIS geography type.
        const rows: any[] = await tx.$queryRaw(Prisma.sql`
          SELECT
            id, name, status, qr_hash, check_items,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            benchmark_travel_time, benchmark_work_duration,
            benchmark_tolerance_pct, is_learning_mode, updated_at
          FROM checkpoints
          WHERE id = ${id} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        
        if (!rows.length) return null;
        const r = rows[0];
        return {
          ...r,
          qr_hash: r.qr_hash,
          check_items: r.check_items,
          latitude: r.latitude !== null ? Number(r.latitude) : 0,
          longitude: r.longitude !== null ? Number(r.longitude) : 0,
          updatedAt: r.updated_at
        };
      }, { readOnly: true, allowRaw: true });
    }, this.CP_DETAIL_TTL);
  }

  static async createCheckpoint(tenantId: string, data: CreateCheckpointDTO) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    
    // Standardized invalidation pattern [P4]
    await CacheManager.delByPattern(`scmd:cp:list:${tenantId}*`);

    return await db.withTenant(tenantId, async (tx: any) => {
      const { name, latitude, longitude, check_items } = data;
      
      // FIX [7.3]: Đảm bảo qr_hash không bao giờ null để tránh vi phạm ràng buộc NOT NULL của DB
      const qr_hash = data.qr_hash || `cp_${crypto.randomBytes(6).toString('hex')}`;
      
      // We must use raw SQL because the 'location' geography field is Unsupported in Prisma DSL.
      // Explicitly using Prisma.sql to prevent SQL injection in raw query context.
      const result: any[] = await tx.$queryRaw(Prisma.sql`
        INSERT INTO "checkpoints" ("id", "tenant_id", "name", "qr_hash", "check_items", "location", "created_at", "updated_at")
        VALUES (
          gen_random_uuid(), 
          ${tenantId}, 
          ${name}, 
          ${qr_hash}, 
          ${check_items ? JSON.stringify(check_items) : null}::jsonb,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          NOW(),
          NOW()
        )
        RETURNING *
      `);
      
      const r = result[0];
      // FIX [7.4]: Normalize result để tránh leak binary location data và map đúng camelCase
      return {
        id: r.id,
        name: r.name,
        status: r.status,
        qr_hash: r.qr_hash,
        check_items: r.check_items,
        latitude: latitude, // Trả về giá trị input vì RETURNING location là binary
        longitude: longitude,
        benchmark_travel_time: r.benchmark_travel_time,
        benchmark_work_duration: r.benchmark_work_duration,
        benchmark_tolerance_pct: r.benchmark_tolerance_pct,
        is_learning_mode: r.is_learning_mode,
        updatedAt: r.updated_at || new Date(),
      };
    }, { allowRaw: true });
  }

  static async updateCheckpoint(tenantId: string, id: string, data: Partial<CreateCheckpointDTO>) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    
    // Standardized invalidation pattern [P4]
    await Promise.all([
      CacheManager.del(this.getCacheKey(tenantId, id)),
      CacheManager.delByPattern(`scmd:cp:list:${tenantId}*`)
    ]);

    return await db.withTenant(tenantId, async (tx: any) => {
      const { name, latitude, longitude, qr_hash, check_items } = data;
      
      if (latitude !== undefined && longitude !== undefined) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "checkpoints"
          SET 
            "name" = COALESCE(${name}, "name"),
            "qr_hash" = COALESCE(${qr_hash}, "qr_hash"),
            "check_items" = COALESCE(${check_items ? JSON.stringify(check_items) : null}::jsonb, "check_items"),
            "location" = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            "updated_at" = NOW()
          WHERE "id" = ${id} AND "tenant_id" = ${tenantId}
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          UPDATE "checkpoints"
          SET 
            "name" = COALESCE(${name}, "name"),
            "qr_hash" = COALESCE(${qr_hash}, "qr_hash"),
            "check_items" = COALESCE(${check_items ? JSON.stringify(check_items) : null}::jsonb, "check_items"),
            "updated_at" = NOW()
          WHERE "id" = ${id} AND "tenant_id" = ${tenantId}
        `);
      }

      return this.getCheckpointById(tenantId, id);
    }, { allowRaw: true });
  }

  static async deleteCheckpoint(tenantId: string, id: string) {
    if (!tenantId) throw new Error('SECURITY_ALERT: tenantId is missing');
    
    // Standardized invalidation pattern [P4]
    await Promise.all([
      CacheManager.del(this.getCacheKey(tenantId, id)),
      CacheManager.delByPattern(`scmd:cp:list:${tenantId}*`)
    ]);

    return await db.withTenant(tenantId, async (tx: any) => {
      return await tx.checkpoint.delete({ where: { id } });
    });
  }

  /**
   * Verifies if the guard's current location is within the allowed proximity of the checkpoint.
   * Uses PostGIS spatial functions for high precision.
   * @param tenantId Unique identifier for the tenant
   * @param checkpointId ID of the target checkpoint
   * @param currentLat Current latitude of the guard
   * @param currentLng Current longitude of the guard
   */
  /**
   * Checks if there was a scan for the same checkpoint by the same user within the defined window.
   */
  static async checkLastScan(tenantId: string, staffId: string, checkpointId: string, windowMinutes: number = 30, timestamp?: number): Promise<boolean> {
    const referenceTime = timestamp ? new Date(timestamp) : new Date();
    const windowStart = new Date(referenceTime.getTime() - windowMinutes * 60 * 1000);
    const windowEnd = new Date(referenceTime.getTime() + windowMinutes * 60 * 1000);
    
    // Use systemBypass or forTenant as needed. Here withTenant/forTenant is preferred.
    const count = await db.forTenant(tenantId, { readOnly: true }).patrolLog.count({
      where: {
        staffId,
        checkpointId,
        OR: [
          { createdAt: { gte: windowStart, lte: windowEnd } },
          { 
            metadata: {
              path: ['offlineTimestamp'],
              gte: windowStart.getTime(),
              lte: windowEnd.getTime()
            }
          }
        ]
      }
    });
    
    return count > 0;
  }

  static async verifyGuardLocation(
    tenantId: string,
    checkpointId: string,
    currentLat: number,
    currentLng: number,
    accuracy?: number
  ): Promise<boolean> {
    // FAIL-FAST TENANT ISOLATION
    if (!tenantId) {
      throw new Error('SECURITY_ALERT: tenantId is missing in verifyGuardLocation');
    }

    // Using RLS via withTenant for raw queries
    return await db.withTenant(tenantId, async (tx: any) => {
      /**
       * PostGIS Spatial Query protected by RLS:
       * 1. Even if we omitted tenantId check in WHERE, RLS would block access.
       * 2. Protected against SQL injection by using Prisma.sql tagged template.
       */
      const result: any[] = await tx.$queryRaw(Prisma.sql`
        SELECT id 
        FROM "checkpoints"
        WHERE "tenant_id" = ${tenantId} 
          AND "id" = ${checkpointId}
          AND ST_DWithin(
            "location",
            ST_SetSRID(ST_MakePoint(${currentLng}, ${currentLat}), 4326)::geography,
            LEAST(GREATEST(${PATROL_PROXIMITY_METERS}, ${accuracy || 0}), 500)
          )
        LIMIT 1;
      `);
      return result.length > 0;
    }, { allowRaw: true, readOnly: true });
  }
}