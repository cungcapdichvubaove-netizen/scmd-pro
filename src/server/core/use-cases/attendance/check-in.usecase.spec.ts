import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceCheckInUseCase } from './check-in.usecase.js';
import { db } from '../../db/prisma.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';

// Mock dependencies
vi.mock('../../db/prisma.js', () => ({
  db: {
    forTenant: vi.fn(),
  }
}));

vi.mock('../../../modules/patrol/repositories/patrol.repository.js', () => ({
  PatrolRepository: {
    getCheckpointById: vi.fn(),
  },
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

    await expect(useCase.execute(mockContext, mockPayload)).rejects.toThrow('check-in');
    
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
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-record', type: 'CHECK_IN', lateMinutes: 0, isValid: false });
    
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
        imageUri: mockPayload.imageUri,
        isValid: false,
        metadata: expect.objectContaining({
          isSuspicious: true,
          checkpointId: null,
          distanceMeters: null,
        })
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

  it('should persist suspicious GPS metadata with the real checkpoint distance', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockImplementation((args) => Promise.resolve({ id: 'new-record', ...args.data }));

    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: {
        findFirst: mockFindFirst,
        create: mockCreate
      } as any,
      shiftSchedule: {
        findUnique: vi.fn()
      } as any
    } as any);

    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue({
      id: 'checkpoint-1',
      latitude: 10,
      longitude: 20.001,
    } as any);

    await useCase.execute(mockContext, {
      ...mockPayload,
      location: { lat: 10, lon: 20 },
      checkpointId: 'checkpoint-1',
    });

    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.data.isValid).toBe(false);
    expect(createArg.data.metadata).toEqual(expect.objectContaining({
      isSuspicious: true,
      distanceMeters: 110,
    }));
  });

  it('should always persist ctx.userId as staffId even if payload carries adjacent staffId field', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockImplementation((args) => Promise.resolve({ id: 'new-record', ...args.data }));

    vi.mocked(db.forTenant).mockReturnValue({
      attendanceRecord: {
        findFirst: mockFindFirst,
        create: mockCreate
      } as any,
      shiftSchedule: {
        findUnique: vi.fn()
      } as any
    } as any);

    await useCase.execute(mockContext, {
      ...mockPayload,
      checkpointId: undefined,
      staffId: 'forged-staff-id'
    } as any);

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: mockContext.tenantId,
        staffId: mockContext.userId,
      })
    }));
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        staffId: mockContext.userId,
      })
    }));
  });
});
