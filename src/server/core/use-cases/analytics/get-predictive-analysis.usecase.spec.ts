import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPredictiveAnalysisUseCase } from './get-predictive-analysis.usecase.js';
import { db } from '../../db/prisma.js';
import { GeminiService } from '../../ai/gemini.service.js';

// Mock dependencies
vi.mock('../../db/prisma.js', () => ({
  db: {
    forTenant: vi.fn()
  }
}));

vi.mock('../../ai/gemini.service.js', () => ({
  GeminiService: {
    predictBlindSpots: vi.fn()
  }
}));

vi.mock('../../cache/manager.js', () => ({
  CacheManager: {
    wrap: vi.fn(async (key, cb) => await cb())
  }
}));

describe('GetPredictiveAnalysisUseCase', () => {
  const tenantId = 'tenant-123';

  const mockPatrolLogFindMany = vi.fn();
  const mockCheckpointFindMany = vi.fn();
  const mockAuditLogCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(db.forTenant).mockReturnValue({
      patrolLog: { findMany: mockPatrolLogFindMany },
      checkpoint: { findMany: mockCheckpointFindMany },
      auditLog: { create: mockAuditLogCreate }
    } as any);
  });

  it('should query checkpoints with status="active" to match Prisma schema', async () => {
    mockPatrolLogFindMany.mockResolvedValue(new Array(5).fill({}));
    mockCheckpointFindMany.mockResolvedValue([]);
    vi.mocked(GeminiService.predictBlindSpots).mockResolvedValue({
      blindSpots: [],
      dynamicRouteSuggestions: []
    } as any);

    await GetPredictiveAnalysisUseCase.execute(tenantId);

    // Verify patrol log query
    expect(mockPatrolLogFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        createdAt: expect.any(Object)
      }),
      take: 100
    }));

    // CRITICAL: Verify checkpoint query uses status: 'active', not isActive: true
    expect(mockCheckpointFindMany).toHaveBeenCalledWith({
      where: { status: 'active' }
    });
  });

  it('should return insufficient data message if patrol logs < 5', async () => {
    mockPatrolLogFindMany.mockResolvedValue(new Array(4).fill({}));
    mockCheckpointFindMany.mockResolvedValue([]);

    const result = await GetPredictiveAnalysisUseCase.execute(tenantId);

    expect(result).toHaveProperty('message');
    expect((result as any).message).toContain('chưa đủ để phân tích xu hướng');
    expect(GeminiService.predictBlindSpots).not.toHaveBeenCalled();
  });

  it('should invoke Gemini and create audit log when data is sufficient', async () => {
    const mockAnalysis = {
      blindSpots: ['Area A'],
      dynamicRouteSuggestions: ['Route B']
    };
    mockPatrolLogFindMany.mockResolvedValue(new Array(5).fill({}));
    mockCheckpointFindMany.mockResolvedValue([{ id: 'cp1' }]);
    vi.mocked(GeminiService.predictBlindSpots).mockResolvedValue(mockAnalysis as any);

    const result = await GetPredictiveAnalysisUseCase.execute(tenantId);

    expect(GeminiService.predictBlindSpots).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'PREDICTIVE_INSIGHT_GENERATED',
        status: 'SUCCESS'
      })
    }));
    expect(result).toEqual(mockAnalysis);
  });
});
