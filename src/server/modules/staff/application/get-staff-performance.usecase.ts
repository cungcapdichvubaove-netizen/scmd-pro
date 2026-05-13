import { SecurityContext } from '../../../core/architecture/types.js';
import { db } from '../../../core/db/prisma.js';
import { StaffRepository } from '../staff.repository.js';

export class GetStaffPerformanceUseCase {
  async execute(ctx: SecurityContext, staffId: string) {
    return await db.withTenant(ctx.tenantId, async (tx: any) => {
      // 0. Get Staff for idNumber
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        select: { idNumber: true }
      });

      // 1. Get Performance Metrics (last 6 months)
      const metrics = await tx.staffPerformanceMetric.findMany({
        where: { staffId },
        orderBy: { period: 'desc' },
        take: 6
      });

      // 2. Get Disciplinary Actions
      const disciplinaryActions = await tx.disciplinaryAction.findMany({
        where: { staffId },
        orderBy: { occurredAt: 'desc' }
      });

      // 3. Get recent stats from patrol logs and attendance (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const patrolCount = await tx.patrolLog.count({
        where: { staffId, createdAt: { gte: thirtyDaysAgo } }
      });

      const sosCountRecent = await tx.incident.count({
        where: { staffId, type: 'SOS', createdAt: { gte: thirtyDaysAgo } }
      });

      // 4. Smart Recognition: Cross-Tenant Reputation
      let reputation = undefined;
      if (staff?.idNumber) {
        const repData = await StaffRepository.checkReputation(staff.idNumber);
        
        let status = 'CLEAN';
        if (repData.severeViolations > 0 || repData.violations > 3) {
          status = 'CRITICAL';
        } else if (repData.violations > 0 || repData.incidents > 5) {
          status = 'WARNING';
        }
        
        reputation = { ...repData, status };
      }

      // Fallback: If metrics are empty, provide mock data for the "Trust Score History" feature (only in DEV)
      const isDev = process.env.NODE_ENV !== 'production';
      const effectiveMetrics = metrics.length > 0 ? metrics : (isDev ? this.generateMockHistory() : []);

      return {
        metrics: effectiveMetrics,
        disciplinaryActions,
        summary: {
          patrolCount,
          sosCountRecent,
          currentTrustScore: effectiveMetrics[0]?.trustScore || 0,
          attendanceRate: effectiveMetrics[0]?.attendanceRate || 0,
          reputation
        }
      };
    });
  }

  private generateMockHistory() {
    const history = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      history.push({
        id: `mock-${period}`,
        period,
        trustScore: Number((85 + Math.random() * 10).toFixed(1)),
        attendanceRate: Number((92 + Math.random() * 7).toFixed(1)),
        missedPoints: Math.floor(Math.random() * 3),
        sosCount: Math.floor(Math.random() * 2),
        createdAt: new Date()
      });
    }
    return history;
  }
}
