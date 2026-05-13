import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateStaffUseCase } from './update-staff.usecase.js';
import { StaffRepository } from '../staff.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { CacheManager } from '../../../core/cache/manager.js';
import { UserRole } from '../../../core/architecture/types.js';

vi.mock('../staff.repository.js', () => ({
  StaffRepository: {
    getEntityById: vi.fn(),
    save: vi.fn(),
  }
}));

vi.mock('../../../core/audit/audit.service.js', () => ({
  AuditService: {
    logSensitiveChange: vi.fn()
  }
}));

vi.mock('../../../core/cache/manager.js', () => ({
  CacheManager: {
    del: vi.fn()
  }
}));

const mockStaffEntity = {
  updateProfile: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  updateQualifications: vi.fn(),
  toJSON: vi.fn().mockReturnValue({
    id: 'staff-123',
    tenantId: 'tenant-123',
    username: 'testuser',
    fullName: 'Test User',
    role: 'guard',
    status: 'active',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  })
};

describe('UpdateStaffUseCase', () => {
  let useCase: UpdateStaffUseCase;

  const mockAdminContext = {
    userId: 'admin-123',
    tenantId: 'tenant-123',
    role: UserRole.TENANT_ADMIN
  };

  const mockGuardContext = {
    userId: 'staff-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  const mockOtherGuardContext = {
    userId: 'staff-999',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateStaffUseCase();
  });

  describe('authorize', () => {
    it('should throw FORBIDDEN_ACTION if a guard tries to update another guard', async () => {
      await expect(useCase.authorize(mockOtherGuardContext, { id: 'staff-123', data: {} }))
        .rejects.toThrow('FORBIDDEN_ACTION');
    });

    it('should allow a guard to update themselves', async () => {
      await expect(useCase.authorize(mockGuardContext, { id: 'staff-123', data: {} }))
        .resolves.toBeUndefined();
    });

    it('should allow a tenant admin to update others', async () => {
      await expect(useCase.authorize(mockAdminContext, { id: 'staff-123', data: {} }))
        .resolves.toBeUndefined();
    });
  });

  describe('internalExecute', () => {
    it('should throw Error if staff not found', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(null);

      await expect(useCase.internalExecute(mockAdminContext, { id: 'staff-123', data: {} }))
        .rejects.toThrow('NOT_FOUND_OR_ACCESS_DENIED');
    });

    it('should successfully update profile and invalidate cache', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);

      const requestData = {
        fullName: 'New Name',
        phone: '1234567890'
      };

      const result = await useCase.internalExecute(mockAdminContext, { id: 'staff-123', data: requestData });

      expect(mockStaffEntity.updateProfile).toHaveBeenCalledWith('New Name', 'guard', '1234567890');
      expect(StaffRepository.save).toHaveBeenCalledWith(mockAdminContext, mockStaffEntity);
      expect(CacheManager.del).toHaveBeenCalledWith('auth_metadata:staff-123'); // SEC-FIX: M-01 Check
      expect(AuditService.logSensitiveChange).toHaveBeenCalled();
      expect(result.id).toBe('staff-123');
    });

    it('should ignore role and status changes if user is not admin', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);

      const requestData = {
        role: 'tenant-admin' as const,
        status: 'inactive' as const
      };

      await useCase.internalExecute(mockGuardContext, { id: 'staff-123', data: requestData });

      expect(mockStaffEntity.deactivate).not.toHaveBeenCalled();
      // Should retain original role 'guard'
      expect(mockStaffEntity.updateProfile).not.toHaveBeenCalledWith(undefined, 'tenant-admin', undefined);
    });

    it('should block TenantAdmin from promoting someone to SuperAdmin', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);

      const requestData = {
        role: UserRole.SUPER_ADMIN as 'super-admin',
        fullName: 'Test User'
      };

      await useCase.internalExecute(mockAdminContext, { id: 'staff-123', data: requestData });

      // Profile should have original role
      expect(mockStaffEntity.updateProfile).toHaveBeenCalledWith('Test User', 'guard', undefined);
    });

    it('should correctly activate or deactivate staff if requested by admin', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);

      await useCase.internalExecute(mockAdminContext, { id: 'staff-123', data: { status: 'inactive' } });
      expect(mockStaffEntity.deactivate).toHaveBeenCalled();

      await useCase.internalExecute(mockAdminContext, { id: 'staff-123', data: { status: 'active' } });
      expect(mockStaffEntity.activate).toHaveBeenCalled();
    });
  });
});
