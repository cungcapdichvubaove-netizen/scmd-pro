import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateIncidentStatusUseCase } from './update-incident-status.usecase.js';
import { db as pgDb } from '../../../core/db/prisma.js';
import { AuditService } from '../../../core/audit/audit.service.js';
import { IncidentStatus } from '@prisma/client';
import { UserRole } from '../../../core/architecture/types.js';

const mockIncidentFindUnique = vi.fn();
const mockIncidentUpdate = vi.fn();

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    forTenant: vi.fn(() => ({
      incident: {
        findUnique: mockIncidentFindUnique,
        update: mockIncidentUpdate
      }
    }))
  }
}));

vi.mock('../../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

vi.mock('../incident.repository.js', () => ({
  IncidentRepository: {
    invalidateList: vi.fn(),
    invalidateDetail: vi.fn()
  }
}));

describe('UpdateIncidentStatusUseCase', () => {
  let useCase: UpdateIncidentStatusUseCase;

  const mockContext = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.GUARD
  };

  const validRequest = {
    id: 'inc-123',
    status: 'INVESTIGATING',
    resolutionNotes: 'test notes'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateIncidentStatusUseCase();
  });

  describe('authorize', () => {
    it('should throw UNAUTHORIZED if context missing tenantId', async () => {
      await expect(useCase.authorize({ ...mockContext, tenantId: undefined as any }))
        .rejects.toThrow('UNAUTHORIZED');
    });

    it('should allow valid context', async () => {
      await expect(useCase.authorize(mockContext))
        .resolves.toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should pass Zod validation for valid status', async () => {
      await expect(useCase.validate(validRequest))
        .resolves.toBeUndefined();
    });

    it('should fail validation for invalid status mapping', async () => {
      await expect(useCase.validate({ ...validRequest, status: 'INVALID_STATE' }))
        .rejects.toThrow();
    });
  });

  describe('internalExecute', () => {
    it('should throw NotFoundError if incident does not exist', async () => {
      mockIncidentFindUnique.mockResolvedValue(null);

      await expect(useCase.internalExecute(mockContext, validRequest))
        .rejects.toThrow('Incident not found');
    });

    it('should throw BadRequestError if state transition is invalid', async () => {
      mockIncidentFindUnique.mockResolvedValue({
        id: 'inc-123', status: IncidentStatus.REPORTED
      } as any);

      // REPORTED cannot go directly to CLOSED
      await expect(useCase.internalExecute(mockContext, { ...validRequest, status: 'CLOSED' }))
        .rejects.toThrow("Không thể chuyển trạng thái sự cố từ 'REPORTED' sang 'CLOSED'");
    });

    it('should transition correctly and update timestamps', async () => {
      mockIncidentFindUnique.mockResolvedValue({
        id: 'inc-123', status: IncidentStatus.REPORTED
      } as any);

      const updateMock = vi.fn().mockResolvedValue({ id: 'inc-123', status: IncidentStatus.INVESTIGATING });
      mockIncidentUpdate.mockImplementation(updateMock);

      const result = await useCase.internalExecute(mockContext, validRequest);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'INVESTIGATING',
          investigatingAt: expect.any(Date)
        })
      }));
      expect(result.status).toBe('INVESTIGATING');
      expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'INCIDENT_STATUS_UPDATE',
        diff: { before: { status: 'REPORTED' }, after: { status: 'INVESTIGATING' } }
      }));
    });

    it('should add resolution details when status is RESOLVED', async () => {
      mockIncidentFindUnique.mockResolvedValue({
        id: 'inc-123', status: IncidentStatus.INVESTIGATING
      } as any);

      const updateMock = vi.fn().mockResolvedValue({ id: 'inc-123', status: IncidentStatus.RESOLVED });
      mockIncidentUpdate.mockImplementation(updateMock);

      await useCase.internalExecute(mockContext, {
        id: 'inc-123',
        status: 'RESOLVED',
        resolutionNotes: 'Fixed the leak',
        resolutionImages: ['img1.png']
      });

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
          resolutionNotes: 'Fixed the leak',
          resolutionImages: ['img1.png']
        })
      }));
    });
  });
});
