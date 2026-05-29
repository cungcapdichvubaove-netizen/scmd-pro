import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withTenantMock,
  dispatchMock,
  changeStorageClassMock,
  cacheDelMock,
  loggerInfoMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  dispatchMock: vi.fn(),
  changeStorageClassMock: vi.fn(),
  cacheDelMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../../core/events/event-bus.js', () => ({
  EventBus: {
    dispatch: dispatchMock,
  },
}));

vi.mock('../../../core/media/media.service.js', () => ({
  MediaService: {
    changeStorageClass: changeStorageClassMock,
  },
}));

vi.mock('../../../core/cache/manager.js', () => ({
  CacheManager: {
    del: cacheDelMock,
  },
}));

vi.mock('../../../core/logger/index.js', () => ({
  logger: {
    info: loggerInfoMock,
    error: loggerErrorMock,
  },
}));

import { TierIncidentEvidenceStorageUseCase } from './tier-incident-evidence-storage.usecase.js';

function createScanTx(targets: Array<{ id: string; metadata: Record<string, unknown> | null }>) {
  return {
    incidentEvidence: {
      findMany: vi.fn().mockResolvedValue(targets),
    },
  };
}

function createProcessTx(evidence: { id: string; metadata: Record<string, unknown> | null } | null) {
  return {
    incidentEvidence: {
      findUnique: vi.fn().mockResolvedValue(evidence),
      update: vi.fn().mockResolvedValue(undefined),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('TierIncidentEvidenceStorageUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chi queue evidence da locked, co storageKey va chua o COLD', async () => {
    const tx = createScanTx([
      { id: 'evidence-1', metadata: { storageKey: 'tenant-1/evidence-1.jpg', storageClass: 'STANDARD' } },
      { id: 'evidence-2', metadata: { storageKey: 'tenant-1/evidence-2.jpg', storageClass: 'COLD' } },
      { id: 'evidence-3', metadata: { storageClass: 'STANDARD' } },
      { id: 'evidence-4', metadata: null },
    ]);

    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));
    dispatchMock.mockResolvedValue(undefined);

    const useCase = new TierIncidentEvidenceStorageUseCase();
    const result = await useCase.execute('tenant-1');

    expect(result).toEqual({ queued: 1 });
    expect(withTenantMock).toHaveBeenCalledWith('tenant-1', expect.any(Function));
    expect(tx.incidentEvidence.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        isReportLocked: true,
      }),
      take: 500,
    }));
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EVIDENCE_STORAGE_TIERING_REQUESTED',
      tenantId: 'tenant-1',
      actorId: 'SYSTEM',
      payload: expect.objectContaining({
        evidenceId: 'evidence-1',
        storageKey: 'tenant-1/evidence-1.jpg',
        targetClass: 'COLD',
      }),
    }), tx);
  });

  it('processTieringRequest cap nhat metadata, ghi audit va xoa cache sau khi tier thanh cong', async () => {
    const tx = createProcessTx({
      id: 'evidence-1',
      metadata: { storageKey: 'tenant-1/evidence-1.jpg', storageClass: 'STANDARD', other: 'keep' },
    });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));
    changeStorageClassMock.mockResolvedValue(undefined);
    cacheDelMock.mockResolvedValue(undefined);

    const useCase = new TierIncidentEvidenceStorageUseCase();
    await useCase.processTieringRequest('tenant-1', {
      evidenceId: 'evidence-1',
      storageKey: 'tenant-1/evidence-1.jpg',
      targetClass: 'COLD',
      reason: 'Auto-tiering after 180 days',
    });

    expect(changeStorageClassMock).toHaveBeenCalledWith('tenant-1/evidence-1.jpg', 'COLD');
    expect(tx.incidentEvidence.update).toHaveBeenCalledWith({
      where: { id: 'evidence-1' },
      data: {
        metadata: expect.objectContaining({
          storageKey: 'tenant-1/evidence-1.jpg',
          storageClass: 'COLD',
          other: 'keep',
          tieredAt: expect.any(String),
        }),
      },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'SYSTEM',
        action: 'STORAGE_TIERING_MIGRATED',
        payload: expect.objectContaining({
          evidenceId: 'evidence-1',
          oldClass: 'STANDARD',
          newClass: 'COLD',
          storageKey: 'tenant-1/evidence-1.jpg',
        }),
      }),
    });
    expect(cacheDelMock).toHaveBeenCalledWith('evidence:url:evidence-1');
  });

  it('processTieringRequest bo qua update neu evidence da o dung storage class', async () => {
    const tx = createProcessTx({
      id: 'evidence-2',
      metadata: { storageKey: 'tenant-1/evidence-2.jpg', storageClass: 'COLD' },
    });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));
    changeStorageClassMock.mockResolvedValue(undefined);

    const useCase = new TierIncidentEvidenceStorageUseCase();
    await useCase.processTieringRequest('tenant-1', {
      evidenceId: 'evidence-2',
      storageKey: 'tenant-1/evidence-2.jpg',
      targetClass: 'COLD',
      reason: 'Auto-tiering after 180 days',
    });

    expect(changeStorageClassMock).toHaveBeenCalledWith('tenant-1/evidence-2.jpg', 'COLD');
    expect(tx.incidentEvidence.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(cacheDelMock).toHaveBeenCalledWith('evidence:url:evidence-2');
  });
});
