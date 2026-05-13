import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { MonitorRepository } from './monitor.repository.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { ExportWatcherPdfUseCase } from './application/export-watcher-pdf.usecase.js';

export class MonitorController {
  static async getTrustScore(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const data = await MonitorRepository.getTrustScoreByTenant(ctx);
      res.json(data);
    } catch (err: any) {
      logger.error({ err }, 'Get trust score error');
      return next(err);
    }
  }

  static async getAnomalies(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const data = await MonitorRepository.getAnomaliesByTenant(ctx);
      res.json(data);
    } catch (err: any) {
      logger.error({ err }, 'Get anomalies error');
      return next(err);
    }
  }

  static async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new ExportWatcherPdfUseCase();
      const result = await useCase.execute(ctx);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Failed to export watcher PDF');
      return next(err);
    }
  }
}
