import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getByIdMock, forTenantMock, withTenantMock } = vi.hoisted(() => ({
  getByIdMock: vi.fn(),
  forTenantMock: vi.fn(),
  withTenantMock: vi.fn(),
}));

vi.mock('../tenant.repository.js', () => ({
  TenantRepository: {
    getById: getByIdMock,
  },
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    forTenant: forTenantMock,
    withTenant: withTenantMock,
  },
}));

import { GetMeUseCase } from './get-me.usecase.js';

describe('GetMeUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('đọc hồ sơ user hiện tại trực tiếp trong tenant context để /me không văng 500 vì scope phụ thuộc actor fields', async () => {
    const feedbackFindFirst = vi.fn().mockResolvedValue({ id: 'upgrade-1' });
    const staffFindUnique = vi.fn().mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      username: 'guard.one',
      email: 'guard.one@example.com',
      fullName: 'Guard One',
      role: 'guard',
      staffId: 'BV-001',
      assignedVendorId: null,
      assignedSiteId: null,
      assignedContractId: null,
      status: 'active',
      phone: '0900000001',
      tokenVersion: 1,
      qualifications: ['cctv'],
      idNumber: '012345678901',
      licenseNumber: 'LIC-001',
      idExpiry: null,
      createdAt: new Date('2026-05-20T10:00:00.000Z'),
      updatedAt: new Date('2026-05-21T10:00:00.000Z'),
    });

    getByIdMock.mockResolvedValue({
      id: 'tenant-1',
      subscriptionPlan: 'PRO',
      plan: 'PRO',
      featuresEnabled: { contract_compliance: true },
    });

    forTenantMock.mockImplementation((tenantId: string, options?: any) => {
      expect(tenantId).toBe('tenant-1');
      if (options) {
        expect(options).toEqual({ ownerId: 'staff-1', readOnly: true });
      }
      return {
        feedback: { findFirst: feedbackFindFirst },
        staff: { findUnique: staffFindUnique },
      };
    });

    const useCase = new GetMeUseCase();
    const result = await useCase.execute({
      userId: 'staff-1',
      tenantId: 'tenant-1',
      role: 'guard' as any,
      email: 'guard.one@example.com',
      assignedVendorId: null,
      assignedSiteId: null,
      assignedContractId: null,
      clientContext: { ip: '127.0.0.1', userAgent: 'vitest' } as any,
    }, undefined as void);

    expect(feedbackFindFirst).toHaveBeenCalledTimes(1);
    expect(staffFindUnique).toHaveBeenCalledWith({
      where: { id: 'staff-1' },
      select: expect.objectContaining({
        id: true,
        fullName: true,
        staffId: true,
        assignedVendorId: true,
        assignedSiteId: true,
        assignedContractId: true,
        idNumber: true,
        licenseNumber: true,
      }),
    });
    expect(result.user).toEqual(expect.objectContaining({
      id: 'staff-1',
      tenantId: 'tenant-1',
      role: 'guard',
      fullName: 'Guard One',
      staffId: 'BV-001',
      assignedVendorId: null,
      assignedSiteId: null,
      assignedContractId: null,
      idNumber: '012345678901',
    }));
    expect(result.tenant).toEqual(expect.objectContaining({
      id: 'tenant-1',
      hasPendingUpgrade: true,
      pendingUpgradePlan: 'PRO',
      resolvedFeatures: expect.any(Object),
      featureAvailability: expect.objectContaining({
        ai_contract_scan: expect.any(Object),
      }),
    }));
  });

  it('vẫn hỗ trợ nhánh system-level cho super-admin', async () => {
    const staffFindUnique = vi.fn().mockResolvedValue({
      id: 'admin-1',
      tenantId: 'tenant_system',
      username: 'root',
      fullName: 'Platform Admin',
      role: 'super-admin',
      staffId: 'SYS-ROOT',
      status: 'active',
      email: 'root@scmd.pro',
      phone: null,
      tokenVersion: 1,
    });

    withTenantMock.mockImplementation(async (tenantId: string, callback: (tx: any) => Promise<unknown>) => {
      expect(tenantId).toBe('SYSTEM');
      return await callback({
        staff: {
          findUnique: staffFindUnique,
        },
      });
    });

    const useCase = new GetMeUseCase();
    const result = await useCase.execute({
      userId: 'admin-1',
      tenantId: 'tenant_system',
      role: 'super-admin' as any,
      email: 'root@scmd.pro',
      assignedVendorId: null,
      assignedSiteId: null,
      assignedContractId: null,
      clientContext: undefined,
    }, undefined as void);

    expect(result.user).toEqual(expect.objectContaining({
      id: 'admin-1',
      tenantId: 'tenant_system',
      role: 'super-admin',
      fullName: 'Platform Admin',
      staffId: 'SYS-ROOT',
    }));
    expect(result.tenant).toBeNull();
  });
});
