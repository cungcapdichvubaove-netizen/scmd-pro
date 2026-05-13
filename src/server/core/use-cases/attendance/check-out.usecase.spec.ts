import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceCheckOutUseCase } from './check-out.usecase.js';
import { db } from '../../db/prisma.js';

// Mock dependencies
vi.mock('../../db/prisma.js', () => ({
  db: {
    forTenant: vi.fn(),
    withTenant: vi.fn()
  }
}));

describe('AttendanceCheckOutUseCase', () => {
  let useCase: AttendanceCheckOutUseCase;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: 'guard' as any
  };

  const mockPayload = {
    location: { lat: 10, lon: 20 },
    imageUri: 'test_out.jpg'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AttendanceCheckOutUseCase();
  });

  it('should throw NOT_CHECKED_IN if no open check-in exists', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: { findFirst: mockFindFirst } as any
    } as any);

    await expect(useCase.execute(mockContext, mockPayload)).rejects.toThrow('NOT_CHECKED_IN');
  });

  it('should process check-out and calculate worked minutes', async () => {
    const checkInDate = new Date();
    checkInDate.setHours(8, 0, 0, 0);

    const mockOpenCheckIn = {
      id: 'check-in-record',
      checkInAt: checkInDate,
      shiftScheduleId: null
    };

    const mockFindFirst = vi.fn().mockResolvedValue(mockOpenCheckIn);
    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: { findFirst: mockFindFirst } as any
    } as any);

    const txUpdate = vi.fn().mockResolvedValue(true);
    const txCreate = vi.fn().mockResolvedValue({ id: 'check-out-record', type: 'CHECK_OUT' });
    
    vi.mocked(db.withTenant).mockImplementation(async (tenantId, cb) => {
      return cb({
        attendanceRecord: {
          update: txUpdate,
          create: txCreate
        }
      });
    });

    vi.useFakeTimers();
    const checkOutDate = new Date();
    checkOutDate.setHours(17, 0, 0, 0);
    vi.setSystemTime(checkOutDate);

    const result = await useCase.execute(mockContext, mockPayload);

    expect(db.withTenant).toHaveBeenCalled();
    expect(txUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockOpenCheckIn.id },
      data: expect.objectContaining({
        workedMinutes: 540 // 9 hours
      })
    }));

    expect(txCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'CHECK_OUT',
        workedMinutes: 540
      })
    }));
    expect(result).toHaveProperty('id', 'check-out-record');

    vi.useRealTimers();
  });
});
