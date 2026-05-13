import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateStaffUseCase } from './create-staff.usecase.js';
import { StaffRepository } from '../staff.repository.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { UserRole } from '../../../core/architecture/types.js';

vi.mock('../staff.repository.js', () => ({
  StaffRepository: {
    create: vi.fn(),
  }
}));

vi.mock('../../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

const mockCheckStaffQuota = vi.fn();
vi.mock('../../../core/db/integrity.manager.js', () => ({
  IntegrityGuard: {
    checkStaffQuota: mockCheckStaffQuota
  }
}));

describe('CreateStaffUseCase', () => {
  let useCase: CreateStaffUseCase;

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

  const validRequest = {
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'new_staff',
    password: 'SecurePassword123!',
    fullName: 'New Staff Member',
    email: 'new_staff@example.com',
    role: 'guard' as any,
    status: 'active' as any
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateStaffUseCase();
  });

  describe('authorize', () => {
    it('should throw FORBIDDEN_ACTION if guard tries to create staff', async () => {
      // TypeScript requires us to pass both context and the request payload
      await expect(useCase.execute(mockGuardContext, validRequest)).rejects.toThrow('FORBIDDEN_ACTION');
    });

    it('should allow tenant admin to create staff', async () => {
      vi.mocked(StaffRepository.create).mockResolvedValue({ id: 'new-id' } as any);
      await expect(useCase.execute(mockAdminContext, validRequest)).resolves.toBeDefined();
    });
  });

  describe('validate', () => {
    it('should fail validation if Zod schema fails', async () => {
      await expect(useCase.validate({ ...validRequest, username: 'yo' }, mockAdminContext)).rejects.toThrow();
    });

    it('should fail validation if quota check fails', async () => {
      mockCheckStaffQuota.mockRejectedValue(new Error('Quota exceeded'));
      await expect(useCase.validate(validRequest, mockAdminContext)).rejects.toThrow('Quota exceeded');
    });

    it('should pass validation if everything is correct', async () => {
      mockCheckStaffQuota.mockResolvedValue(true);
      await expect(useCase.validate(validRequest, mockAdminContext)).resolves.toBeUndefined();
    });
  });

  describe('internalExecute', () => {
    it('should call repository.create and log audit event', async () => {
      vi.mocked(StaffRepository.create).mockResolvedValue({ id: 'new-id', ...validRequest } as any);

      // bypass execute wrapping since we already tested authorize/validate
      const result = await (useCase as any).internalExecute(mockAdminContext, validRequest);

      expect(StaffRepository.create).toHaveBeenCalledWith(mockAdminContext, validRequest);
      expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_STAFF',
        resource: 'staff/new-id',
        payload: expect.objectContaining({ username: 'new_staff', role: 'guard' })
      }));
      expect(result.id).toBe('new-id');
    });
  });
});
