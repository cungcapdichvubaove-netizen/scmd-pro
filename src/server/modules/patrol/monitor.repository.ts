import { SecurityContext } from '../../core/architecture/types.js';
import { PatrolRepository } from './repositories/patrol.repository.js';

export class MonitorRepository {
  private static isAnomaly(log: any): boolean {
    const metadata = (log?.metadata || {}) as Record<string, any>;
    return metadata.status === 'danger'
      || Boolean(metadata.anomaly)
      || log.validationStatus === 'INVALID'
      || log.validationStatus === 'SUSPICIOUS'
      || (Array.isArray(log.exceptionCodes) && log.exceptionCodes.length > 0)
      || Boolean(log.isSuspicious);
  }

  static async getTrustScoreByTenant(ctx: SecurityContext) {
    // Logic: Calculate based on validated exception fields, not only metadata.
    const result = await PatrolRepository.getLogsByTenant(ctx, undefined, 100);
    const logs = Array.isArray((result as any)?.data) ? (result as any).data : [];
    const anomalies = logs.filter(MonitorRepository.isAnomaly).length;
    
    const score = logs.length > 0 ? Math.max(0, 100 - (anomalies / logs.length * 200)) : 100;
    
    return { 
      tenantId: ctx.tenantId, 
      averageScore: Math.round(score), 
      status: score > 90 ? 'EXCELLENT' : (score > 70 ? 'GOOD' : 'WARNING'),
      trend: [] 
    };
  }

  static async getAnomaliesByTenant(ctx: SecurityContext) {
    // Real data from Prisma logs. Repository returns a paginated envelope: { data, nextCursor }.
    const result = await PatrolRepository.getLogsByTenant(ctx, undefined, 50);
    const logs = Array.isArray((result as any)?.data) ? (result as any).data : [];
    const dangerLogs = logs.filter(MonitorRepository.isAnomaly);

    return { 
      tenantId: ctx.tenantId, 
      anomalies: dangerLogs,
      stats: { 
        totalCount: dangerLogs.length, 
        stationaryCount: dangerLogs.filter((l: any) => (l.metadata as any)?.anomaly === 'STATIONARY_ALERT').length, 
        missedCount: dangerLogs.filter((l: any) => Array.isArray(l.exceptionCodes) && l.exceptionCodes.some((code: string) => code.includes('MISSED'))).length, 
        criticalCount: dangerLogs.filter((l: any) => (l.metadata as any)?.status === 'danger' || l.validationStatus === 'INVALID').length 
      } 
    };
  }
}
