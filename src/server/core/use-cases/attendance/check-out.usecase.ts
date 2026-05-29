import { z } from 'zod';
import { SecurityContext, LocationDTO } from '../../architecture/types.js';
import { AttendanceType } from '../../../domain/entities.js';
import { db } from '../../db/prisma.js';
import { getOperationalDayStart } from '../../time/tenant-time.js';
import { BadRequestError } from '../../errors/domain.error.js';

import { AttendanceCalculator } from './attendance-calculator.js';

const checkOutPayloadSchema = z.object({
  location: z.object({
    lat: z.number(),
    lon: z.number(),
    accuracy: z.number().optional(),
  }).optional(),
  imageUri: z.string().optional(),
  notes: z.string().optional(),
});

interface CheckOutPayload {
  location?: LocationDTO;
  imageUri?: string;
  notes?: string;
}

export class AttendanceCheckOutUseCase {
  async execute(ctx: SecurityContext, payload: CheckOutPayload) {
    const validated = checkOutPayloadSchema.safeParse(payload);
    if (!validated.success) {
      throw new BadRequestError(`Dữ liệu check-out không hợp lệ: ${validated.error.errors.map((e) => e.message).join(', ')}`);
    }

    const today = getOperationalDayStart();

    // Find the open check-in record for today
    const openCheckIn = await db.forTenant(ctx.tenantId).attendanceRecord.findFirst({
      where: { 
        staffId: ctx.userId, 
        type: AttendanceType.CHECK_IN, 
        checkOutAt: null, // Still open
        createdAt: { gte: today } 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!openCheckIn || !openCheckIn.checkInAt) {
      throw new Error('NOT_CHECKED_IN');
    }

    const checkOutTime = new Date();
    
    // 1. Calculate metrics using shared utility (8 Pillars & Reconciliation Compliance)
    const { workedMinutes, earlyLeaveMinutes, isValid } = await AttendanceCalculator.calculateMetrics(
      ctx.tenantId,
      openCheckIn.checkInAt,
      openCheckIn.shiftScheduleId
    );

    // 2. Wrap in transaction to create CHECK_OUT event and update CHECK_IN (Atomicity Guarantee)
    const newCheckOutLog = await db.withTenant(ctx.tenantId, async (tx: any) => {
      // 2.1 Update existing check-in to close it
      await tx.attendanceRecord.update({
        where: { id: openCheckIn.id },
        data: {
          checkOutAt: checkOutTime,
          workedMinutes,
          earlyLeaveMinutes,
          isValid
        }
      });

      // 2.2 Create the CHECK_OUT log entry (Identity & Audit Trail)
      return await tx.attendanceRecord.create({
        data: {
          tenantId: ctx.tenantId,
          staffId: ctx.userId,
          type: AttendanceType.CHECK_OUT,
          location: validated.data.location ? (validated.data.location as any) : null,
          imageUri: validated.data.imageUri || null,
          notes: validated.data.notes || null,
          shiftScheduleId: openCheckIn.shiftScheduleId,
          checkInAt: openCheckIn.checkInAt,
          checkOutAt: checkOutTime,
          workedMinutes,
          earlyLeaveMinutes,
          isValid
        }
      });
    });

    return newCheckOutLog;
  }
}
