import { Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { CommandCenterRepository } from './command-center.repository.js';

export class CommandCenterController {
  static async getFeed(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const feed = await CommandCenterRepository.getFeedByTenant(tenantId);
      return res.json(feed);
    } catch (err: any) {
      logger.error({ err }, 'Get feed error');
      return next(err);
    }
  }

  static async getMapData(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const mapData = await CommandCenterRepository.getMapDataByTenant(tenantId);
      return res.json(mapData);
    } catch (err: any) {
      logger.error({ err }, 'Get map data error');
      return next(err);
    }
  }

  static async getPriorities(req: any, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      const priorities = await CommandCenterRepository.getPrioritiesByTenant(tenantId);
      return res.json(priorities);
    } catch (err: any) {
      logger.error({ err }, 'Get priorities error');
      return next(err);
    }
  }
}
