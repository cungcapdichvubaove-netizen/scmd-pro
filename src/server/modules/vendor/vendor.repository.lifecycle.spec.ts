import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../core/architecture/types.js';
import { VendorRepository } from './vendor.repository.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { ActivateContractVersionUseCase } from './application/activate-contract-version.usecase.js';

const { withTenantMock, getSpanMock, activeContextMock } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  getSpanMock: vi.fn(),
  activeContextMock: { trace: 'ctx' },
}));

vi.mock('@opentelemetry/api', () => ({
  context: {
    active: vi.fn(() => activeContextMock),
  },
  trace: {
    getSpan: getSpanMock,
  },
}));

vi.mock('../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn(),
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  loggerContext: {
    getStore: vi.fn(() => ({ traceId: 'logger-trace-id' })),
  },
}));

describe('VendorRepository Contract Lifecycle', () => {
  const ctx = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.TENANT_ADMIN,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ContractVersion Supersede Lifecycle', () => {
    it('activate version mới và archive version active cũ trong cùng contract', async () => {
      const tx = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', activeVersionId: 'version-1' }),
          update: vi.fn().mockResolvedValue({ id: 'contract-1', activeVersionId: 'version-2' }),
        },
        contractVersion: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'version-2',
            contractId: 'contract-1',
            status: 'DRAFT',
            effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
          }),
          update: vi
            .fn()
            .mockResolvedValueOnce({ id: 'version-1', status: 'ARCHIVED' })
            .mockResolvedValueOnce({ id: 'version-2', status: 'ACTIVE' }),
        },
      };

      withTenantMock.mockImplementation(async (_tenantId, callback) => callback(tx));

      const result = await VendorRepository.activateContractVersion(ctx as any, 'contract-1', 'version-2');

      expect(result.activeVersion).toEqual({ id: 'version-2', status: 'ACTIVE' });
      expect(tx.contractVersion.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'version-1' },
        data: expect.objectContaining({
          status: 'ARCHIVED',
          effectiveTo: new Date('2026-06-01T00:00:00.000Z'),
        }),
      });
      expect(tx.contractVersion.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'version-2' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          archivedAt: null,
          effectiveTo: null,
        }),
      });
      expect(tx.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: { activeVersionId: 'version-2' },
      });
    });

    it('deny vendor-commander activate contract version qua RBAC usecase', async () => {
      const useCase = new ActivateContractVersionUseCase();
      await expect(useCase.execute({
        ...ctx,
        role: UserRole.VENDOR_COMMANDER,
        assignedVendorId: 'vendor-123',
      } as any, {
        contractId: '00000000-0000-4000-8000-000000000001',
        versionId: '00000000-0000-4000-8000-000000000002',
      })).rejects.toThrow('FORBIDDEN_ACCESS');
      expect(withTenantMock).not.toHaveBeenCalled();
    });

    it('chuyển version ACTIVE cũ sang SUPERSEDED khi update hợp đồng ACTIVE', async () => {
      const existingContract = {
        id: 'contract-1',
        tenantId: 'tenant-123',
        vendorId: 'vendor-123',
        siteId: 'site-1',
        status: 'ACTIVE',
        activeVersionId: 'version-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'VND',
        value: 1000000,
        guardCountPerShift: 2,
        acceptancePolicy: {
          shiftRequirements: [{ guardPostId: 'gp-1', startTime: '08:00', endTime: '20:00' }],
          staffStandards: [{ required: true, standardName: 'STD_1' }]
        },
        slaConfig: { responseTimeMinutes: 30 },
      };

      const currentVersion = {
        id: 'version-1',
        versionNumber: 1,
        status: 'ACTIVE',
      };

      const tx = {
        contract: {
          findFirst: vi.fn().mockResolvedValueOnce(existingContract).mockResolvedValueOnce(null),
          update: vi.fn().mockResolvedValue({ ...existingContract, activeVersionId: 'version-2' }),
        },
        contractVersion: {
          findUnique: vi.fn().mockResolvedValue(currentVersion),
          update: vi.fn().mockResolvedValue(currentVersion),
          create: vi.fn().mockResolvedValue({ id: 'version-2', status: 'ACTIVE', versionNumber: 2 }),
        },
        contractLineItem: { findMany: vi.fn().mockResolvedValue([]) },
        contractPenaltyRule: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractShiftRequirement: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractStaffStandard: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractChecklistRequirement: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        site: { findFirst: vi.fn().mockResolvedValue({ id: 'site-1', status: 'ACTIVE' }) },
      };

      withTenantMock.mockImplementation(async (_tenantId, callback) => callback(tx));

      await VendorRepository.updateContract(ctx as any, 'contract-1', {
        status: 'ACTIVE',
        value: 1200000,
      });

      expect(tx.contractVersion.update).toHaveBeenCalledWith({
        where: { id: 'version-1' },
        data: expect.objectContaining({ status: 'SUPERSEDED' }),
      });

      expect(tx.contractVersion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractId: 'contract-1',
          versionNumber: 2,
          status: 'ACTIVE',
          totalContractValue: 1200000,
        }),
      });

      expect(tx.contract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: expect.objectContaining({ activeVersionId: 'version-2' }),
      });
    });
  });

  describe('syncContractLineItems', () => {
    it('thêm, cập nhật, và deactivate line items đúng logic', async () => {
      const existingContract = {
        id: 'contract-2',
        tenantId: 'tenant-123',
        vendorId: 'vendor-123',
        siteId: 'site-1',
        status: 'DRAFT',
        activeVersionId: 'version-1',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        currency: 'VND',
        value: 1000000,
        guardCountPerShift: 2,
        acceptancePolicy: {
          contractLineItems: [
            {
              guardPostId: 'gp-1',
              shiftType: 'MORNING',
              positionName: 'Bảo vệ cổng',
              requiredStaffCount: 2,
              unitPrice: 500000,
              totalAmount: 1000000,
            },
            {
              guardPostId: 'gp-2',
              shiftType: 'NIGHT',
              positionName: 'Bảo vệ tuần tra',
              quantity: 1, // legacy support
              unitPrice: 700000,
            },
          ],
        },
        slaConfig: { responseTimeMinutes: 30 },
      };

      const existingItems = [
        {
          id: 'item-1',
          guardPostId: 'gp-1',
          shiftType: 'MORNING',
          positionName: 'Bảo vệ cổng',
          isActive: true,
        },
        {
          id: 'item-2',
          guardPostId: 'gp-3',
          shiftType: 'ALL',
          positionName: 'Bảo vệ cũ bị xoá',
          isActive: true,
        },
      ];

      const tx = {
        contract: {
          findFirst: vi.fn().mockResolvedValue(existingContract),
          update: vi.fn().mockResolvedValue(existingContract),
        },
        contractVersion: {
          findUnique: vi.fn().mockResolvedValue({ id: 'version-1' }),
          update: vi.fn().mockResolvedValue({ id: 'version-1' }),
        },
        contractLineItem: {
          findMany: vi.fn().mockResolvedValue(existingItems),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({ id: 'item-new' }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        contractPenaltyRule: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractShiftRequirement: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractStaffStandard: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        contractChecklistRequirement: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
        site: { findFirst: vi.fn().mockResolvedValue({ id: 'site-1', status: 'ACTIVE' }) },
      };

      withTenantMock.mockImplementation(async (_tenantId, callback) => callback(tx));

      await VendorRepository.updateContract(ctx as any, 'contract-2', {
        acceptancePolicy: existingContract.acceptancePolicy,
      });

      // Update existing
      expect(tx.contractLineItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          requiredStaffCount: 2,
          unitPrice: 500000,
          totalAmount: 1000000,
          isActive: true,
        }),
      });

      // Create new
      expect(tx.contractLineItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guardPostId: 'gp-2',
          shiftType: 'NIGHT',
          positionName: 'Bảo vệ tuần tra',
          requiredStaffCount: 1,
          unitPrice: 700000,
          totalAmount: 700000,
        }),
      });

      // Deactivate deleted
      expect(tx.contractLineItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-2'] } },
        data: { isActive: false },
      });
    });
  });
});
