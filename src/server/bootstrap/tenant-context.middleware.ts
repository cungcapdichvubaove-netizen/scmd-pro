import { RequestHandler } from 'express';

export const tenantContextMiddleware: RequestHandler = (req, _res, next) => {
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;
  if (tenantHeader) {
    (req as any).requestedTenantId = tenantHeader;
  }

  const host = req.headers.host || '';
  const hostname = host.split(':')[0] || '';
  const subdomain = hostname.split('.')[0];
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('.run.app')) {
    (req as any).subdomain = subdomain;
    (req as any).requestedTenantId = (req as any).requestedTenantId || subdomain;
  }

  next();
};
