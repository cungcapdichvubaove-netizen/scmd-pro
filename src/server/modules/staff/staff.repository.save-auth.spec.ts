import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../core/architecture/types.js';
import { StaffRepository } from './staff.repository.js';
import { StaffEntity, type StaffProps } from './domain/staff.entity.js';

const { withTenantMock, cacheDelMock, cacheDelByPatternMock, dispatchMock } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  cacheDelMock: vi.fn(),
  cacheDelByPatternMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

vi.mock('../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../core/cache/manager.js', () => ({
  CacheManager: {
    del: cacheDelMock,
    delByPattern: cacheDelByPatternMock,
  },
}));

vi.mock('../../core/events/event-bus.js', () => ({
  EventBus: {
    dispatch: dispatchMock,
  },
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    logSensitiveChange: vi.fn(),
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

describe('StaffRepository.save auth persistence backtest', () => {
  const ctx = {
    userId: 'admin-1',
    tenantId: 'tenant-1',
    role: UserRole.TENANT_ADMIN,
  };

  const baseBefore = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    username: 'guard.one',
    password: bcrypt.hashSync('OldPassword123!', 4),
    email: 'guard.one@example.com',
    fullName: 'Guard One',
    phone: '0900000001',
    role: 'guard',
    assignedVendorId: null,
    assignedSiteId: null,
    assignedContractId: null,
    status: 'active',
    qualifications: ['cctv'],
    idNumber: '012345678901',
    licenseNumber: 'LIC-001',
    idExpiry: null,
    updatedAt: new Date('2026-05-20T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BCRYPT_ROUNDS = '4';
  });

  function createEntity(overrides: Partial<StaffProps> = {}) {
    const props: StaffProps = {
      username: 'guard.one',
      password: baseBefore.password,
      email: 'guard.one@example.com',
      fullName: 'Guard One Updated',
      phone: '0900000009',
      role: 'guard',
      assignedVendorId: null,
      assignedSiteId: null,
      assignedContractId: null,
      status: 'active',
      qualifications: ['cctv', 'fire-safety'],
      idNumber: '012345678901',
      licenseNumber: 'LIC-001',
      idExpiry: null,
      ...overrides,
    };

    return StaffEntity.create('staff-1', 'tenant-1', props);
  }

  function setupTransaction(before = baseBefore) {
    const updateMock = vi.fn(async ({ data }: any) => ({
      ...before,
      ...data,
    }));

    const tx = {
      staff: {
        findFirst: vi.fn().mockResolvedValue(before),
        update: updateMock,
      },
    };

    withTenantMock.mockImplementation(async (_tenantId: string, callback: (tx: any) => Promise<unknown>) => callback(tx));

    return { tx, updateMock };
  }

  it('giữ nguyên persisted password hash khi update hồ sơ không gửi password mới', async () => {
    const { updateMock } = setupTransaction();
    const entity = createEntity();

    await StaffRepository.save(ctx, entity);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0].data;

    expect(updatePayload.password).toBeUndefined();
    expect(updatePayload.fullName).toBe('Guard One Updated');
    expect(updatePayload.phone).toBe('0900000009');
    expect(updatePayload.role).toBe('guard');
    expect(updatePayload.status).toBe('active');
    expect(cacheDelMock).toHaveBeenCalledWith('staff:profile:staff-1');
    expect(cacheDelMock).toHaveBeenCalledWith('auth_metadata:staff-1');
    expect(cacheDelByPatternMock).toHaveBeenCalledWith('staff:list:tenant-1:*');
  });

  it('hash password mới đúng chuẩn bcrypt và login-compare thành công sau update', async () => {
    const { updateMock } = setupTransaction();
    const entity = createEntity({ password: 'NewPassword456!' });

    await StaffRepository.save(ctx, entity);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatePayload = updateMock.mock.calls[0][0].data;

    expect(typeof updatePayload.password).toBe('string');
    expect(updatePayload.password).not.toBe('NewPassword456!');
    expect(updatePayload.password).not.toBe(baseBefore.password);
    await expect(bcrypt.compare('NewPassword456!', updatePayload.password as string)).resolves.toBe(true);
    await expect(bcrypt.compare('OldPassword123!', updatePayload.password as string)).resolves.toBe(false);
  });

  it('không null hóa hoặc ghi đè password khi payload password rỗng/toàn khoảng trắng', async () => {
    const emptyPasswordCases = ['   ', ''];

    for (const candidate of emptyPasswordCases) {
      const { updateMock } = setupTransaction();
      const entity = createEntity({ password: candidate });

      await StaffRepository.save(ctx, entity);

      const updatePayload = updateMock.mock.calls[0][0].data;
      expect(updatePayload.password).toBeUndefined();
    }
  });

  it('persist username mới và vẫn không cho ghi tenantId vào transaction update payload', async () => {
    const before = {
      ...baseBefore,
      username: 'guard.one',
    };
    const { tx, updateMock } = setupTransaction(before);
    tx.staff.findFirst
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce(null);
    const entity = createEntity({
      username: 'guard.two',
      fullName: 'Guard One Final',
    });

    await StaffRepository.save(ctx, entity);

    expect(tx.staff.findFirst).toHaveBeenCalledTimes(2);
    expect(tx.staff.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        username: 'guard.two',
        NOT: { id: 'staff-1' },
      },
      select: { id: true },
    });

    const updateArgs = updateMock.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'staff-1' });
    expect(updateArgs.data.username).toBe('guard.two');
    expect(updateArgs.data.tenantId).toBeUndefined();
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STAFF_UPDATED',
        payload: expect.objectContaining({
          staffId: 'staff-1',
          before: expect.objectContaining({ username: 'guard.one' }),
        }),
      }),
      expect.any(Object),
    );
  });

  it('trim staffId trước khi persist để chặn drift do khoảng trắng giữa domain và repository', async () => {
    const { updateMock } = setupTransaction(baseBefore);
    const entity = createEntity({
      staffId: '  BV-999  ',
    });

    await StaffRepository.save(ctx, entity);

    const updatePayload = updateMock.mock.calls[0][0].data;
    expect(updatePayload.staffId).toBe('BV-999');
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          staffId: 'staff-1',
          after: expect.objectContaining({ staffId: 'BV-999' }),
        }),
      }),
      expect.any(Object),
    );
  });

  it('normalize staffId rỗng thành null thay vì chuỗi trống để tránh mất đồng bộ persistence', async () => {
    const before = {
      ...baseBefore,
      staffId: 'BV-001',
    };
    const { updateMock } = setupTransaction(before);
    const entity = createEntity({
      staffId: '',
    });

    await StaffRepository.save(ctx, entity);

    const updatePayload = updateMock.mock.calls[0][0].data;
    expect(updatePayload.staffId).toBe(null);
  });

  it('giữ nguyên staffId null khi entity không có staffId business để không phát sinh drift giả', async () => {
    const before = {
      ...baseBefore,
      staffId: null,
    };
    const { updateMock } = setupTransaction(before);
    const entity = createEntity({
      staffId: null,
    });

    await StaffRepository.save(ctx, entity);

    const updatePayload = updateMock.mock.calls[0][0].data;
    expect(updatePayload.staffId).toBe(null);
    expect(updatePayload.username).toBe('guard.one');
  });

  it('ném CONFLICT_USERNAME nếu username mới đã thuộc tài khoản khác', async () => {
    const before = {
      ...baseBefore,
      username: 'guard.one',
    };
    const { tx, updateMock } = setupTransaction(before);
    tx.staff.findFirst
      .mockResolvedValueOnce(before)
      .mockResolvedValueOnce({ id: 'staff-999' });

    const entity = createEntity({ username: 'guard.two' });

    await expect(StaffRepository.save(ctx, entity)).rejects.toThrow('CONFLICT_USERNAME');
    expect(updateMock).not.toHaveBeenCalled();
  });
});
