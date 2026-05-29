import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cacheDelMock, tenantFindUniqueMock, tenantUpdateMock } = vi.hoisted(() => ({
  cacheDelMock: vi.fn(),
  tenantFindUniqueMock: vi.fn(),
  tenantUpdateMock: vi.fn(),
}));

vi.mock('../../core/cache/index.js', () => ({
  cache: {
    del: cacheDelMock,
    getOrFetch: vi.fn(),
  },
}));

vi.mock('../../core/db/prisma.js', () => ({
  db: {
    system: vi.fn(() => ({
      tenant: {
        findUnique: tenantFindUniqueMock,
        update: tenantUpdateMock,
      },
    })),
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../tenant/tenant.repository.js', () => ({
  TenantRepository: {},
}));

vi.mock('../../core/media/media.service.js', () => ({
  MediaService: {},
}));

import { SuperAdminService } from './superadmin.service.js';

describe('SuperAdminService feature flag cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidate tenant feature caches sau khi feature flag thay doi', async () => {
    tenantFindUniqueMock.mockResolvedValue({
      id: 'tenant-1',
      subscriptionPlan: 'PRO',
      plan: 'PRO',
      featuresEnabled: { vendor_management: true },
    });
    tenantUpdateMock.mockResolvedValue({
      id: 'tenant-1',
      featuresEnabled: { vendor_management: true, contract_compliance: true },
    });
    cacheDelMock.mockResolvedValue(undefined);

    const result = await SuperAdminService.updateTenantFeatures('tenant-1', {
      vendor_management: true,
      contract_compliance: true,
    });

    expect(tenantUpdateMock).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: {
        featuresEnabled: expect.objectContaining({
          vendor_management: true,
          contract_compliance: true,
        }),
      },
    });
    expect(cacheDelMock).toHaveBeenCalledWith('tenant:tenant-1');
    expect(cacheDelMock).toHaveBeenCalledWith('tenant:status:tenant-1');
    expect(cacheDelMock).toHaveBeenCalledWith('tenant:features:tenant-1');
    expect(cacheDelMock).toHaveBeenCalledWith('admin:dashboard_stats');
    expect(cacheDelMock).toHaveBeenCalledWith('admin:tenant_list');
    expect(cacheDelMock).toHaveBeenCalledWith('admin:tenant_list_paged:50');
    expect(result).toEqual(expect.objectContaining({
      tenantId: 'tenant-1',
      before: { vendor_management: true },
      tenant: expect.objectContaining({ id: 'tenant-1' }),
    }));
  });

  it('khong invalidate cache neu tenant khong ton tai', async () => {
    tenantFindUniqueMock.mockResolvedValue(null);

    await expect(SuperAdminService.updateTenantFeatures('tenant-missing', {
      contract_compliance: true,
    })).rejects.toThrow('TENANT_NOT_FOUND');

    expect(tenantUpdateMock).not.toHaveBeenCalled();
    expect(cacheDelMock).not.toHaveBeenCalled();
  });
});
