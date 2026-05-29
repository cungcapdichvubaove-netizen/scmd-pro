import { Express } from 'express';
import { createRouter } from '../routes.js';
import { errorHandler } from '../core/middleware/error.middleware.js';
import { logger } from '../core/logger/index.js';

export async function registerApiRoutes(app: Express) {
  const apiRouter = createRouter();
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
  });

  try {
    const { setupBullBoard } = await import('../core/queue/bull-board.js');
    const { requireAuth, requireRole } = await import('../shared/middlewares/auth.middleware.js');
    const { UserRole } = await import('../core/architecture/types.js');
    app.use('/api/admin/queues', requireAuth, requireRole([UserRole.SUPER_ADMIN]), setupBullBoard());
    logger.info('Bull Board UI integrated at /api/admin/queues');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Bull Board UI');
  }

  app.use('/api', errorHandler);
}
