import { Request, Response, NextFunction } from 'express';
import { RequestContextResolver } from '../../core/context/index.js';
import { logger } from '../../core/logger/index.js';
import { CreateAuditUseCase, createAuditSchema } from './application/create-audit.usecase.js';
import { db } from '../../core/db/prisma.js';

export class AuditController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createAuditSchema.parse(req.body);
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CreateAuditUseCase();
      const audit = await useCase.execute(ctx, data);
      return res.status(201).json(audit);
    } catch (err: any) {
      logger.error({ err }, 'Create audit error');
      return next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { siteId, from, to, cursor, take } = req.query;

      const limit = Math.min(Number(take) || 20, 200);

      const audits = await db.forTenant(ctx.tenantId).audit.findMany({
        where: {
          ...(siteId ? { siteId: String(siteId) } : {}),
          ...(from || to ? {
            createdAt: {
              ...(from ? { gte: new Date(String(from)) } : {}),
              ...(to ? { lte: new Date(String(to)) } : {})
            }
          } : {})
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' }
        ],
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {})
      });

      let nextCursor = null;
      if (audits.length > limit) {
        const nextItem = audits.pop();
        nextCursor = nextItem?.id || null;
      }

      return res.json({ data: audits, nextCursor });
    } catch (err: any) {
      logger.error({ err }, 'List audits error');
      return next(err);
    }
  }
}
