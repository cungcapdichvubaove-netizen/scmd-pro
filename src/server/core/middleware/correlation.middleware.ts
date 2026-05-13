import { Request, Response, NextFunction } from 'express';
import { logger, loggerContext } from '../logger/index.js';
import crypto from 'node:crypto';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const traceId = (req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID()) as string;
  
  // Expose it back to client
  res.setHeader('x-trace-id', traceId);

  // Business Rule: Skip logging for static assets and dev-server internals to reduce noise
  const skipLog = 
    req.originalUrl.startsWith('/src/') || 
    req.originalUrl.startsWith('/@vite/') || 
    req.originalUrl.startsWith('/@fs/') ||
    req.originalUrl.endsWith('.ico') ||
    req.originalUrl.endsWith('.svg') ||
    req.originalUrl.endsWith('.png') ||
    req.originalUrl.endsWith('.jpg');

  if (!skipLog) {
    res.on('finish', () => {
      const duration = Date.now() - start;
      // We pass traceId explicitly since the ALS store might be cleared by the time 'finish' fires
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
        traceId, // Explicitly include it for access logs
        type: 'ACCESS_LOG'
      }, `Request finished: ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
  }

  loggerContext.run({ traceId }, () => {
    next();
  });
}
