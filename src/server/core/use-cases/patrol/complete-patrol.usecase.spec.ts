import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletePatrolUseCase } from './complete-patrol.usecase.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { UserRole } from '../../architecture/types.js';

// Mock dependencies
vi.mock('../../../modules/patrol/repositories/patrol.repository.js', () => ({
  PatrolRepository: {
    verifyGuardLocation: vi.fn(),
    createLog: vi.fn()
  }
}));

vi.mock('../../audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

describe('CompletePatrolUseCase', () => {
  let useCase: CompletePatrolUseCase;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  const mockRequest = {
    checkpointId: 'ckpt-123',
    location: { lat: 10.0, lon: 20.0, accuracy: 5 },
    startTime: '2023-10-01T10:00:00Z',
    endTime: '2023-10-01T10:15:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CompletePatrolUseCase();
  });

  it('should authorize allowed roles', async () => {
    vi.mocked(PatrolRepository.verifyGuardLocation).mockResolvedValue(true);
    vi.mocked(PatrolRepository.createLog).mockResolvedValue({ id: 'log-123' });
    await expect(useCase.execute(mockContext, mockRequest)).resolves.toBeDefined();
  });

  it('should throw UNAUTHORIZED_ACTION if role is forbidden', async () => {
    const context = { ...mockContext, role: 'GUEST' as UserRole };
    await expect(useCase.execute(context, mockRequest)).rejects.toThrow('UNAUTHORIZED_ACTION');
  });

  it('should complete patrol successfully when location is valid', async () => {
    vi.mocked(PatrolRepository.verifyGuardLocation).mockResolvedValue(true);
    vi.mocked(PatrolRepository.createLog).mockResolvedValue({ id: 'log-123' });

    const result = await useCase.execute(mockContext, mockRequest);

    expect(result.success).toBe(true);
    expect(result.logId).toBe('log-123');
    expect(PatrolRepository.verifyGuardLocation).toHaveBeenCalledWith(
      mockContext.tenantId,
      mockRequest.checkpointId,
      mockRequest.location.lat,
      mockRequest.location.lon
    );
    expect(PatrolRepository.createLog).toHaveBeenCalled();
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PATROL_COMPLETE',
      status: 'SUCCESS'
    }));
  });

  it('should mark anomaly as LOCATION_MISMATCH_FRAUD when location is invalid', async () => {
    vi.mocked(PatrolRepository.verifyGuardLocation).mockResolvedValue(false); // FRAUD
    vi.mocked(PatrolRepository.createLog).mockResolvedValue({ id: 'log-999' });

    const result = await useCase.execute(mockContext, mockRequest);

    expect(result.success).toBe(true);
    expect(result.logId).toBe('log-999');
    expect(PatrolRepository.createLog).toHaveBeenCalledWith(
      mockContext,
      mockRequest.checkpointId,
      expect.objectContaining({
        status: 'danger',
        anomaly: 'LOCATION_MISMATCH_FRAUD'
      })
    );
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      status: 'WARNING'
    }));
  });
});
