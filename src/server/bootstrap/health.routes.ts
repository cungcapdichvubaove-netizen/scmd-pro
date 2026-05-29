import { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../core/auth/secrets.js';
import { UserRole } from '../core/architecture/types.js';

export function registerHealthRoutes(app: Express) {
  const healthHandler = (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      service: process.env.SERVICE_TYPE || 'ALL'
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/api/v1/health', healthHandler);

  app.get('/api/health/worker', async (_req, res) => {
    try {
      const { QueueService } = await import('../core/queue/index.js');
      const health = await QueueService.getWorkerHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch {
      res.status(500).json({ error: 'Worker health check failed' });
    }
  });

  app.get('/api/health/detailed', async (req, res): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) {
        void res.status(401).json({ error: 'Không được phép truy cập' });
        return;
      }
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.role !== UserRole.SUPER_ADMIN) {
        void res.status(403).json({ error: 'Từ chối truy cập: chỉ Super Admin mới được phép' });
        return;
      }
    } catch {
      void res.status(401).json({ error: 'Không được phép truy cập: mã xác thực không hợp lệ' });
      return;
    }

    try {
      const { db } = await import('../core/db/prisma.js');
      const { redisClient } = await import('../core/redis.js');
      const checks = await Promise.allSettled([
        db.system().$queryRaw`SELECT 1`.then(() => 'ok'),
        new Promise<string>((resolve, reject) => {
          if (!redisClient) return reject('No redis');
          redisClient.ping((err) => {
            if (err) reject(err);
            else resolve('ok');
          });
        })
      ]);
      return void res.json({
        status: checks.every((c) => c.status === 'fulfilled') ? 'ok' : 'degraded',
        postgres: checks[0].status === 'fulfilled' ? 'ok' : 'error',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'error',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch {
      return void res.status(500).json({ error: 'Health check failed' });
    }
  });
}
