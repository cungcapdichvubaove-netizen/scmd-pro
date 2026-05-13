import { Request, Response, NextFunction } from 'express';
import { NewsRepository } from './news.repository.js';
import { logger } from '../../core/logger/index.js';

export class NewsController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const news = await NewsRepository.getAll();
      return res.json(news);
    } catch (err: any) {
      logger.error({ err }, 'Error fetching all news');
      return next(err);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const news = await NewsRepository.getBySlug(slug as string);
      if (!news) {
        return res.status(404).json({ error: 'News not found' });
      }
      return res.json(news);
    } catch (err: any) {
      logger.error({ err }, 'Error fetching news by slug');
      return next(err);
    }
  }
}
