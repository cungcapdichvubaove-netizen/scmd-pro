import { db } from '../../db/prisma.js';

export interface AttendanceMetrics {
  workedMinutes: number;
  earlyLeaveMinutes: number;
  isValid: boolean;
}

export class AttendanceCalculator {
  static async calculateMetrics(tenantId: string, checkInAt: Date, shiftScheduleId?: string | null): Promise<AttendanceMetrics> {
    const checkOutAt = new Date();
    let workedMinutes = 0;
    let earlyLeaveMinutes = 0;

    // 1. Calculate worked time
    const diffMs = checkOutAt.getTime() - checkInAt.getTime();
    workedMinutes = Math.max(0, Math.floor(diffMs / 60000));

    // 2. Rule from AGENTS.md: Shift Reconciliation defines valid guard session as workedMinutes >= 30
    const isValid = workedMinutes >= 30;

    // 3. Early Leave Calculation
    if (shiftScheduleId) {
      const shift = await db.forTenant(tenantId).shiftSchedule.findUnique({
        where: { id: shiftScheduleId }
      });

      if (shift) {
        // e.g., shift.endTime is "17:00", shift.date is "2024-05-20"
        const [year, month, day] = shift.date.split('-').map(Number);
        const [hours, minutes] = shift.endTime.split(':').map(Number);
        
        // Construct shift end date object
        const shiftEnd = new Date(year, month - 1, day, hours, minutes, 0, 0);
        
        // Handle night shifts
        const [startHours] = shift.startTime.split(':').map(Number);
        if (hours < startHours) {
          shiftEnd.setDate(shiftEnd.getDate() + 1);
        }
        
        // If they checkout before the official shift end
        const earlyMs = shiftEnd.getTime() - checkOutAt.getTime();
        if (earlyMs > 60000) { // More than 1 minute early
          earlyLeaveMinutes = Math.floor(earlyMs / 60000);
        }
      }
    }

    return { workedMinutes, earlyLeaveMinutes, isValid };
  }
}
