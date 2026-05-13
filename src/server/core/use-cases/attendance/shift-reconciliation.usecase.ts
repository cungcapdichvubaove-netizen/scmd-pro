import { db } from '../../db/prisma.js';
import { AttendanceType } from '../../../domain/entities.js';

interface ReconcilePayload {
  tenantId: string;
  dateStr: string; // YYYY-MM-DD
}

export class ShiftReconciliationUseCase {
  async execute(payload: ReconcilePayload) {
    const { tenantId, dateStr } = payload;

    return await db.withTenant(tenantId, async (tx: any) => {
      // 1. Fetch all shift schedules with their attendance and compliance items in ONE query
      const shifts = await tx.shiftSchedule.findMany({
        where: { date: dateStr },
        include: {
          attendanceRecords: {
            where: {
              type: AttendanceType.CHECK_IN,
              isValid: true
            }
          },
          complianceItems: true
        }
      });

      if (shifts.length === 0) return [];

      // 2. Fetch all unique contracts involved in one query
      const contractIds = [...new Set(shifts.map((s: any) => s.contractId))];
      const contracts = await tx.contract.findMany({
        where: { id: { in: contractIds } }
      });
      const contractMap = new Map(contracts.map((c: any) => [c.id, c]));

      const results = [];

      // 3. Process logic in-memory and perform writes using the transaction client
      for (const shift of shifts) {
        const validGuards = (shift.attendanceRecords || []).filter((a: any) => 
          a.workedMinutes && a.workedMinutes >= 30
        );

        const actualCount = validGuards.length;
        const requiredCount = shift.requiredCount;
        const missingCount = Math.max(0, requiredCount - actualCount);
        const excessCount = Math.max(0, actualCount - requiredCount);
        const complianceRate = requiredCount > 0 ? Math.min(100, (actualCount / requiredCount) * 100) : 100;

        let penaltyAmount = 0;
        if (missingCount > 0) {
          const contract = contractMap.get(shift.contractId) as any;
          if (contract && contract.slaConfig) {
            const sla = contract.slaConfig as any;
            if (sla.penaltyPerMissingGuard) {
              penaltyAmount = missingCount * Number(sla.penaltyPerMissingGuard);
            }
          }
        }

        const existingItem = (shift.complianceItems || [])[0];
        const status = missingCount > 0 ? 'PENALIZED' : 'RESOLVED';

        let complianceItem;
        if (existingItem) {
          complianceItem = await tx.shiftComplianceItem.update({
            where: { id: existingItem.id },
            data: {
              actualCount,
              missingCount,
              excessCount,
              complianceRate,
              penaltyAmount,
              status,
              updatedAt: new Date()
            }
          });
        } else {
          complianceItem = await tx.shiftComplianceItem.create({
            data: {
              tenantId,
              shiftScheduleId: shift.id,
              contractId: shift.contractId,
              date: dateStr,
              requiredCount,
              actualCount,
              missingCount,
              excessCount,
              complianceRate,
              penaltyAmount,
              status,
            }
          });
        }
        results.push(complianceItem);
      }

      return results;
    });
  }
}
