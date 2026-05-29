import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../core/logger/index.js';

export async function registerStaticRoutes(app: Express) {
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Using Vite middleware (Development Mode)');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: process.cwd(),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return;
  }

  logger.info('Serving Static Files (Production Mode)');
  const distPath = path.join(process.cwd(), 'dist');
  const publicPath = path.join(process.cwd(), 'public');

  app.use(express.static(distPath, {
    index: false,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.use(express.static(publicPath));

  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: `API route ${req.path} not found` });
    }

    const indexDist = path.join(distPath, 'index.html');
    const indexRoot = path.join(process.cwd(), 'index.html');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (fs.existsSync(indexDist)) {
      let html = fs.readFileSync(indexDist, 'utf-8');
      html = html.replace(/<script([ >])/g, `<script nonce="${res.locals.nonce}"$1`);
      return res.send(html);
    } else if (fs.existsSync(indexRoot)) {
      let html = fs.readFileSync(indexRoot, 'utf-8');
      html = html.replace(/<script([ >])/g, `<script nonce="${res.locals.nonce}"$1`);
      return res.send(html);
    }

    return res.status(404).json({ error: 'Frontend build not found. Please run build.' });
  });
}
