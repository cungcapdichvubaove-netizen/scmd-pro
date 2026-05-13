import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScanQRUseCase } from './scan-qr.usecase.js';
import { PatrolRepository } from '../../../modules/patrol/repositories/patrol.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { UserRole } from '../../architecture/types.js';

// Mock dependencies
vi.mock('../../../modules/patrol/repositories/patrol.repository.js', () => ({
  PatrolRepository: {
    getCheckpointById: vi.fn(),
    verifyGuardLocation: vi.fn(),
    createLog: vi.fn(),
    checkLastScan: vi.fn(),
  }
}));

vi.mock('../../audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

describe('ScanQRUseCase', () => {
  let useCase: ScanQRUseCase;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  const mockRequest = {
    checkpointId: 'ckpt-123',
    staffId: 'user-123',
    qr_hash: 'valid_hash',
    location: { lat: 10.0, lon: 20.0, accuracy: 5 }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ScanQRUseCase();
  });

  it('should throw UNAUTHORIZED_ACTION if role is forbidden', async () => {
    const context = { ...mockContext, role: 'GUEST' as UserRole };
    await expect(useCase.execute(context, mockRequest)).rejects.toThrow('UNAUTHORIZED_ACTION');
  });

  it('should throw NOT_FOUND if checkpoint does not exist', async () => {
    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue(null);
    await expect(useCase.execute(mockContext, mockRequest)).rejects.toThrow('NOT_FOUND');
  });

  it('should throw StateConflict if checkpoint is not active', async () => {
    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue({ id: 'ckpt-123', status: 'maintenance', qrHash: 'valid_hash' });
    await expect(useCase.execute(mockContext, mockRequest)).rejects.toThrow('StateConflict');
  });

  it('should throw QR_INTEGRITY_FAILED if hash is invalid', async () => {
    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue({ id: 'ckpt-123', status: 'active', qrHash: 'different_hash' });
    await expect(useCase.execute(mockContext, mockRequest)).rejects.toThrow('QR_INTEGRITY_FAILED');
  });

  it('should throw LOCATION_FRAUD_DETECTED if guard is too far', async () => {
    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue({ id: 'ckpt-123', status: 'active', qrHash: 'valid_hash' });
    vi.mocked(PatrolRepository.verifyGuardLocation).mockResolvedValue(false); // FRAUD
    
    await expect(useCase.execute(mockContext, mockRequest)).rejects.toThrow('LOCATION_FRAUD_DETECTED');
  });

  it('should complete scan successfully and audit log', async () => {
    vi.mocked(PatrolRepository.getCheckpointById).mockResolvedValue({ id: 'ckpt-123', status: 'active', qrHash: 'valid_hash' });
    vi.mocked(PatrolRepository.verifyGuardLocation).mockResolvedValue(true);
    vi.mocked(PatrolRepository.createLog).mockResolvedValue({ id: 'log-123' });

    const result = await useCase.execute(mockContext, mockRequest);

    expect(result.success).toBe(true);
    expect(result.log.id).toBe('log-123');
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'PATROL_SCAN_QR',
      status: 'SUCCESS'
    }));
  });
});
