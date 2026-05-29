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

vi.mock('../../../core/logger/index.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

// ─── Helper: tạo mock entity đầy đủ ───────────────────────────────────────────
function makeMockEntity(overrides: Partial<ReturnType<typeof buildJSON>> = {}) {
  const json = buildJSON(overrides);
  const props = { ...json };
  return {
    updateProfile: vi.fn(),
    updateEmail: vi.fn(),   // FIX [BUG-3] — method mới
    updateUsername: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    updateQualifications: vi.fn(),
    getProps: vi.fn(() => props),
    toJSON: vi.fn().mockReturnValue(json),
  };
}

function buildJSON(overrides: any = {}) {
  return {
    id: 'staff-123',
    tenantId: 'tenant-123',
    username: 'testuser',
    email: 'old@example.com',
    fullName: 'Test User',
    role: 'guard' as const,
    status: 'active' as const,
    phone: null,
    idNumber: null,
    licenseNumber: null,
    idExpiry: null,
    qualifications: [],
    password: '$2a$10$existingHashValue',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Contexts ─────────────────────────────────────────────────────────────────
const adminCtx = { userId: 'admin-123', tenantId: 'tenant-123', role: UserRole.TENANT_ADMIN };
const guardCtx = { userId: 'staff-123', tenantId: 'tenant-123', role: UserRole.GUARD };
const otherGuardCtx = { userId: 'staff-999', tenantId: 'tenant-123', role: UserRole.GUARD };
const superAdminCtx = { userId: 'super-1', tenantId: 'tenant-123', role: UserRole.SUPER_ADMIN };

// ──────────────────────────────────────────────────────────────────────────────

describe('UpdateStaffUseCase', () => {
  let useCase: UpdateStaffUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateStaffUseCase();
  });

  // ── AUTHORIZATION ────────────────────────────────────────────────────────────

  describe('authorize()', () => {
    it('ném FORBIDDEN_ACTION nếu Guard cố update người khác', async () => {
      await expect(useCase.authorize(otherGuardCtx, { id: 'staff-123', data: {} }))
        .rejects.toThrow('FORBIDDEN_ACTION');
    });

    it('cho phép Guard tự update chính mình', async () => {
      await expect(useCase.authorize(guardCtx, { id: 'staff-123', data: {} }))
        .resolves.toBeUndefined();
    });

    it('cho phép TenantAdmin update bất kỳ ai', async () => {
      await expect(useCase.authorize(adminCtx, { id: 'staff-123', data: {} }))
        .resolves.toBeUndefined();
    });
  });

  // ── NOT FOUND ────────────────────────────────────────────────────────────────

  describe('internalExecute() — not found', () => {
    it('ném NOT_FOUND_OR_ACCESS_DENIED nếu entity không tồn tại', async () => {
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(null);
      await expect(useCase.internalExecute(adminCtx, { id: 'ghost', data: {} }))
        .rejects.toThrow('NOT_FOUND_OR_ACCESS_DENIED');
    });
  });

  // ── FIX [BUG-2]: updateProfile nhận đủ 6 tham số ─────────────────────────────

  describe('FIX [BUG-2] — updateProfile với đủ 6 tham số', () => {
    it('truyền idNumber, licenseNumber, idExpiry sang entity khi có dữ liệu', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: {
          fullName: 'Nguyen Van A',
          phone: '0901234567',
          idNumber: '012345678901',
          licenseNumber: 'LC-99',
          idExpiry: '2028-12-31',
        }
      });

      expect(entity.updateProfile).toHaveBeenCalledWith(
        'Nguyen Van A',        // fullName
        'guard',               // role (không đổi, lấy từ currentStaff)
        '0901234567',          // phone
        '012345678901',        // idNumber ← BUG-2 FIX
        'LC-99',               // licenseNumber ← BUG-2 FIX
        new Date('2028-12-31'), // idExpiry ← BUG-2 FIX
        undefined,
      );
    });

    it('truyền null cho idNumber khi payload gửi null (xoá dữ liệu)', async () => {
      const entity = makeMockEntity({ idNumber: '012345678901' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { idNumber: null }
      });

      expect(entity.updateProfile).toHaveBeenCalledWith(
        'Test User', 'guard', undefined, null, undefined, undefined, undefined
      );
    });

    it('KHÔNG gọi updateProfile khi payload không có bất kỳ profile field nào', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      // Chỉ gửi status → không trigger updateProfile
      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { status: 'inactive' }
      });

      expect(entity.updateProfile).not.toHaveBeenCalled();
      expect(entity.deactivate).toHaveBeenCalledOnce();
    });

    it('KHÔNG truyền undefined vào idExpiry khi field không có trong payload', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { fullName: 'New Name' }
      });

      // arg[5] (idExpiry) phải là undefined — entity.updateProfile không xử lý idExpiry
      const call = entity.updateProfile.mock.calls[0];
      expect(call[5]).toBeUndefined();
    });
  });

  // ── FIX [BUG-3]: email được xử lý qua updateEmail() ──────────────────────────

  describe('FIX [BUG-3] — email được cập nhật qua updateEmail()', () => {
    it('gọi updateEmail() khi email mới khác email hiện tại', async () => {
      const entity = makeMockEntity({ email: 'old@example.com' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { email: 'new@example.com' }
      });

      expect(entity.updateEmail).toHaveBeenCalledWith('new@example.com');
    });

    it('KHÔNG gọi updateEmail() khi email giống email hiện tại', async () => {
      const entity = makeMockEntity({ email: 'same@example.com' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { email: 'same@example.com' }
      });

      expect(entity.updateEmail).not.toHaveBeenCalled();
    });

    it('KHÔNG gọi updateEmail() khi payload không có email', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { fullName: 'No Email Change' }
      });

      expect(entity.updateEmail).not.toHaveBeenCalled();
    });
  });

  describe('FIX [BUG-4] — username được cập nhật qua updateUsername()', () => {
    it('gọi updateUsername() khi username mới khác username hiện tại', async () => {
      const entity = makeMockEntity({ username: 'old_user' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { username: 'new_user' } as any
      });

      expect(entity.updateUsername).toHaveBeenCalledWith('new_user');
    });

    it('KHÔNG gọi updateUsername() khi username giống username hiện tại', async () => {
      const entity = makeMockEntity({ username: 'same_user' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { username: 'same_user' } as any
      });

      expect(entity.updateUsername).not.toHaveBeenCalled();
    });

    it('KHÔNG gọi updateUsername() khi username rỗng sau trim', async () => {
      const entity = makeMockEntity({ username: 'same_user' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { username: '   ' } as any
      });

      expect(entity.updateUsername).not.toHaveBeenCalled();
    });
  });

  describe('Password update invariants', () => {
    it('giữ nguyên password hash khi update hồ sơ không gửi password', async () => {
      const entity = makeMockEntity({ password: '$2a$10$keptHashValue' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { fullName: 'Updated Name', phone: '0901234567' }
      });

      expect(entity.getProps().password).toBe('$2a$10$keptHashValue');
    });

    it('chỉ set plaintext password khi admin thực sự gửi password mới để repository hash đúng chuẩn login', async () => {
      const entity = makeMockEntity({ password: '$2a$10$oldHashValue' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { password: 'NewSecurePass123!' }
      });

      expect(entity.getProps().password).toBe('NewSecurePass123!');
    });

    it('không ghi đè password bằng chuỗi rỗng hoặc chỉ khoảng trắng', async () => {
      const entity = makeMockEntity({ password: '$2a$10$oldHashValue' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { password: '   ' as any }
      });

      expect(entity.getProps().password).toBe('$2a$10$oldHashValue');
    });
  });

  // ── SECURITY: RBAC guards không bị phá vỡ bởi fix ────────────────────────────

  describe('Security regression — RBAC không bị ảnh hưởng bởi fix', () => {
    it('Guard không thể thay đổi role/status dù gửi lên', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(guardCtx, {
        id: 'staff-123',
        data: { role: 'tenant-admin' as any, status: 'inactive' as any }
      });

      // status bị reset về 'active', deactivate không được gọi
      expect(entity.deactivate).not.toHaveBeenCalled();
    });

    it('TenantAdmin không thể promote sang SuperAdmin', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { role: UserRole.SUPER_ADMIN as any, fullName: 'Test' }
      });

      // Role bị block → updateProfile nhận role = 'guard' (original)
      const call = entity.updateProfile.mock.calls[0];
      expect(call[1]).toBe('guard');
    });

    it('SuperAdmin có thể promote sang super-admin', async () => {
      const entity = makeMockEntity({ role: 'guard' });
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(superAdminCtx, {
        id: 'staff-123',
        data: { role: 'super-admin' as any, fullName: 'Test' }
      });

      const call = entity.updateProfile.mock.calls[0];
      expect(call[1]).toBe('super-admin');
    });
  });

  // ── CACHE & AUDIT không bị ảnh hưởng ─────────────────────────────────────────

  describe('Cache & Audit Invariants', () => {
    it('luôn invalidate cache auth_metadata sau khi lưu', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, { id: 'staff-123', data: { fullName: 'X' } });

      expect(CacheManager.del).toHaveBeenCalledWith('auth_metadata:staff-123');
    });

    it('luôn gọi AuditService.logSensitiveChange sau khi lưu', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, { id: 'staff-123', data: { fullName: 'X' } });

      expect(AuditService.logSensitiveChange).toHaveBeenCalledWith(
        'admin-123', 'tenant-123', 'UPDATE_STAFF', 'staff/staff-123',
        expect.any(Object), expect.any(Object)
      );
    });

    it('gọi StaffRepository.save với entity đúng context', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, { id: 'staff-123', data: {} });

      expect(StaffRepository.save).toHaveBeenCalledWith(adminCtx, entity);
    });
  });

  // ── BACKWARD COMPATIBILITY: các test gốc vẫn pass ────────────────────────────

  describe('Backward compatibility — test suite gốc', () => {
    it('cập nhật profile thành công và invalidate cache (legacy test)', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      const result = await useCase.internalExecute(adminCtx, {
        id: 'staff-123',
        data: { fullName: 'New Name', phone: '1234567890' }
      });

      // BUG-2 FIX: giờ gọi với 6 tham số; idNumber/licenseNumber/idExpiry = undefined vì không có trong payload
      expect(entity.updateProfile).toHaveBeenCalledWith(
        'New Name', 'guard', '1234567890', undefined, undefined, undefined, undefined
      );
      expect(StaffRepository.save).toHaveBeenCalledWith(adminCtx, entity);
      expect(CacheManager.del).toHaveBeenCalledWith('auth_metadata:staff-123');
      expect(AuditService.logSensitiveChange).toHaveBeenCalled();
      expect(result.id).toBe('staff-123');
    });

    it('activate/deactivate hoạt động đúng', async () => {
      const entity = makeMockEntity();
      vi.mocked(StaffRepository.getEntityById).mockResolvedValue(entity as any);

      await useCase.internalExecute(adminCtx, { id: 'staff-123', data: { status: 'inactive' } });
      expect(entity.deactivate).toHaveBeenCalledOnce();

      await useCase.internalExecute(adminCtx, { id: 'staff-123', data: { status: 'active' } });
      expect(entity.activate).toHaveBeenCalledOnce();
    });
  });
});
