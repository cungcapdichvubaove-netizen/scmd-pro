import { Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { GetPredictiveAnalysisUseCase } from '../../core/use-cases/analytics/get-predictive-analysis.usecase.js';

export class PredictiveGuardingController {
  /**
   * Predict security blind spots and suggest dynamic routes
   */
  static async getBlindSpotAnalysis(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const analysis = await GetPredictiveAnalysisUseCase.execute(tenantId);
      return res.json(analysis);
    } catch (err: any) {
      logger.error({ err, tenantId: req.user.tenantId }, 'Predictive Guarding Analysis Error');
      return next(err);
    }
  }
}
