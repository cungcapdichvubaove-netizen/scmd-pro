import { beforeEach, describe, expect, it, vi } from 'vitest';

const cacheGetMock = vi.fn();
const cacheSetMock = vi.fn();
const auditLogMock = vi.fn();
const withTenantMock = vi.fn();

vi.mock('../../core/auth/auth.provider.factory.js', () => ({
  AuthProviderFactory: {
    getProvider: vi.fn(),
  },
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: auditLogMock,
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../core/cache/index.js', () => ({
  cache: {
    get: cacheGetMock,
    set: cacheSetMock,
  },
}));

vi.mock('../../core/cache/manager.js', () => ({
  CacheManager: {
    wrap: vi.fn(),
  },
}));

vi.mock('../../infra/redis/client.js', () => ({
  redis: {},
}));

vi.mock('../../core/auth/secrets.js', () => ({
  JWT_SECRET: 'test-secret',
}));

const loadTenantRecord = {
  subscriptionPlan: 'FREE',
  plan: 'FREE',
  featuresEnabled: {
    ai_contract_scan: true,
    contract_compliance: false,
  },
};

describe('requireFeature dependency enforcement', () => {
  beforeEach(() => {
    cacheGetMock.mockReset();
    cacheSetMock.mockReset();
    auditLogMock.mockReset();
    withTenantMock.mockReset();

    cacheGetMock.mockResolvedValue(null);
    cacheSetMock.mockResolvedValue(undefined);
    auditLogMock.mockResolvedValue(undefined);
    withTenantMock.mockImplementation(async (_tenantId: string, callback: (tx: any) => Promise<void>) => {
      await callback({
        tenant: {
          findUnique: vi.fn().mockResolvedValue(loadTenantRecord),
        },
      });
    });
  });

  it('cho phep feature khi dependency duoc auto-enable trong runtime resolution', async () => {
    const { requireFeature } = await import('./auth.middleware.js');
    const middleware = requireFeature('ai_contract_scan');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn().mockReturnThis();
    const nextMock = vi.fn();

    const req: any = {
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-admin',
      },
      originalUrl: '/tenant/vendor-scorecards',
      clientContext: {
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    };

    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    await middleware(req, res, nextMock);

    expect(nextMock).toHaveBeenCalledOnce();
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it('khong chan PRO tenant chi vi featuresEnabled con format legacy', async () => {
    withTenantMock.mockImplementation(async (_tenantId: string, callback: (tx: any) => Promise<void>) => {
      await callback({
        tenant: {
          findUnique: vi.fn().mockResolvedValue({
            subscriptionPlan: 'PRO',
            plan: 'PRO',
            featuresEnabled: {
              patrol: true,
              attendance: true,
              ai_analytics: true,
            },
          }),
        },
      });
    });

    const { requireFeature } = await import('./auth.middleware.js');
    const middleware = requireFeature('monthly_acceptance_report');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn().mockReturnThis();
    const nextMock = vi.fn();

    const req: any = {
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        role: 'tenant-admin',
      },
      originalUrl: '/tenant/monthly-acceptance-reports',
      clientContext: {
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    };

    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    await middleware(req, res, nextMock);

    expect(nextMock).toHaveBeenCalledOnce();
    expect(statusMock).not.toHaveBeenCalled();
    expect(jsonMock).not.toHaveBeenCalled();
  });
});

describe('requirePermission vendor commander least privilege', () => {
  beforeEach(() => {
    auditLogMock.mockReset();
    auditLogMock.mockResolvedValue(undefined);
  });

  it('chan vendor-commander dung quyen supervisor/admin forbidden ngay ca khi token co permission', async () => {
    const { requirePermission } = await import('./auth.middleware.js');
    const middleware = requirePermission('vendor:write');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn().mockReturnThis();
    const nextMock = vi.fn();

    const req: any = {
      user: {
        id: 'commander-1',
        tenantId: 'tenant-1',
        role: 'vendor-commander',
        permissions: ['vendor:write'],
      },
      originalUrl: '/api/admin/contracts/contract-1',
      clientContext: {
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    };

    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    await middleware(req, res, nextMock);

    expect(nextMock).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'FORBIDDEN_PERMISSION_ROLE_BLOCK',
        tenantId: 'tenant-1',
        payload: expect.objectContaining({
          blockedPermission: 'vendor:write',
          userRole: 'vendor-commander',
        }),
      }),
    );
  });

  it('cho phep vendor-commander dung permission toi thieu cho shift scheduling', async () => {
    const { requirePermission } = await import('./auth.middleware.js');
    const middleware = requirePermission('staff:write');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn().mockReturnThis();
    const nextMock = vi.fn();

    const req: any = {
      user: {
        id: 'commander-1',
        tenantId: 'tenant-1',
        role: 'vendor-commander',
        permissions: ['staff:write'],
      },
      originalUrl: '/api/vendor-commander/shift-assignments',
      clientContext: {
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    };

    const res: any = {
      status: statusMock,
      json: jsonMock,
    };

    await middleware(req, res, nextMock);

    expect(nextMock).toHaveBeenCalledTimes(1);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
