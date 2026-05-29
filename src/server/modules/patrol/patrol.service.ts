import { PatrolRepository } from './repositories/patrol.repository.js';
import { logger } from '../../core/logger/index.js';
import { db } from '../../core/db/prisma.js';
import { ScanQRUseCase } from '../../core/use-cases/patrol/scan-qr.usecase.js';
import { AttendanceCheckInUseCase } from '../../core/use-cases/attendance/check-in.usecase.js';
import { AttendanceCheckOutUseCase } from '../../core/use-cases/attendance/check-out.usecase.js';
import { CreatePatrolRouteUseCase } from '../../core/use-cases/patrol/create-patrol-route.usecase.js';
import { CreatePatrolAssignmentUseCase } from '../../core/use-cases/patrol/create-patrol-assignment.usecase.js';
import { StartPatrolSessionUseCase } from '../../core/use-cases/patrol/start-patrol-session.usecase.js';
import { CompletePatrolSessionUseCase } from '../../core/use-cases/patrol/complete-patrol-session.usecase.js';
import { SecurityContext, LocationDTO, CreateCheckpointDTO, ScanQRMetadata } from '../../core/architecture/types.js';
import { AttendanceType } from '../../domain/entities.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { EventBus } from '../../core/events/event-bus.js';
import { applyVendorActorScope, isVendorScopedRole, requireVendorActorScope } from '../../shared/security/vendor-actor-scope.js';
import { getOperationalDayStart } from '../../core/time/tenant-time.js';

const scanQRUseCase = new ScanQRUseCase();
const checkInUseCase = new AttendanceCheckInUseCase();
const checkOutUseCase = new AttendanceCheckOutUseCase();
const createPatrolRouteUseCase = new CreatePatrolRouteUseCase();
const createPatrolAssignmentUseCase = new CreatePatrolAssignmentUseCase();
const startPatrolSessionUseCase = new StartPatrolSessionUseCase();
const completePatrolSessionUseCase = new CompletePatrolSessionUseCase();

const openShiftSessionSchema = {
  parse(payload: unknown): {
    staffId?: string;
    shiftScheduleId?: string;
    patrolAssignmentId?: string;
    checkInAttendanceId?: string;
    metadata?: Record<string, unknown>;
  } {
    if (!payload || typeof payload !== 'object') {
      throw new Error('INVALID_OPEN_SHIFT_SESSION_PAYLOAD');
    }

    const data = payload as Record<string, unknown>;
    const result: {
      staffId?: string;
      shiftScheduleId?: string;
      patrolAssignmentId?: string;
      checkInAttendanceId?: string;
      metadata?: Record<string, unknown>;
    } = {};

    if (typeof data.staffId === 'string') result.staffId = data.staffId;
    if (typeof data.shiftScheduleId === 'string') result.shiftScheduleId = data.shiftScheduleId;
    if (typeof data.patrolAssignmentId === 'string') result.patrolAssignmentId = data.patrolAssignmentId;
    if (typeof data.checkInAttendanceId === 'string') result.checkInAttendanceId = data.checkInAttendanceId;
    if (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
      result.metadata = data.metadata as Record<string, unknown>;
    }

    return result;
  }
};

type AttendanceShiftFilter = 'today' | 'current-shift' | 'week' | 'month';

type AttendanceQuery = {
  cursor?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  shift?: AttendanceShiftFilter;
  site?: string;
  siteId?: string;
  vendor?: string;
  vendorId?: string;
  contractId?: string;
  guard?: string;
  checkInStatus?: 'all' | 'all-checkin' | 'late' | 'missing';
  gpsStatus?: 'all' | 'all-gps' | 'valid' | 'invalid' | 'missing';
  coverageStatus?: 'all' | 'all-status' | 'ok' | 'warning' | 'breach';
};

type AttendanceOpsSummaryQuery = {
  shift?: AttendanceShiftFilter;
  startDate?: string;
  endDate?: string;
  site?: string;
  siteId?: string;
  vendor?: string;
  vendorId?: string;
  contractId?: string;
};

const normalizeOptionalFilter = (value?: string | null) => {
  if (!value) return undefined;
  if (value.startsWith('all-')) return undefined;
  if (value === 'all') return undefined;
  return value;
};

const toDateOnly = (date: Date) => date.toISOString().split('T')[0] ?? date.toISOString().slice(0, 10);

const resolveAttendanceDateRange = (query: { startDate?: string; endDate?: string; shift?: AttendanceShiftFilter }) => {
  if (query.startDate || query.endDate) {
    return {
      startDate: query.startDate,
      endDate: query.endDate,
    };
  }

  const now = new Date();
  const start = new Date(now);
  const shift = query.shift ?? 'current-shift';

  if (shift === 'week') {
    const day = start.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysFromMonday);
  } else if (shift === 'month') {
    start.setDate(1);
  }

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(now),
  };
};


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
        patrolSessionId: metadata.patrolSessionId,
        scannedAt: metadata.scannedAt,
        photoEvidenceIds: metadata.photoEvidenceIds,
        note: metadata.note,
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

  static async createRoute(ctx: SecurityContext, payload: unknown) {
    return await createPatrolRouteUseCase.execute(ctx, payload);
  }

  static async createAssignment(ctx: SecurityContext, payload: unknown) {
    return await createPatrolAssignmentUseCase.execute(ctx, payload);
  }

  static async listAssignments(ctx: SecurityContext, status?: string) {
    const isVendorScoped = isVendorScopedRole(ctx.role);
    if (isVendorScoped) requireVendorActorScope(ctx);
    return await db.forTenant(ctx.tenantId, { readOnly: true }).patrolAssignment.findMany({
      where: applyVendorActorScope(ctx, {
        ...(status ? { status } : {}),
        ...(ctx.role === 'guard' ? { staffId: ctx.userId } : {}),
      }),
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
      include: {
        route: { select: { id: true, name: true, estimatedMinutes: true, siteId: true, contractId: true, vendorId: true } },
        staff: { select: { id: true, fullName: true, username: true } },
        shiftSchedule: { select: { id: true, date: true, shiftType: true, startTime: true, endTime: true } },
      }
    });
  }

  static async openShiftSession(ctx: SecurityContext, payload: unknown) {
    const data = openShiftSessionSchema.parse(payload);
    const staffId = data.staffId || ctx.userId;
    if (ctx.role === 'guard' && staffId !== ctx.userId) throw new Error('UNAUTHORIZED_ACTION');

    const existing = await db.forTenant(ctx.tenantId).shiftSession.findFirst({
      where: {
        staffId,
        status: 'OPEN',
        ...(data.shiftScheduleId ? { shiftScheduleId: data.shiftScheduleId } : {}),
      },
      orderBy: { openedAt: 'desc' }
    });
    if (existing) return existing;

    const session = await db.forTenant(ctx.tenantId).shiftSession.create({
      data: {
        staffId,
        shiftScheduleId: data.shiftScheduleId || null,
        patrolAssignmentId: data.patrolAssignmentId || null,
        checkInAttendanceId: data.checkInAttendanceId || null,
        metadata: data.metadata || {},
      }
    });

    await AuditService.log({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      action: 'OPEN_SHIFT_SESSION',
      resource: `shift-session/${session.id}`,
      status: 'SUCCESS',
      payload: { staffId, shiftScheduleId: data.shiftScheduleId || null }
    });

    return session;
  }

  static async startPatrolSession(ctx: SecurityContext, payload: unknown) {
    return await startPatrolSessionUseCase.execute(ctx, payload);
  }

  static async completePatrolSession(ctx: SecurityContext, sessionId: string) {
    return await completePatrolSessionUseCase.execute(ctx, sessionId);
  }

  static async listPatrolExceptions(ctx: SecurityContext) {
    const isVendorScoped = isVendorScopedRole(ctx.role);
    if (isVendorScoped) requireVendorActorScope(ctx);
    return await db.forTenant(ctx.tenantId, { readOnly: true }).patrolSession.findMany({
      where: applyVendorActorScope(ctx, {
        OR: [
          { status: { in: ['PARTIAL', 'MISSED', 'INVALID'] } },
          { missedCheckpointCount: { gt: 0 } },
          { lateCheckpointCount: { gt: 0 } },
          { outOfOrderCount: { gt: 0 } },
          { gpsViolationCount: { gt: 0 } },
          { evidenceMissingCount: { gt: 0 } },
        ],
        ...(ctx.role === 'guard' ? { staffId: ctx.userId } : {}),
      }),
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
      take: 100,
      include: {
        route: { select: { id: true, name: true } },
        staff: { select: { id: true, fullName: true, username: true } },
        logs: {
          where: { validationStatus: { not: 'VALID' } },
          orderBy: { createdAt: 'asc' },
          include: { checkpoint: { select: { id: true, name: true } } }
        }
      }
    });
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
    const isVendorScoped = isVendorScopedRole(ctx.role);
    if (isVendorScoped) requireVendorActorScope(ctx);
    const persistedRoutes = await db.forTenant(ctx.tenantId, { readOnly: true }).patrolRoute.findMany({
      where: applyVendorActorScope(ctx, { status: 'ACTIVE' }),
      orderBy: [{ createdAt: 'desc' }],
      include: {
        checkpoints: {
          orderBy: { sequence: 'asc' },
          include: {
            checkpoint: { select: { id: true, name: true, status: true } }
          }
        }
      }
    });

    if (persistedRoutes.length > 0) {
      return persistedRoutes.map((route: any) => ({
        id: route.id,
        name: route.name,
        description: route.description,
        siteId: route.siteId,
        contractId: route.contractId,
        vendorId: route.vendorId,
        positionName: route.positionName,
        estimatedMinutes: route.estimatedMinutes,
        requiredCompletionPercent: route.requiredCompletionPercent,
        repeatIntervalMinutes: route.repeatIntervalMinutes,
        schedule: route.complianceConfig?.schedule || null,
        isMandatory: true,
        checkpoints: route.checkpoints.map((item: any) => ({
          id: item.checkpointId,
          routeCheckpointId: item.id,
          name: item.checkpoint?.name || item.checkpointId,
          status: item.checkpoint?.status,
          checkpointOrder: item.sequence,
          isMandatory: item.isRequired,
          geoRadiusMeters: item.geoRadiusMeters,
          gpsRequired: item.gpsRequired,
          photoRequired: item.photoRequired,
          noteRequired: item.noteRequired,
        }))
      }));
    }

    const configKey = `routes_${ctx.tenantId}`;
    const customRoutesConfig = await db.withTenant('SYSTEM', async (tx) => {
      return await tx.systemConfig.findUnique({
        where: { key: configKey }
      });
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

  static async checkAttendance(ctx: SecurityContext, data: { type: string; location?: any; imageUri?: string; notes?: string; shiftScheduleId?: string; checkpointId?: string; patrolAssignmentId?: string }) {
    if (data.type === AttendanceType.CHECK_IN) {
      const record = await checkInUseCase.execute(ctx, {
        location: data.location ? (typeof data.location === 'string' ? JSON.parse(data.location) : data.location) : undefined,
        imageUri: data.imageUri,
        notes: data.notes,
        shiftScheduleId: data.shiftScheduleId,
        checkpointId: data.checkpointId,
      });
      const shiftSession = await this.openShiftSession(ctx, {
        shiftScheduleId: data.shiftScheduleId,
        patrolAssignmentId: data.patrolAssignmentId,
        checkInAttendanceId: record.id,
        metadata: {
          openedBy: 'ATTENDANCE_CHECK_IN',
          attendanceRecordId: record.id,
          isValidAttendance: record.isValid,
        }
      });
      return { ...record, shiftSession };
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

  static async getAttendanceLegacy(ctx: SecurityContext, cursor?: string, limit: number = 50, startDate?: string, endDate?: string) {
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
    const attendanceWhere = isVendorScopedRole(ctx.role)
      ? {
          ...whereClause,
          staff: {
            assignedVendorId: ctx.assignedVendorId,
            ...(ctx.assignedSiteId ? { assignedSiteId: ctx.assignedSiteId } : {}),
            ...(ctx.assignedContractId ? { assignedContractId: ctx.assignedContractId } : {}),
          }
        }
      : whereClause;
    if (isVendorScopedRole(ctx.role)) requireVendorActorScope(ctx);

    const records = await db.forTenant(ctx.tenantId, { readOnly: true }).attendanceRecord.findMany({
      where: attendanceWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { staff: { select: { fullName: true, username: true } } },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limitVal
    });

    // 2. Metadata for pagination
    const nextCursor = records.length === limitVal ? records[records.length - 1].id : null;

    // 3. Optimized DB-side aggregation (Summary) using JOIN to avoid N+1
    // FIX [P2]: Gộp summary và staff lookup vào 1 query duy nhất dùng JOIN
    const summary = await db.forTenant(ctx.tenantId, { readOnly: true }).attendanceRecord.groupBy({
      by: ['staffId'],
      where: isVendorScopedRole(ctx.role)
        ? {
            ...whereClause,
            staff: {
              assignedVendorId: ctx.assignedVendorId,
              ...(ctx.assignedSiteId ? { assignedSiteId: ctx.assignedSiteId } : {}),
              ...(ctx.assignedContractId ? { assignedContractId: ctx.assignedContractId } : {}),
            }
          }
        : whereClause,
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    const summaryStaffIds = summary.map((item: { staffId: string }) => item.staffId);
    const summaryStaffMap = summaryStaffIds.length > 0
      ? new Map((await db.forTenant(ctx.tenantId, { readOnly: true }).staff.findMany({
          where: { id: { in: summaryStaffIds } },
          select: { id: true, fullName: true },
        })).map((staff: { id: string; fullName: string | null }) => [staff.id, staff.fullName ?? staff.id]))
      : new Map<string, string>();

    return {
      records,
      nextCursor,
      summary: summary.map((item: { staffId: string; _count: { id: number }; _max: { createdAt: Date | null } }) => ({
        staffId: item.staffId,
        staffName: summaryStaffMap.get(item.staffId) || item.staffId,
        count: item._count.id,
        lastActive: item._max.createdAt,
      }))
    };
  }

  private static async resolveAttendanceScope(ctx: SecurityContext, tx: any, query: AttendanceQuery | AttendanceOpsSummaryQuery) {
    if (isVendorScopedRole(ctx.role)) requireVendorActorScope(ctx);

    const dateRange = resolveAttendanceDateRange(query);
    const siteId = normalizeOptionalFilter(query.siteId ?? query.site);
    const vendorId = normalizeOptionalFilter(query.vendorId ?? query.vendor);
    const contractId = normalizeOptionalFilter(query.contractId);

    let scopedContractIds: string[] | undefined;
    if (vendorId) {
      const contracts = await tx.contract.findMany({
        where: {
          vendorId,
          ...(siteId ? { siteId } : {}),
          ...(contractId ? { id: contractId } : {}),
        },
        select: { id: true },
      });
      scopedContractIds = contracts.map((item: { id: string }) => item.id);
    } else if (contractId) {
      scopedContractIds = [contractId];
    }

    return { dateRange, siteId, vendorId, contractId, scopedContractIds };
  }

  private static buildAttendanceWhere(ctx: SecurityContext, query: AttendanceQuery, scope: Awaited<ReturnType<typeof PatrolService.resolveAttendanceScope>>) {
    const { dateRange, siteId, contractId, scopedContractIds } = scope;
    const where: any = {};

    if (dateRange.startDate || dateRange.endDate) {
      where.createdAt = {};
      if (dateRange.startDate) where.createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) {
        const endDay = new Date(dateRange.endDate);
        endDay.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = endDay;
      }
    }

    if (query.guard) {
      where.staff = {
        ...(where.staff ?? {}),
        OR: [
          { fullName: { contains: query.guard, mode: 'insensitive' } },
          { username: { contains: query.guard, mode: 'insensitive' } },
          { id: { contains: query.guard, mode: 'insensitive' } },
        ],
      };
    }

    if (isVendorScopedRole(ctx.role)) {
      where.staff = {
        ...(where.staff ?? {}),
        assignedVendorId: ctx.assignedVendorId,
        ...(ctx.assignedSiteId ? { assignedSiteId: ctx.assignedSiteId } : {}),
        ...(ctx.assignedContractId ? { assignedContractId: ctx.assignedContractId } : {}),
      };
    }

    if (siteId || contractId || scopedContractIds) {
      where.shiftSchedule = {
        ...(siteId ? { siteId } : {}),
        ...(scopedContractIds ? { contractId: { in: scopedContractIds } } : contractId ? { contractId } : {}),
      };
    }

    if (query.checkInStatus === 'late') {
      where.lateMinutes = { gt: 0 };
    } else if (query.checkInStatus === 'missing') {
      where.type = AttendanceType.CHECK_IN;
      where.checkOutAt = null;
    }

    if (query.gpsStatus === 'invalid') {
      where.isValid = false;
    } else if (query.gpsStatus === 'missing') {
      where.location = null;
    } else if (query.gpsStatus === 'valid') {
      where.isValid = true;
      where.NOT = [{ location: null }];
    }

    if (query.coverageStatus === 'ok') {
      where.isValid = true;
      where.NOT = [...(where.NOT ?? []), { location: null }, { checkOutAt: null, type: AttendanceType.CHECK_IN }];
    } else if (query.coverageStatus === 'warning') {
      where.OR = [...(where.OR ?? []), { lateMinutes: { gt: 0 } }, { location: null }];
    } else if (query.coverageStatus === 'breach') {
      where.OR = [...(where.OR ?? []), { isValid: false }, { checkOutAt: null, type: AttendanceType.CHECK_IN }];
    }

    return where;
  }

  static async getAttendance(ctx: SecurityContext, query: AttendanceQuery = {}) {
    const limitVal = Math.min(query.limit ?? 50, 200);

    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const scope = await this.resolveAttendanceScope(ctx, tx, query);
      const attendanceWhere = this.buildAttendanceWhere(ctx, query, scope);

      const records = await tx.attendanceRecord.findMany({
        where: attendanceWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          staff: { select: { id: true, fullName: true, username: true } },
          shiftSchedule: {
            select: {
              id: true,
              date: true,
              shiftType: true,
              startTime: true,
              endTime: true,
              positionName: true,
              siteId: true,
              contractId: true,
              guardPostId: true,
            },
          },
        },
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: limitVal,
      });

      const nextCursor = records.length === limitVal ? records[records.length - 1].id : null;
      const summary = await tx.attendanceRecord.groupBy({
        by: ['staffId'],
        where: attendanceWhere,
        _count: { id: true },
        _max: { createdAt: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50,
      });

      const summaryStaffIds = summary.map((item: { staffId: string }) => item.staffId);
      const shiftScheduleIds = Array.from(new Set(records.map((item: any) => item.shiftScheduleId).filter(Boolean)));
      const siteIds = Array.from(new Set(records.map((item: any) => item.shiftSchedule?.siteId).filter(Boolean)));
      const contractIds = Array.from(new Set(records.map((item: any) => item.shiftSchedule?.contractId).filter(Boolean)));
      const guardPostIds = Array.from(new Set(records.map((item: any) => item.shiftSchedule?.guardPostId).filter(Boolean)));

      const [summaryStaff, sites, contracts, guardPosts, assignments] = await Promise.all([
        summaryStaffIds.length > 0
          ? tx.staff.findMany({ where: { id: { in: summaryStaffIds } }, select: { id: true, fullName: true } })
          : Promise.resolve([]),
        siteIds.length > 0
          ? tx.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, siteName: true } })
          : Promise.resolve([]),
        contractIds.length > 0
          ? tx.contract.findMany({
              where: { id: { in: contractIds } },
              select: { id: true, contractCode: true, contractName: true, vendorId: true, siteId: true },
            })
          : Promise.resolve([]),
        guardPostIds.length > 0
          ? tx.guardPost.findMany({ where: { id: { in: guardPostIds } }, select: { id: true, postName: true } })
          : Promise.resolve([]),
        shiftScheduleIds.length > 0
          ? tx.shiftAssignment.findMany({
              where: { shiftScheduleId: { in: shiftScheduleIds } },
              select: { shiftScheduleId: true, staffId: true, vendorId: true, contractId: true, siteId: true },
            })
          : Promise.resolve([]),
      ]);

      const vendorIds = Array.from(new Set([
        ...contracts.map((item: any) => item.vendorId).filter(Boolean),
        ...assignments.map((item: any) => item.vendorId).filter(Boolean),
      ]));
      const vendors = vendorIds.length > 0
        ? await tx.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, name: true } })
        : [];

      const summaryStaffMap = new Map(summaryStaff.map((staff: { id: string; fullName: string | null }) => [staff.id, staff.fullName ?? staff.id]));
      const siteMap = new Map(sites.map((site: { id: string; siteName: string }) => [site.id, site.siteName]));
      const contractMap = new Map<string, any>(contracts.map((contract: any) => [contract.id, contract]));
      const vendorMap = new Map<string, string>(vendors.map((vendor: { id: string; name: string }) => [vendor.id, vendor.name]));
      const guardPostMap = new Map<string, string>(guardPosts.map((post: { id: string; postName: string }) => [post.id, post.postName]));
      const assignmentMap = new Map<string, any>(assignments.map((assignment: any) => [`${assignment.shiftScheduleId}:${assignment.staffId}`, assignment]));

      const enrichedRecords = records.map((record: any) => {
        const assignment = record.shiftScheduleId ? assignmentMap.get(`${record.shiftScheduleId}:${record.staffId}`) : null;
        const resolvedContractId = assignment?.contractId || record.shiftSchedule?.contractId || null;
        const contract = resolvedContractId ? contractMap.get(resolvedContractId) : null;
        const resolvedVendorId = assignment?.vendorId || contract?.vendorId || null;
        const resolvedSiteId = assignment?.siteId || record.shiftSchedule?.siteId || contract?.siteId || null;
        const guardPostId = record.shiftSchedule?.guardPostId || null;

        return {
          ...record,
          staffName: record.staff?.fullName || record.staff?.username || record.staffId,
          siteId: resolvedSiteId,
          siteName: resolvedSiteId ? siteMap.get(resolvedSiteId) || null : null,
          vendorId: resolvedVendorId,
          vendorName: resolvedVendorId ? vendorMap.get(resolvedVendorId) || null : null,
          contractId: resolvedContractId,
          contractCode: contract?.contractCode || null,
          contractName: contract?.contractName || null,
          guardPostId,
          guardPostName: guardPostId ? guardPostMap.get(guardPostId) || null : null,
          shiftLabel: record.shiftSchedule
            ? [record.shiftSchedule.date, `${record.shiftSchedule.startTime}-${record.shiftSchedule.endTime}`, record.shiftSchedule.positionName].filter(Boolean).join(' • ')
            : null,
          shiftStart: record.shiftSchedule?.startTime || null,
          shiftEnd: record.shiftSchedule?.endTime || null,
          shiftType: record.shiftSchedule?.shiftType || null,
          lateMinutes: record.lateMinutes ?? 0,
          earlyLeaveMinutes: record.earlyLeaveMinutes ?? 0,
          gpsStatus: !record.location ? 'missing' : record.isValid === false ? 'invalid' : 'valid',
          checkInStatus: record.type === AttendanceType.CHECK_IN && !record.checkOutAt
            ? 'missing-checkout'
            : (record.lateMinutes ?? 0) > 0
              ? 'late'
              : 'ok',
          suspicionReason: record.metadata?.suspicionReason || null,
        };
      });

      return {
        records: enrichedRecords,
        nextCursor,
        summary: summary.map((item: { staffId: string; _count: { id: number }; _max: { createdAt: Date | null } }) => ({
          staffId: item.staffId,
          staffName: summaryStaffMap.get(item.staffId) || item.staffId,
          count: item._count.id,
          lastActive: item._max.createdAt,
        })),
      };
    }, { readOnly: true });
  }

  static async getAttendanceOpsSummary(ctx: SecurityContext, query: AttendanceOpsSummaryQuery = {}) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      const scope = await this.resolveAttendanceScope(ctx, tx, query);
      const { dateRange, siteId, vendorId, contractId, scopedContractIds } = scope;

      const shiftWhere: any = {};
      if (dateRange.startDate || dateRange.endDate) {
        if (dateRange.startDate && dateRange.endDate && dateRange.startDate === dateRange.endDate) {
          shiftWhere.date = dateRange.startDate;
        } else {
          shiftWhere.date = {
            ...(dateRange.startDate ? { gte: dateRange.startDate } : {}),
            ...(dateRange.endDate ? { lte: dateRange.endDate } : {}),
          };
        }
      }
      if (siteId) shiftWhere.siteId = siteId;
      if (scopedContractIds) shiftWhere.contractId = { in: scopedContractIds };
      else if (contractId) shiftWhere.contractId = contractId;

      const attendanceWhere = this.buildAttendanceWhere(ctx, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        siteId,
        vendorId,
        contractId,
      }, scope);

      const [shifts, attendanceRecords, complianceItems] = await Promise.all([
        tx.shiftSchedule.findMany({
          where: shiftWhere,
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          include: { guardPost: { select: { id: true, postName: true } } },
        }),
        tx.attendanceRecord.findMany({
          where: attendanceWhere,
          include: {
            staff: { select: { id: true, fullName: true, username: true } },
            shiftSchedule: {
              select: {
                id: true,
                date: true,
                shiftType: true,
                startTime: true,
                endTime: true,
                positionName: true,
                siteId: true,
                contractId: true,
                guardPostId: true,
              },
            },
          },
        }),
        tx.shiftComplianceItem.findMany({
          where: {
            ...(shiftWhere.date ? { date: shiftWhere.date } : {}),
            ...(scopedContractIds ? { contractId: { in: scopedContractIds } } : contractId ? { contractId } : {}),
          },
          include: {
            shiftSchedule: {
              select: {
                id: true,
                date: true,
                shiftType: true,
                startTime: true,
                endTime: true,
                positionName: true,
                siteId: true,
                contractId: true,
                guardPostId: true,
              },
            },
          },
        }),
      ]);

      const contractIds = Array.from(new Set(shifts.map((item: any) => item.contractId).filter(Boolean)));
      const siteIds = Array.from(new Set(shifts.map((item: any) => item.siteId).filter(Boolean)));
      const [contracts, sites] = await Promise.all([
        contractIds.length > 0
          ? tx.contract.findMany({
              where: { id: { in: contractIds }, ...(vendorId ? { vendorId } : {}) },
              select: { id: true, contractCode: true, contractName: true, vendorId: true, siteId: true },
            })
          : Promise.resolve([]),
        siteIds.length > 0
          ? tx.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, siteName: true } })
          : Promise.resolve([]),
      ]);
      const resolvedVendorIds = Array.from(new Set(contracts.map((item: any) => item.vendorId).filter(Boolean)));
      const vendors = resolvedVendorIds.length > 0
        ? await tx.vendor.findMany({ where: { id: { in: resolvedVendorIds } }, select: { id: true, name: true } })
        : [];

      const siteMap = new Map(sites.map((item: any) => [item.id, item.siteName]));
      const contractMap = new Map<string, any>(contracts.map((item: any) => [item.id, item]));
      const vendorMap = new Map<string, string>(vendors.map((item: any) => [item.id, item.name]));
      const complianceMap = new Map<string, any>(complianceItems.map((item: any) => [item.shiftScheduleId, item]));
      const attendanceByShift = new Map<string, any[]>();

      for (const record of attendanceRecords) {
        if (!record.shiftScheduleId) continue;
        const existing = attendanceByShift.get(record.shiftScheduleId) ?? [];
        existing.push(record);
        attendanceByShift.set(record.shiftScheduleId, existing);
      }

      const validLogs = attendanceRecords.filter((item: any) => item.isValid !== false);
      const missingCheckOutLogs = attendanceRecords.filter((item: any) => item.type === AttendanceType.CHECK_IN && !item.checkOutAt);
      const lateLogs = attendanceRecords.filter((item: any) => Number(item.lateMinutes ?? 0) > 0);
      const invalidGpsLogs = attendanceRecords.filter((item: any) => item.isValid === false || !item.location);

      const urgentItems: Array<Record<string, unknown>> = [];
      let coveredShifts = 0;
      let understaffedShifts = 0;
      let missingCheckIn = 0;
      const dailyTrendMap = new Map<string, { date: string; scheduled: number; covered: number; exceptions: number }>();

      for (const shift of shifts) {
        const shiftAttendance = attendanceByShift.get(shift.id) ?? [];
        const validCheckIns = shiftAttendance.filter((item: any) => item.type === AttendanceType.CHECK_IN && item.isValid !== false);
        const compliance = complianceMap.get(shift.id);
        const actualCount = compliance?.actualCount ?? validCheckIns.length;
        const missingCount = compliance?.missingCount ?? Math.max(0, Number(shift.requiredCount ?? 0) - actualCount);
        const covered = actualCount >= Number(shift.requiredCount ?? 0);

        if (covered) coveredShifts += 1;
        if (missingCount > 0) understaffedShifts += 1;
        missingCheckIn += missingCount;

        const trend = dailyTrendMap.get(shift.date) ?? { date: shift.date, scheduled: 0, covered: 0, exceptions: 0 };
        trend.scheduled += 1;
        if (covered) trend.covered += 1;
        if (missingCount > 0) trend.exceptions += missingCount;
        dailyTrendMap.set(shift.date, trend);

        if (missingCount > 0) {
          const contract = contractMap.get(shift.contractId);
          const resolvedVendorId = contract?.vendorId || null;
          urgentItems.push({
            id: `understaffed-${shift.id}`,
            severity: missingCount >= 2 ? 'CRITICAL' : 'WARNING',
            type: 'UNDERSTAFFED',
            siteId: shift.siteId,
            siteName: siteMap.get(shift.siteId) || null,
            vendorId: resolvedVendorId,
            vendorName: resolvedVendorId ? vendorMap.get(resolvedVendorId) || null : null,
            contractId: shift.contractId,
            shiftScheduleId: shift.id,
            shiftLabel: [shift.date, `${shift.startTime}-${shift.endTime}`, shift.positionName].filter(Boolean).join(' • '),
            occurredAt: new Date(`${shift.date}T${shift.startTime}:00.000Z`).toISOString(),
            nextAction: 'Điều phối nhân sự',
          });
        }
      }

      for (const record of missingCheckOutLogs) {
        urgentItems.push({
          id: `missing-checkout-${record.id}`,
          severity: 'WARNING',
          type: 'MISSING_CHECKOUT',
          siteId: record.shiftSchedule?.siteId || null,
          siteName: record.shiftSchedule?.siteId ? siteMap.get(record.shiftSchedule.siteId) || null : null,
          vendorId: null,
          vendorName: null,
          contractId: record.shiftSchedule?.contractId || null,
          shiftScheduleId: record.shiftScheduleId || null,
          shiftLabel: record.shiftSchedule ? [record.shiftSchedule.date, `${record.shiftSchedule.startTime}-${record.shiftSchedule.endTime}`, record.shiftSchedule.positionName].filter(Boolean).join(' • ') : null,
          guardName: record.staff?.fullName || record.staff?.username || record.staffId,
          occurredAt: new Date(record.createdAt).toISOString(),
          nextAction: 'Xác nhận check-out',
        });
      }

      for (const record of invalidGpsLogs.filter((item: any) => item.isValid === false).slice(0, 20)) {
        urgentItems.push({
          id: `wrong-gps-${record.id}`,
          severity: 'CRITICAL',
          type: 'WRONG_GPS',
          siteId: record.shiftSchedule?.siteId || null,
          siteName: record.shiftSchedule?.siteId ? siteMap.get(record.shiftSchedule.siteId) || null : null,
          vendorId: null,
          vendorName: null,
          contractId: record.shiftSchedule?.contractId || null,
          shiftScheduleId: record.shiftScheduleId || null,
          shiftLabel: record.shiftSchedule ? [record.shiftSchedule.date, `${record.shiftSchedule.startTime}-${record.shiftSchedule.endTime}`, record.shiftSchedule.positionName].filter(Boolean).join(' • ') : null,
          guardName: record.staff?.fullName || record.staff?.username || record.staffId,
          occurredAt: new Date(record.createdAt).toISOString(),
          nextAction: 'Kiểm tra GPS / bằng chứng',
        });
      }

      return {
        period: query.shift ?? (dateRange.startDate === dateRange.endDate ? 'today' : 'week'),
        totals: {
          scheduledShifts: shifts.length,
          coveredShifts,
          understaffedShifts,
          missingCheckIn,
          missingCheckOut: missingCheckOutLogs.length,
          lateCheckIn: lateLogs.length,
          invalidGps: invalidGpsLogs.length,
          validAttendanceRate: attendanceRecords.length > 0 ? Math.round((validLogs.length / attendanceRecords.length) * 100) : 0,
        },
        urgentItems: urgentItems
          .sort((a: any, b: any) => {
            const severityScore = (value: string) => value === 'CRITICAL' ? 2 : 1;
            return severityScore(String(b.severity)) - severityScore(String(a.severity))
              || new Date(String(b.occurredAt)).getTime() - new Date(String(a.occurredAt)).getTime();
          })
          .slice(0, 12),
        dailyTrend: Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      };
    }, { readOnly: true });
  }

  static async getMyAttendance(ctx: SecurityContext, limit: number = 20) {
    const today = getOperationalDayStart();
    const limitVal = Math.min(Math.max(limit, 1), 50);

    return await db.forTenant(ctx.tenantId, { readOnly: true }).attendanceRecord.findMany({
      where: {
        staffId: ctx.userId,
        createdAt: { gte: today },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limitVal,
    });
  }

  static async dispatchMissedPatrolChecks() {
    const tenants = await db.withTenant('SYSTEM', async (tx) => {
      return await tx.tenant.findMany({
        where: { status: 'active' },
        select: { id: true },
      });
    });
    const { getLightQueue } = await import('../../core/queue/index.js');
    const queue = getLightQueue();
    if (tenants.length > 0) {
      await queue.addBulk(tenants.map((tenant: any) => ({
        name: 'PATROL_MISSED_CHECK_TENANT',
        data: { type: 'PATROL_MISSED_CHECK_TENANT', tenantId: tenant.id },
        opts: { jobId: `patrol-missed:${tenant.id}:${Math.floor(Date.now() / 60000)}` },
      })));
    }
    return { triggeredTenants: tenants.length };
  }

  static async processMissedAssignments(tenantId: string) {
    const now = new Date();
    return await db.withTenant(tenantId, async (tx: any) => {
      const assignments = await tx.patrolAssignment.findMany({
        where: {
          status: 'PLANNED',
          endAt: { lt: now },
        },
        include: { route: true, staff: { select: { id: true, fullName: true } } },
        take: 100,
      });

      for (const assignment of assignments) {
        const idempotencyKey = `patrol-assignment-missed:${assignment.id}`;
        await tx.violationEvent.upsert({
          where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
          update: { status: 'PENDING_REVIEW' },
          create: {
            tenantId,
            vendorId: assignment.vendorId || assignment.route.vendorId || null,
            contractId: assignment.contractId || assignment.route.contractId || null,
            siteId: assignment.route.siteId || null,
            staffId: assignment.staffId,
            sourceType: 'PATROL_ASSIGNMENT',
            violationType: 'PATROL_NOT_STARTED',
            severity: 'HIGH',
            status: 'PENDING_REVIEW',
            idempotencyKey,
            evidence: {
              routeId: assignment.routeId,
              assignmentId: assignment.id,
              plannedEndAt: assignment.endAt,
            },
            metadata: {
              routeName: assignment.route.name,
              staffName: assignment.staff?.fullName,
            },
          },
        });

        await tx.patrolAssignment.update({
          where: { id: assignment.id },
          data: { status: 'MISSED' },
        });

        await EventBus.dispatch({
          type: 'PATROL_ASSIGNMENT_MISSED',
          version: '1.0',
          tenantId,
          actorId: 'SYSTEM',
          payload: { assignmentId: assignment.id, routeId: assignment.routeId, staffId: assignment.staffId },
        }, tx);
      }

      return { missedAssignments: assignments.length };
    });
  }
}
