import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withTenantMock,
  forTenantMock,
  addJobMock,
  uploadBinaryMock,
  downloadBinaryMock,
} = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  forTenantMock: vi.fn(),
  addJobMock: vi.fn(),
  uploadBinaryMock: vi.fn(),
  downloadBinaryMock: vi.fn(),
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
    forTenant: forTenantMock,
  },
}));

vi.mock('../../../core/queue/index.js', () => ({
  QueueService: {
    addJob: addJobMock,
  },
}));

vi.mock('../../../core/media/media.service.js', () => ({
  MediaService: {
    uploadBinary: uploadBinaryMock,
    downloadBinary: downloadBinaryMock,
  },
}));

import {
  createMonthlyComplianceRevision,
  finalizeMonthlyComplianceReport,
} from './monthly-compliance.shared';
import { QueueMonthlyAcceptanceExportUseCase } from './queue-monthly-acceptance-export.usecase';
import { ReportArtifactStorageService } from './report-artifact-storage.service';

function createTx() {
  return {
    monthlyAcceptanceReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    penaltyItem: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    violationEvent: {
      findMany: vi.fn(),
    },
    incidentEvidence: {
      updateMany: vi.fn(),
    },
    vendorScorecard: {
      update: vi.fn(),
    },
  };
}

function createReport(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    tenantId: 'tenant-1',
    vendorId: 'vendor-1',
    contractId: 'contract-1',
    siteId: 'site-1',
    month: '2026-05',
    status: 'FINALIZED',
    scorecardId: 'scorecard-1',
    revisionNumber: 1,
    revisionRootId: null,
    previousRevisionId: null,
    generatedAt: new Date('2026-05-20T00:00:00.000Z'),
    generatedBy: 'user-1',
    finalizedAt: new Date('2026-05-20T01:00:00.000Z'),
    finalizedBy: 'user-1',
    totalPenaltyAmount: 300000,
    totalConfirmedViolations: 3,
    totalPendingViolations: 1,
    contractVersionId: 'contract-version-1',
    summary: { base: true },
    contractSnapshot: { id: 'contract-1' },
    vendorSnapshot: { id: 'vendor-1' },
    siteSnapshot: { id: 'site-1' },
    slaPolicySnapshot: { name: 'sla' },
    penaltyPolicySnapshot: { name: 'penalty' },
    scoreFormulaVersion: 'monthly-acceptance-scorecard-v2.5-groups',
    violationSnapshots: [{ id: 'vio-1' }],
    evidenceSnapshots: [{ id: 'evi-1' }],
    penaltyCalculationDetails: [{ id: 'calc-1' }],
    generatedDataHash: 'hash-1',
    penaltyItems: [],
    ...overrides,
  };
}

function createPenaltyItem(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-1',
    reportId: 'report-1',
    violationEventId: 'vio-1',
    penaltyRuleId: 'rule-1',
    vendorId: 'vendor-1',
    contractId: 'contract-1',
    siteId: 'site-1',
    type: 'SHIFT_UNDERSTAFFED',
    status: 'FINALIZED',
    baseAmount: 100000,
    unit: 'PER_OCCURRENCE',
    quantity: 1,
    graceApplied: false,
    capApplied: false,
    finalAmount: 100000,
    amount: 100000,
    reason: 'test',
    calculationDetail: { rule: 'C-01' },
    contractVersionSnapshot: { id: 'contract-version-1' },
    metadata: { source: 'spec' },
    ...overrides,
  };
}

describe('monthly compliance revision/finalize invariants', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    withTenantMock.mockReset();
    forTenantMock.mockReset();
    addJobMock.mockReset();
    uploadBinaryMock.mockReset();
  });

  it('tao revision draft moi tu finalized report va clone penalty items ve SUGGESTED', async () => {
    const tx = createTx();
    const finalizedReport = createReport();
    const revisionReport = createReport({
      id: 'report-2',
      status: 'DRAFT',
      revisionNumber: 2,
      revisionRootId: 'report-1',
      previousRevisionId: 'report-1',
      finalizedAt: null,
      finalizedBy: null,
    });
    const penaltyItems = [createPenaltyItem()];

    tx.monthlyAcceptanceReport.findFirst
      .mockResolvedValueOnce(finalizedReport)
      .mockResolvedValueOnce(null);
    tx.monthlyAcceptanceReport.create.mockResolvedValue(revisionReport);
    tx.penaltyItem.findMany.mockResolvedValue(penaltyItems);
    tx.penaltyItem.createMany.mockResolvedValue({ count: 1 });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await createMonthlyComplianceRevision({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-2',
      notes: 'Need correction',
    });

    expect(result).toBe(revisionReport);
    expect(tx.monthlyAcceptanceReport.create).toHaveBeenCalledTimes(1);
    expect(tx.monthlyAcceptanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'DRAFT',
        previousRevisionId: 'report-1',
        revisionNumber: 2,
        revisionRootId: 'report-1',
        generatedBy: 'user-2',
        summary: expect.objectContaining({
          base: true,
          revisionSourceReportId: 'report-1',
          revisionReason: 'Need correction',
        }),
      }),
    }));
    expect(tx.penaltyItem.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        reportId: 'report-2',
        status: 'SUGGESTED',
        violationEventId: 'vio-1',
      })],
    }));
  });

  it('khong tao revision moi neu da ton tai draft revision cua finalized source', async () => {
    const tx = createTx();
    const finalizedReport = createReport();
    const existingDraftRevision = createReport({
      id: 'report-2',
      status: 'DRAFT',
      previousRevisionId: 'report-1',
      revisionNumber: 2,
    });

    tx.monthlyAcceptanceReport.findFirst
      .mockResolvedValueOnce(finalizedReport)
      .mockResolvedValueOnce(existingDraftRevision);
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await createMonthlyComplianceRevision({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-2',
      notes: null,
    });

    expect(result).toBe(existingDraftRevision);
    expect(tx.monthlyAcceptanceReport.create).not.toHaveBeenCalled();
    expect(tx.penaltyItem.findMany).not.toHaveBeenCalled();
    expect(tx.penaltyItem.createMany).not.toHaveBeenCalled();
  });

  it('finalize revision se supersede previous finalized report va freeze penalty items', async () => {
    const tx = createTx();
    const draftRevision = createReport({
      id: 'report-2',
      status: 'DRAFT',
      previousRevisionId: 'report-1',
      revisionNumber: 2,
      penaltyItems: [createPenaltyItem({ reportId: 'report-2' })],
    });
    const finalizedRevision = createReport({
      id: 'report-2',
      status: 'FINALIZED',
      previousRevisionId: 'report-1',
      revisionNumber: 2,
    });

    tx.monthlyAcceptanceReport.findFirst.mockResolvedValue(draftRevision);
    tx.violationEvent.findMany.mockResolvedValue([
      { evidence: { incidentId: 'incident-1' } },
    ]);
    tx.penaltyItem.updateMany.mockResolvedValue({ count: 1 });
    tx.monthlyAcceptanceReport.update
      .mockResolvedValueOnce(finalizedRevision)
      .mockResolvedValueOnce({ ...createReport(), status: 'SUPERSEDED', supersededByReportId: 'report-2' });
    tx.incidentEvidence.updateMany.mockResolvedValue({ count: 1 });
    tx.vendorScorecard.update.mockResolvedValue({ id: 'scorecard-1', status: 'FINALIZED' });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await finalizeMonthlyComplianceReport({
      tenantId: 'tenant-1',
      reportId: 'report-2',
      actorId: 'user-2',
      notes: 'Finalized after correction',
    });

    expect(result).toBe(finalizedRevision);
    expect(tx.penaltyItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ reportId: 'report-2' }),
      data: { status: 'FINALIZED' },
    }));
    expect(tx.monthlyAcceptanceReport.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { id: 'report-2' },
      data: expect.objectContaining({
        status: 'FINALIZED',
        finalizedBy: 'user-2',
        summary: expect.objectContaining({
          finalizedNotes: 'Finalized after correction',
        }),
      }),
    }));
    expect(tx.monthlyAcceptanceReport.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { id: 'report-1' },
      data: expect.objectContaining({
        status: 'SUPERSEDED',
        supersededBy: 'user-2',
        supersededByReportId: 'report-2',
      }),
    }));
    expect(tx.incidentEvidence.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        incidentId: { in: ['incident-1'] },
      }),
      data: expect.objectContaining({
        isReportLocked: true,
        lockedByReportId: 'report-2',
      }),
    }));
  });

  it('tra loi som va khong ghi them neu report da o trang thai FINALIZED', async () => {
    const tx = createTx();
    const finalizedReport = createReport({
      id: 'report-1',
      status: 'FINALIZED',
      penaltyItems: [createPenaltyItem()],
    });

    tx.monthlyAcceptanceReport.findFirst.mockResolvedValue(finalizedReport);
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await finalizeMonthlyComplianceReport({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-2',
      notes: 'ignored',
    });

    expect(result).toBe(finalizedReport);
    expect(tx.penaltyItem.updateMany).not.toHaveBeenCalled();
    expect(tx.monthlyAcceptanceReport.update).not.toHaveBeenCalled();
    expect(tx.incidentEvidence.updateMany).not.toHaveBeenCalled();
    expect(tx.vendorScorecard.update).not.toHaveBeenCalled();
  });

  it('chan finalize voi report SUPERSEDED vi bat bien lich su', async () => {
    const tx = createTx();
    tx.monthlyAcceptanceReport.findFirst.mockResolvedValue(createReport({
      status: 'SUPERSEDED',
    }));
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    await expect(finalizeMonthlyComplianceReport({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-2',
      notes: null,
    })).rejects.toThrow('REPORT_SUPERSEDED_AND_IMMUTABLE');

    expect(tx.penaltyItem.updateMany).not.toHaveBeenCalled();
    expect(tx.monthlyAcceptanceReport.update).not.toHaveBeenCalled();
  });
});

describe('export/artifact mutation risks on finalized reports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    withTenantMock.mockReset();
    forTenantMock.mockReset();
    addJobMock.mockReset();
    uploadBinaryMock.mockReset();
    downloadBinaryMock.mockReset();
  });

  it('chi cho queue export khi monthly acceptance report da finalized', async () => {
    const reportModel = {
      findFirst: vi.fn().mockResolvedValue(createReport({ status: 'FINALIZED' })),
      update: vi.fn().mockResolvedValue({ id: 'report-1', exportPdfJobId: 'job-123' }),
    };

    forTenantMock.mockReturnValue({
      monthlyAcceptanceReport: reportModel,
    });
    addJobMock.mockResolvedValue({ id: 'job-123' });

    const useCase = new QueueMonthlyAcceptanceExportUseCase();
    const result = await useCase.execute(
      { tenantId: 'tenant-1', userId: 'user-1', role: 'admin' } as any,
      'report-1',
      { format: 'pdf' },
    );

    expect(result).toEqual({ jobId: 'job-123', status: 'queued', format: 'pdf' });
    expect(reportModel.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'report-1', tenantId: 'tenant-1' }),
    }));
    expect(reportModel.update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { exportPdfJobId: 'job-123' },
    });
  });

  it('tu choi queue export khi report chua finalized de tranh artifact sai snapshot', async () => {
    const reportModel = {
      findFirst: vi.fn().mockResolvedValue(createReport({ status: 'DRAFT' })),
      update: vi.fn(),
    };

    forTenantMock.mockReturnValue({
      monthlyAcceptanceReport: reportModel,
    });

    const useCase = new QueueMonthlyAcceptanceExportUseCase();

    await expect(useCase.execute(
      { tenantId: 'tenant-1', userId: 'user-1', role: 'admin' } as any,
      'report-1',
      { format: 'excel' },
    )).rejects.toThrow('REPORT_EXPORT_REQUIRES_FINALIZED_STATUS');

    expect(addJobMock).not.toHaveBeenCalled();
    expect(reportModel.update).not.toHaveBeenCalled();
  });

  it('artifact storage chay trong withTenant de gan attachment id dung RLS context', async () => {
    const reportModel = {
      update: vi.fn().mockResolvedValue({ id: 'report-1', exportPdfAttachmentId: 'att-1' }),
    };
    const attachmentModel = {
      create: vi.fn().mockResolvedValue({ id: 'att-1' }),
      update: vi.fn().mockResolvedValue({ id: 'att-1', url: 'https://download.example.com/att-1' }),
    };

    uploadBinaryMock.mockResolvedValue({
      publicId: 'storage-key-1',
      url: 'https://storage.example.com/file.pdf',
    });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation({
      monthlyAcceptanceReport: reportModel,
      attachment: attachmentModel,
    }));

    const result = await ReportArtifactStorageService.store({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      fileName: 'acceptance.pdf',
      fileType: 'application/pdf',
      content: Buffer.from('pdf-content'),
      kind: 'pdf',
      generatedBy: 'user-1',
    });

    expect(forTenantMock).not.toHaveBeenCalled();
    expect(withTenantMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'att-1', url: 'https://download.example.com/att-1' });
    expect(attachmentModel.create).toHaveBeenCalledTimes(1);
    expect(attachmentModel.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: {
        url: expect.stringContaining('/api/tenant/monthly-acceptance-reports/report-1/artifacts/att-1/download'),
      },
    });
    expect(reportModel.update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { exportPdfAttachmentId: 'att-1' },
    });
  });
});
