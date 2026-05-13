import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { GeminiService } from '../../ai/gemini.service.js';
import { logger } from '../../logger/index.js';

export class AnalyzeLogUseCase extends BaseUseCase<{ logId: string }, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    if (!context.userId) throw new Error('UNAUTHORIZED');
    // Only management can trigger explicit AI analysis
    if (context.role === UserRole.GUARD) {
      throw new Error('FORBIDDEN: Only supervisors or admins can analyze logs');
    }
  }

  protected async internalExecute(context: SecurityContext, params: { logId: string }): Promise<any> {
    const log = await PatrolRepository.getLogById(context, params.logId);
    if (!log) throw new Error('NOT_FOUND: Patrol log not found');

    const metadata = log.metadata || {};
    // Extract GPS points from metadata
    const gpsData = metadata.location ? [{
      lat: metadata.location.latitude,
      lon: metadata.location.longitude,
      timestamp: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString()
    }] : [];

    const imageUri = metadata.photoUrl || null;

    logger.info({ logId: params.logId, tenantId: context.tenantId }, 'Starting AI analysis for patrol log');

    const startTime = Date.now();
    try {
      const result = await GeminiService.analyzePatrolAnomaly(gpsData, imageUri);
      const duration = Date.now() - startTime;

      // Track SLO Metric
      import('../../metrics.js').then(({ metrics }) => {
        metrics.recordSLO('ai_analysis_duration', duration, {
          tenant_id: context.tenantId,
          outcome: 'success'
        });
      });
      
      return {
        ...result,
        analyzedAt: new Date().toISOString(),
        logId: params.logId
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      import('../../metrics.js').then(({ metrics }) => {
        metrics.recordSLO('ai_analysis_duration', duration, {
          tenant_id: context.tenantId,
          outcome: 'error',
          error_code: err.code || 'UNKNOWN'
        });
        metrics.incrementCounter('ai_analysis_errors', { tenant_id: context.tenantId });
      });

      logger.error({ err, logId: params.logId }, 'AI analysis failed');
      throw new Error(`AI_ANALYSIS_FAILED: ${err.message}`);
    }
  }
}
