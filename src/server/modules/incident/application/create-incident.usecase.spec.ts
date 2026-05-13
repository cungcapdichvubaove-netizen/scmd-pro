import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateIncidentUseCase } from './create-incident.usecase.js';
import { db } from '../../../core/db/prisma.js';
import { NotificationService } from '../../notification/notification.service.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { IncidentSeverity } from '@prisma/client';
import { UserRole } from '../../../core/architecture/types.js';

const mockIncidentCreate = vi.fn();

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    forTenant: vi.fn(() => ({
      incident: {
        create: mockIncidentCreate
      }
    }))
  }
}));

vi.mock('../../notification/notification.service.js', () => ({
  NotificationService: {
    send: vi.fn()
  }
}));

vi.mock('../../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

const mockEnsureSameTenant = vi.fn();
vi.mock('../../../core/db/integrity.manager.js', () => ({
  IntegrityGuard: {
    ensureSameTenant: mockEnsureSameTenant
  }
}));

vi.mock('../incident.repository.js', () => ({
  IncidentRepository: {
    invalidateList: vi.fn()
  }
}));

const mockLightQueueAdd = vi.fn();
const mockHeavyQueueAdd = vi.fn();
vi.mock('../../../core/queue/index.js', () => ({
  getLightQueue: vi.fn(() => ({
    add: mockLightQueueAdd
  })),
  getHeavyQueue: vi.fn(() => ({
    add: mockHeavyQueueAdd
  }))
}));

describe('CreateIncidentUseCase', () => {
  let useCase: CreateIncidentUseCase;

  const mockContext = {
    userId: 'guard-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  const validRequest = {
    type: 'Theft',
    severity: 'HIGH',
    description: 'Someone broke in',
    imageUri: 'https://example.com/img.png'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateIncidentUseCase();
  });

  describe('authorize', () => {
    it('should throw UNAUTHORIZED if no tenantId', async () => {
      await expect(useCase.authorize({ ...mockContext, tenantId: undefined as any })).rejects.toThrow();
    });

    it('should pass if tenantId is present', async () => {
      await expect(useCase.authorize(mockContext)).resolves.toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should validate using IntegrityGuard', async () => {
      mockEnsureSameTenant.mockResolvedValue(true);
      await expect(useCase.validate(validRequest, mockContext)).resolves.toBeUndefined();
      expect(mockEnsureSameTenant).toHaveBeenCalledWith('tenant-123', 'staff', ['guard-123']);
    });
  });

  describe('internalExecute', () => {
    it('should create incident and notify queues when critical and with image', async () => {
      mockIncidentCreate.mockResolvedValue({ id: 'inc-123', type: 'Theft', severity: IncidentSeverity.HIGH } as any);

      const result = await useCase.internalExecute(mockContext, validRequest);

      expect(mockIncidentCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'Theft',
          severity: IncidentSeverity.HIGH,
          severityWeight: 3
        })
      }));

      expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE_INCIDENT'
      }));

      expect(NotificationService.send).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'tenant-123',
        type: 'SOS'
      }));

      expect(mockLightQueueAdd).toHaveBeenCalledWith('critical-incident-zalo-notify', expect.objectContaining({
        incidentId: 'inc-123'
      }), expect.any(Object));

      expect(mockHeavyQueueAdd).toHaveBeenCalledWith('analyze-incident-image', expect.objectContaining({
        imageUri: 'https://example.com/img.png'
      }), expect.any(Object));

      expect(result.id).toEqual('inc-123');
    });

    it('should handle low severity incidents without adding to light queue', async () => {
      mockIncidentCreate.mockResolvedValue({ id: 'inc-124', type: 'Noise', severity: 'LOW' } as any);

      await useCase.internalExecute(mockContext, { type: 'Noise', severity: 'LOW' });

      expect(mockIncidentCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          severity: IncidentSeverity.LOW,
          severityWeight: 1
        })
      }));

      expect(NotificationService.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'INFO'
      }));

      expect(mockLightQueueAdd).not.toHaveBeenCalled();
      expect(mockHeavyQueueAdd).not.toHaveBeenCalled(); // No imageUri provided
    });
  });
});
