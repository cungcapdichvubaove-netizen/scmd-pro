import { Express } from 'express';
import compression from 'compression';
import crypto from 'crypto';
import helmet from 'helmet';
import { correlationMiddleware } from '../core/middleware/correlation.middleware.js';

export function configureSecurityHeaders(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';

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
        scriptSrc: isProduction
          ? ["'self'", (_req, res: any) => `'nonce-${res.locals.nonce}'`]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
        styleSrc: isProduction
          ? ["'self'", "https://fonts.googleapis.com"]
          : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: isProduction
          ? ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://storage.googleapis.com", "https://res.cloudinary.com", "https://ui-avatars.com", "https://images.unsplash.com", "https://picsum.photos", "https://grainy-gradients.vercel.app"]
          : ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://storage.googleapis.com", "https://res.cloudinary.com", "https://ui-avatars.com", "https://images.unsplash.com", "https://picsum.photos", "https://grainy-gradients.vercel.app"],
        mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
        connectSrc: isProduction
          ? ["'self'", "wss:", "https://*.googleapis.com"]
          : ["'self'", "ws:", "wss:", "https://*.googleapis.com", "https://unpkg.com"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameAncestors: process.env.FRAME_ANCESTORS
          ? process.env.FRAME_ANCESTORS.split(',')
          : (isProduction ? ["'none'"] : ["'self'", "https://aistudio.google.com"]),
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false,
    frameguard: isProduction ? { action: 'deny' } : false,
  }));

  app.use((req, res, next) => {
    const requestPath = typeof req.path === 'string' ? req.path : '';
    const allowsLegacyInlineStyles = requestPath.startsWith('/docs/')
      || requestPath.startsWith('/api/internal/staff/')
      || requestPath.startsWith('/internal/staff/');

    if (isProduction && allowsLegacyInlineStyles) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'nonce-" + res.locals.nonce + "'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://storage.googleapis.com https://res.cloudinary.com https://ui-avatars.com https://images.unsplash.com https://picsum.photos https://grainy-gradients.vercel.app; media-src 'self' blob: https://res.cloudinary.com; connect-src 'self' wss: https://*.googleapis.com; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none';"
      );
    }

    next();
  });

  app.use(correlationMiddleware);
}
