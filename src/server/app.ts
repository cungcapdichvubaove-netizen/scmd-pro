import express from 'express';
import {
  apiRateLimiter as limiter,
  authRateLimiter as authLimiter,
  sosRateLimiter as criticalLimiter,
  pdfLimiter,
  aiLimiter,
  aiQuotaTracking
} from './core/middleware/rate-limit.middleware.js';
import { configureCors } from './bootstrap/cors.js';
import { registerApiRoutes } from './bootstrap/api.routes.js';
import { registerDocsRoutes } from './bootstrap/docs.routes.js';
import { registerHealthRoutes } from './bootstrap/health.routes.js';
import { configureSecurityHeaders } from './bootstrap/security-headers.js';
import { registerStaticRoutes } from './bootstrap/static.routes.js';
import { tenantContextMiddleware } from './bootstrap/tenant-context.middleware.js';

export { limiter, criticalLimiter, authLimiter, pdfLimiter, aiLimiter, aiQuotaTracking };

export async function createApp() {
  const app = express();

  configureSecurityHeaders(app);
  configureCors(app);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  registerHealthRoutes(app);
  app.use(tenantContextMiddleware);
  await registerApiRoutes(app);
  registerDocsRoutes(app);
  await registerStaticRoutes(app);

  return app;
}
