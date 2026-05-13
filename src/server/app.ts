import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createRouter } from './routes.js';
import { 
  apiRateLimiter as limiter, 
  authRateLimiter as authLimiter, 
  sosRateLimiter as criticalLimiter,
  pdfLimiter,
  aiLimiter,
  aiQuotaTracking
} from './core/middleware/rate-limit.middleware.js';
import { correlationMiddleware } from './core/middleware/correlation.middleware.js';
import { errorHandler } from './core/middleware/error.middleware.js';
import { logger } from './core/logger/index.js';

// No global __filename needed here

export { limiter, criticalLimiter, authLimiter, pdfLimiter, aiLimiter, aiQuotaTracking };

export async function createApp() {
  const app = express();

  // Generate CSP nonce for each request
  app.use((_req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  app.set('trust proxy', 1);

  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'production' 
          ? ["'self'", "https://unpkg.com", (_req, res: any) => `'nonce-${res.locals.nonce}'`] 
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://storage.googleapis.com", "https://res.cloudinary.com", "https://ui-avatars.com", "https://images.unsplash.com", "https://picsum.photos", "https://grainy-gradients.vercel.app","https://www.transparenttextures.com",],
        connectSrc: ["'self'", "ws:", "wss:", "https://*.googleapis.com", "https://unpkg.com"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        // SEC-002: Harden frame-ancestors. Default to 'none' in production.
        frameAncestors: process.env.FRAME_ANCESTORS 
          ? process.env.FRAME_ANCESTORS.split(',') 
          : (process.env.NODE_ENV === 'production' ? ["'none'"] : ["'self'", "https://aistudio.google.com"]),
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false,
    // SEC-002: Restore frameguard in production to prevent clickjacking
    frameguard: process.env.NODE_ENV === 'production' ? { action: 'deny' } : false,
  }));
  app.use(correlationMiddleware);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Health Check - MUST be before createRouter to avoid auth middleware
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
      const { QueueService } = await import('./core/queue/index.js');
      const health = await QueueService.getWorkerHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    } catch (err) {
      res.status(500).json({ error: 'Worker health check failed' });
    }
  });

  app.get('/api/health/detailed', async (_req, res) => {
    try {
      const { db } = await import('./core/db/prisma.js');
      const { redisClient } = await import('./core/redis.js');
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
      res.json({
        status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
        postgres: checks[0].status === 'fulfilled' ? 'ok' : 'error',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'error',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (err) {
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  // Tenant Context Middleware
  app.use((req, _res, next) => {
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      (req as any).subdomain = tenantHeader;
    } else {
      const host = req.headers.host || '';
      const hostname = host.split(':')[0] || '';
      const subdomain = hostname.split('.')[0];
      if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('.run.app')) {
        (req as any).subdomain = subdomain;
      }
    }
    next();
  });

  // API Routes
  // FIX [BUG-3]: createRouter() được gọi hai lần → hai Express Router instances độc lập.
  // Mỗi instance có rate-limiter, idempotency, audit middleware riêng → double-execution.
  // Fix: tạo một router instance duy nhất, mount tại cả /api/v1 (primary) và /api (compat alias).
  const apiRouter = createRouter();
  app.use('/api/v1', apiRouter);
  // Compatibility alias: các client cũ hoặc mobile app gọi /api/... vẫn hoạt động
  app.use('/api', apiRouter);

  // JSON 404 for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
  });

  // Bull MQ Dashboard (Protected)
  try {
    const { setupBullBoard } = await import('./core/queue/bull-board.js');
    const { requireAuth, requireRole } = await import('./shared/middlewares/auth.middleware.js');
    const { UserRole } = await import('./core/architecture/types.js');
    app.use('/api/admin/queues', requireAuth, requireRole([UserRole.SUPER_ADMIN]), setupBullBoard());
    logger.info('✅ Bull Board UI integrated at /api/admin/queues');
  } catch (err) {
    logger.error({ err }, '⚠️ Failed to initialize Bull Board UI');
  }

  // Centralized Error Handling
  app.use('/api', errorHandler);

  // Serve Frontend
  if (process.env.NODE_ENV !== 'production') {
    logger.info('🔧 Using Vite middleware (Development Mode)');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: process.cwd(),
      server: { 
        middlewareMode: true,
        hmr: false, // Explicitly disable HMR in middleware mode to silence websocket errors
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info('🚀 Serving Static Files (Production Mode)');
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');

    // Serve static assets
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.use(express.static(publicPath));

    // SPA fallback: serves index.html for any route that isn't an API or asset
    app.get('*', (req: Request, res: Response) => {
      // Don't serve API routes as HTML
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `API route ${req.path} not found` });
      }

      // First check if index.html exists in dist
      const indexDist = path.join(distPath, 'index.html');
      const indexRoot = path.join(process.cwd(), 'index.html');
      
      // Set headers to prevent caching of index.html
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (fs.existsSync(indexDist)) {
        let html = fs.readFileSync(indexDist, 'utf-8');
        html = html.replace(/<script /g, `<script nonce="${res.locals.nonce}" `);
        return res.send(html);
      } else if (fs.existsSync(indexRoot)) {
        // In some environments, index.html might still be in root
        let html = fs.readFileSync(indexRoot, 'utf-8');
        html = html.replace(/<script /g, `<script nonce="${res.locals.nonce}" `);
        return res.send(html);
      }

      return res.status(404).json({ error: 'Frontend build not found. Please run build.' });
    });
  }

  return app;
}