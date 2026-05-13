import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteStaffUseCase } from './delete-staff.usecase.js';
import { StaffRepository } from '../staff.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { CacheManager } from '../../../core/cache/manager.js';
import { UserRole } from '../../../core/architecture/types.js';

vi.mock('../staff.repository.js', () => ({
  StaffRepository: {
    getEntityById: vi.fn(),
    delete: vi.fn(),
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
  toJSON: vi.fn().mockReturnValue({ id: 'staff-to-delete' })
};

describe('DeleteStaffUseCase', () => {
  let useCase: DeleteStaffUseCase;

  const mockAdminContext = {
    userId: 'admin-123',
    tenantId: 'tenant-123',
    role: UserRole.TENANT_ADMIN
  };

  const mockGuardContext = {
    userId: 'guard-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new DeleteStaffUseCase();
  });

  describe('authorize', () => {
    it('should throw FORBIDDEN_ACTION if guard tries to delete staff', async () => {
      // TypeScript requires us to pass both context and the request payload (which is just a string id)
      // Actually BaseUseCase execute takes context, payload
      // wait, `authorize(context: SecurityContext, payload: unknown)`
      await expect(useCase.execute(mockGuardContext, 'staff-to-delete')).rejects.toThrow('FORBIDDEN_ACTION');
    });

    it('should allow tenant admin to delete staff', async () => {
      // Mock delete so execute works
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);
      vi.mocked(StaffRepository.delete).mockResolvedValue(true as any);
      await expect(useCase.execute(mockAdminContext, 'staff-to-delete')).resolves.toBeUndefined();
    });
  });

  describe('internalExecute', () => {
    it('should call delete on repository, invalidate cache, and log audit', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(mockStaffEntity as any);

      // bypass execute wrapping since we already tested authorize
      await (useCase as any).internalExecute(mockAdminContext, 'staff-to-delete');

      expect(StaffRepository.delete).toHaveBeenCalledWith(mockAdminContext, 'staff-to-delete');
      expect(CacheManager.del).toHaveBeenCalledWith('auth_metadata:staff-to-delete');
      expect(AuditService.logSensitiveChange).toHaveBeenCalledWith(
        'admin-123',
        'tenant-123',
        'DELETE_STAFF',
        'staff/staff-to-delete',
        { id: 'staff-to-delete' },
        null
      );
    });
  });
});
