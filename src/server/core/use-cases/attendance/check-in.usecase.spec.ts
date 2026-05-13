import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceCheckInUseCase } from './check-in.usecase.js';
import { db } from '../../db/prisma.js';

// Mock dependencies
vi.mock('../../db/prisma.js', () => ({
  db: {
    forTenant: vi.fn(),
  }
}));

describe('AttendanceCheckInUseCase', () => {
  let useCase: AttendanceCheckInUseCase;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: 'guard' as any
  };

  const mockPayload = {
    location: { lat: 10, lon: 20 },
    imageUri: 'test.jpg'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new AttendanceCheckInUseCase();
  });

  it('should throw ALREADY_CHECKED_IN if there is an active check-in', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue({ id: 'existing-check-in' });
    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: { findFirst: mockFindFirst } as any
    } as any);

    await expect(useCase.execute(mockContext, mockPayload)).rejects.toThrow('ALREADY_CHECKED_IN');
    
    expect(db.forTenant).toHaveBeenCalledWith(mockContext.tenantId);
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        staffId: mockContext.userId,
        type: 'CHECK_IN',
        checkOutAt: null
      })
    }));
  });

  it('should create a new check-in record successfully', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-record', type: 'CHECK_IN', lateMinutes: 0 });
    
    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: { 
        findFirst: mockFindFirst,
        create: mockCreate
      } as any,
      shiftSchedule: {
        findUnique: vi.fn()
      } as any
    } as any);

    const result = await useCase.execute(mockContext, mockPayload);

    expect(result).toHaveProperty('id', 'new-record');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: mockContext.tenantId,
        staffId: mockContext.userId,
        type: 'CHECK_IN',
        imageUri: mockPayload.imageUri
      })
    }));
  });

  it('should calculate late minutes when a shift schedule is provided', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-record', type: 'CHECK_IN', lateMinutes: 30 });
    const mockShiftFindUnique = vi.fn().mockResolvedValue({ id: 'shift-1', date: '2024-05-20', startTime: '08:00' });
    
    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: { 
        findFirst: mockFindFirst,
        create: mockCreate
      } as any,
      shiftSchedule: {
        findUnique: mockShiftFindUnique
      } as any
    } as any);

    const checkInPayload = { ...mockPayload, shiftScheduleId: 'shift-1' };
    
    // Fake current time to be 08:30 on the same date as the shift
    vi.useFakeTimers();
    const date = new Date(2024, 4, 20, 8, 30, 0, 0); // Month is 0-indexed (4 = May)
    vi.setSystemTime(date);

    const result = await useCase.execute(mockContext, checkInPayload);

    expect(mockShiftFindUnique).toHaveBeenCalledWith({
      where: { id: 'shift-1' }
    });
    
    // Assert create was called with correct lateMinutes
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        lateMinutes: 30
      })
    }));

    vi.useRealTimers();
  });
});
