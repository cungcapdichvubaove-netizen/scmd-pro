import { z } from 'zod';
import { SecurityContext } from '../../architecture/types.js';
import { AttendanceType } from '../../../domain/entities.js';
import { db } from '../../db/prisma.js';
import { calculateDistance } from '../../../../shared/utils/geo.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { logger } from '../../logger/index.js';
import { getOperationalDayStart, shiftLocalDateTimeToUtc } from '../../time/tenant-time.js';
import { 
  BadRequestError, 
  ConflictError, 
  NotFoundError 
} from '../../errors/domain.error.js';

// SEC-002: Strict Validation Schema for Attendance
const checkInPayloadSchema = z.object({
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional()
  }),
  imageUri: z.string().optional(),
  notes: z.string().optional(),
  shiftScheduleId: z.string().optional(),
  checkpointId: z.string().optional()
});

export type CheckInPayload = z.infer<typeof checkInPayloadSchema>;

export class AttendanceCheckInUseCase {
  async execute(ctx: SecurityContext, payload: CheckInPayload) {
    // 1. Input Validation (Zero Trust)
    const validated = checkInPayloadSchema.safeParse(payload);
    if (!validated.success) {
      throw new BadRequestError(`Dữ liệu check-in không hợp lệ: ${validated.error.errors.map(e => e.message).join(', ')}`);
    }

    const { location, imageUri, notes, shiftScheduleId, checkpointId } = validated.data;
    const today = getOperationalDayStart();

    // 2. Ensure no active open check-in (Tenant Isolation via db.forTenant)
    const existingCheckIn = await db.forTenant(ctx.tenantId).attendanceRecord.findFirst({
      where: {
        staffId: ctx.userId,
        type: AttendanceType.CHECK_IN,
        checkOutAt: null,
        createdAt: { gte: today }
      }
    });

    if (existingCheckIn) {
      throw new ConflictError('Bạn đã có một lượt check-in chưa hoàn tất trong ngày hôm nay.');
    }

    let lateMinutes = 0;
    let isValid = true;
    let suspicionReason: string | null = null;
    let checkpointDistanceMeters: number | null = null;

    // 3. Proximity check (Anti-Fraud GPS)
    if (!checkpointId) {
      isValid = false;
      suspicionReason = 'MISSING_CHECKPOINT: Cannot verify check-in GPS without checkpointId';
      logger.warn({
        userId: ctx.userId,
        tenantId: ctx.tenantId
      }, 'SUSPICIOUS_GPS: Guard attempted check-in without checkpoint context');
    } else {
      const checkpoint = await PatrolRepository.getCheckpointById(ctx.tenantId, checkpointId);
      if (!checkpoint) {
        throw new NotFoundError('Điểm check-in (Checkpoint) không tồn tại.');
      }

      checkpointDistanceMeters = calculateDistance(
        location.lat, 
        location.lon, 
        (checkpoint as any).latitude, 
        (checkpoint as any).longitude
      );

      // Rule 5.1: Max tolerance < 50m
      if (checkpointDistanceMeters > 50) {
        isValid = false;
        suspicionReason = `Vị trí check-in sai lệch ${Math.round(checkpointDistanceMeters)}m (Giới hạn: 50m)`;
        logger.warn({ 
          userId: ctx.userId, 
          distance: checkpointDistanceMeters, 
          checkpointId 
        }, 'SUSPICIOUS_GPS: Guard attempted check-in from unauthorized distance');
      }
    }

    // 4. Late Calculation
    if (shiftScheduleId) {
      const shift = await db.forTenant(ctx.tenantId).shiftSchedule.findUnique({
        where: { id: shiftScheduleId }
      });
      
      if (shift) {
        const shiftStart = shiftLocalDateTimeToUtc(shift.date, shift.startTime);
        
        const now = new Date();
        const diffMs = now.getTime() - shiftStart.getTime();
        
        if (diffMs > 60000) {
          lateMinutes = Math.floor(diffMs / 60000);
        }
      }
    }

    // 5. Atomic Create
    const record = await db.forTenant(ctx.tenantId).attendanceRecord.create({
      data: {
        tenantId: ctx.tenantId,
        staffId: ctx.userId,
        type: AttendanceType.CHECK_IN,
        location: location as any,
        imageUri: imageUri || null,
        notes: notes || null,
        shiftScheduleId: shiftScheduleId || null,
        checkInAt: new Date(),
        lateMinutes: lateMinutes,
        isValid: isValid,
        // Using JSON metadata for suspicion details to keep schema clean but auditable
        metadata: isValid ? {} : {
          isSuspicious: true,
          suspicionReason,
          checkpointId: checkpointId || null,
          distanceMeters: checkpointDistanceMeters !== null ? Math.round(checkpointDistanceMeters) : null
        } as any
      }
    });

    return record;
  }
}
