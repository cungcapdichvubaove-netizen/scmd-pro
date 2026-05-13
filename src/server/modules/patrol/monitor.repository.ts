import { SecurityContext } from '../../core/architecture/types.js';
import { PatrolRepository } from './repositories/patrol.repository.js';

export class MonitorRepository {
  static async getTrustScoreByTenant(ctx: SecurityContext) {
    // Logic: Calculate based on anomalies in recent logs
    const result = await PatrolRepository.getLogsByTenant(ctx, undefined, 100);
    const logs = result.data;
    const anomalies = logs.filter((l: any) => (l.metadata as any)?.status === 'danger' || (l.metadata as any)?.anomaly).length;
    
    const score = logs.length > 0 ? Math.max(0, 100 - (anomalies / logs.length * 200)) : 100;
    
    return { 
      tenantId: ctx.tenantId, 
      averageScore: Math.round(score), 
      status: score > 90 ? 'EXCELLENT' : (score > 70 ? 'GOOD' : 'WARNING'),
      trend: [] 
    };
  }

  static async getAnomaliesByTenant(ctx: SecurityContext) {
    // Real data from Prisma logs
    const result = await PatrolRepository.getLogsByTenant(ctx, undefined, 50);
    const logs = result.data;
    const dangerLogs = logs.filter((l: any) => (l.metadata as any)?.status === 'danger' || (l.metadata as any)?.anomaly);

    return { 
      tenantId: ctx.tenantId, 
      anomalies: dangerLogs,
      stats: { 
        totalCount: dangerLogs.length, 
        stationaryCount: dangerLogs.filter((l: any) => (l.metadata as any)?.anomaly === 'STATIONARY_ALERT').length, 
        missedCount: 0, 
        criticalCount: dangerLogs.filter((l: any) => (l.metadata as any)?.status === 'danger').length 
      } 
    };
  }
}
