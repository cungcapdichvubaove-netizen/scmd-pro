import { PatrolRepository } from './repositories/patrol.repository.js';
import { logger } from '../../core/logger/index.js';
import { db } from '../../core/db/prisma.js';
import { ScanQRUseCase } from '../../core/use-cases/patrol/scan-qr.usecase.js';
import { AttendanceCheckInUseCase } from '../../core/use-cases/attendance/check-in.usecase.js';
import { AttendanceCheckOutUseCase } from '../../core/use-cases/attendance/check-out.usecase.js';
import { SecurityContext, LocationDTO, CreateCheckpointDTO, ScanQRMetadata } from '../../core/architecture/types.js';
import { AttendanceType } from '../../domain/entities.js';
import { AuditService } from '../../core/audit/audit.service.js';

const scanQRUseCase = new ScanQRUseCase();
const checkInUseCase = new AttendanceCheckInUseCase();
const checkOutUseCase = new AttendanceCheckOutUseCase();

export class PatrolService {
  static async getLogs(ctx: SecurityContext) {
    return await PatrolRepository.getLogsByTenant(ctx);
  }

  static async scanQR(ctx: SecurityContext, checkpointId: string, location: LocationDTO, metadata: ScanQRMetadata = {}) {
    try {
      return await scanQRUseCase.execute(ctx, {
        checkpointId,
        staffId: ctx.userId,
        qr_hash: metadata.qr_hash || '',
        location,
        _signature: metadata._signature,
        _timestamp: typeof metadata._timestamp === 'string' ? parseInt(metadata._timestamp, 10) : metadata._timestamp
      });
    } catch (err: any) {
      logger.error({ err, checkpointId, staffId: ctx.userId }, 'ScanQR failed');
      throw err;
    }
  }

  static async completePatrol(ctx: SecurityContext, data: { checkpointId: string, location?: LocationDTO, startTime: string, endTime: string, checkItemsData?: any[], anomaly?: any, deviceId?: string, _signature?: string, _timestamp?: string }) {
    try {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      const now = new Date();
      
      if (start >= end) throw new Error('INVALID_TIMERANGE: startTime must be before endTime');
      if (end > new Date(now.getTime() + 5 * 60 * 1000)) { // Max 5 min clock skew
        throw new Error('FUTURE_TIMESTAMP: endTime cannot be in the future');
      }
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;
      if (durationMinutes < 0.5 || durationMinutes > 480) { // 30 seconds to 8 hours
        throw new Error('SUSPICIOUS_DURATION');
      }

      // 1. Verify location if coords provided
      let isLocationValid = true;
      if (data.location) {
        isLocationValid = await PatrolRepository.verifyGuardLocation(
          ctx.tenantId, 
          data.checkpointId, 
          data.location.lat, 
          data.location.lon
        );
        if (!isLocationValid) {
          logger.warn({ ctx, checkpointId: data.checkpointId }, 'FRAUD_DETECTED: Guard completed patrol while too far from checkpoint');
        }
      }

      // 2. Save log to PG
      const log = await PatrolRepository.createLog(
        ctx, 
        data.checkpointId, 
        {
          startTime: data.startTime,
          endTime: data.endTime,
          checkItems: data.checkItemsData,
          anomaly: data.anomaly || (!isLocationValid ? 'LOCATION_MISMATCH_FRAUD' : null),
          status: !isLocationValid ? 'danger' : 'ok',
          location: data.location,
          deviceId: data.deviceId,
          offlineSignature: data._signature,
          offlineTimestamp: data._timestamp,
          syncTime: new Date().toISOString()
        }
      );

      return { success: true, logId: log.id };
    } catch (err: any) {
      logger.error({ err, staffId: ctx.userId }, 'Complete patrol failed');
      throw err;
    }
  }

  static async getCheckpoints(ctx: SecurityContext, cursor?: string, limit?: number) {
    // FIX [P4]: Remove redundant double-caching. 
    // Delegate entirely to PatrolRepository which uses standardized CacheManager keys.
    return await PatrolRepository.getCheckpointsByTenant(ctx.tenantId, cursor, limit);
  }

  static async createCheckpoint(ctx: SecurityContext, data: CreateCheckpointDTO) {
    const checkpoint = await PatrolRepository.createCheckpoint(ctx.tenantId, data);
    
    // Cache invalidation is now handled inside PatrolRepository.createCheckpoint

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'CREATE_CHECKPOINT',
      resource: `checkpoint/${checkpoint.id}`,
      status: 'SUCCESS',
      payload: { name: checkpoint.name }
    });

    return checkpoint;
  }

  static async updateCheckpoint(ctx: SecurityContext, id: string, data: Partial<CreateCheckpointDTO>) {
    const existing = await PatrolRepository.getCheckpointById(ctx.tenantId, id);
    if (!existing) throw new Error('Checkpoint not found');
    if (existing.tenantId !== ctx.tenantId) throw new Error('Cross-tenant access denied');
  
    const updated = await PatrolRepository.updateCheckpoint(ctx.tenantId, id, data);
    
    // Cache invalidation is now handled inside PatrolRepository.updateCheckpoint

    await AuditService.logSensitiveChange(
      ctx.userId,
      ctx.tenantId,
      'UPDATE_CHECKPOINT',
      `checkpoint/${id}`,
      existing,
      updated
    );

    return updated;
  }

  static async deleteCheckpoint(ctx: SecurityContext, id: string) {
    const existing = await PatrolRepository.getCheckpointById(ctx.tenantId, id);
    if (!existing) throw new Error('Checkpoint not found');
    if (existing.tenantId !== ctx.tenantId) throw new Error('Cross-tenant access denied');
    
    await PatrolRepository.deleteCheckpoint(ctx.tenantId, id);
    
    // Cache invalidation is now handled inside PatrolRepository.deleteCheckpoint

    await AuditService.logSensitiveChange(
      ctx.userId,
      ctx.tenantId,
      'DELETE_CHECKPOINT',
      `checkpoint/${id}`,
      existing,
      null
    );

    return { success: true };
  }

  static async getRoutes(ctx: SecurityContext) {
    const configKey = `routes_${ctx.tenantId}`;
    const customRoutesConfig = await db.system({ readOnly: true }).systemConfig.findUnique({
      where: { key: configKey }
    });

    if (customRoutesConfig && Array.isArray(customRoutesConfig.value)) {
      return customRoutesConfig.value; // Return custom routes mapped with new properties
    }

    // Basic real data: list checkpoints as a single default route with enhanced properties
    const checkpointsResult = await this.getCheckpoints(ctx) as any;
    const data = (Array.isArray(checkpointsResult) ? checkpointsResult : checkpointsResult?.data) || [];
    
    return [{
      id: 'default-route',
      name: 'Lộ trình tiêu chuẩn',
      estimatedMinutes: data.length * 5, // 5 mins per checkpoint
      schedule: '00:00 - 23:59', // All day
      isMandatory: true,
      checkpoints: data.map((c: any, index: number) => ({ 
        id: c.id, 
        name: c.name,
        checkpointOrder: index + 1,
        isMandatory: true
      }))
    }];
  }

  static async checkAttendance(ctx: SecurityContext, data: { type: string; location?: any; imageUri?: string; notes?: string; shiftScheduleId?: string }) {
    if (data.type === AttendanceType.CHECK_IN) {
      return await checkInUseCase.execute(ctx, {
        location: data.location ? (typeof data.location === 'string' ? JSON.parse(data.location) : data.location) : undefined,
        imageUri: data.imageUri,
        notes: data.notes,
        shiftScheduleId: data.shiftScheduleId,
      });
    }
    
    if (data.type === AttendanceType.CHECK_OUT) {
      return await checkOutUseCase.execute(ctx, {
        location: data.location ? (typeof data.location === 'string' ? JSON.parse(data.location) : data.location) : undefined,
        imageUri: data.imageUri,
        notes: data.notes,
      });
    }

    // Default LIVENESS fallback
    return await db.forTenant(ctx.tenantId).attendanceRecord.create({
      data: {
        tenantId: ctx.tenantId,
        staffId: ctx.userId,
        type: data.type,
        location: data.location ? (typeof data.location === 'string' ? JSON.parse(data.location) : data.location) : null,
        imageUri: data.imageUri || null,
        notes: data.notes || null,
      }
    });
  }

  static async getAttendance(ctx: SecurityContext, cursor?: string, limit: number = 50, startDate?: string, endDate?: string) {
    // PERF-01 Fix: Use cursor-based pagination (v3.4 compliance)
    const limitVal = Math.min(limit, 200);

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDay = new Date(endDate);
        endDay.setUTCHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDay;
      }
    }
    
    // 1. Get real attendance records
    const records = await db.forTenant(ctx.tenantId, { readOnly: true }).attendanceRecord.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { staff: { select: { fullName: true, username: true } } },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limitVal
    });

    // 2. Metadata for pagination
    const nextCursor = records.length === limitVal ? records[records.length - 1].id : null;

    // 3. Optimized DB-side aggregation (Summary) using JOIN to avoid N+1
    // FIX [P2]: Gộp summary và staff lookup vào 1 query duy nhất dùng JOIN
    const summary = await db.withTenant(ctx.tenantId, async (client) => {
      return await client.$queryRaw`
        SELECT 
          p.staff_id as "staffId",
          s.full_name as "staffName",
          COUNT(p.id)::int as "count",
          MAX(p.created_at) as "lastActive"
        FROM patrol_logs p
        JOIN staff s ON p.staff_id = s.id
        WHERE p.tenant_id = ${ctx.tenantId}
        GROUP BY p.staff_id, s.full_name
        ORDER BY "count" DESC
        LIMIT 50
      `;
    }, { allowRaw: true, readOnly: true }) || [];

    return {
      records,
      nextCursor,
      summary
    };
  }
}