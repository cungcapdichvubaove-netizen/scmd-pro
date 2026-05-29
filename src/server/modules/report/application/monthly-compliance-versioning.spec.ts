import { beforeEach, describe, expect, it, vi } from 'vitest';

const { withTenantMock } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../../core/logger/index.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { generateMonthlyComplianceSnapshot } from './monthly-compliance.shared';
import { GetMonthlyAcceptanceVersionBindingUseCase } from './get-monthly-acceptance-version-binding.usecase';

function createReportTx(overrides: Record<string, any> = {}) {
  const tx = {
    vendor: {
      findFirst: vi.fn().mockResolvedValue({ id: 'vendor-1', name: 'Vendor A' }),
    },
    contract: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'contract-1',
        tenantId: 'tenant-1',
        vendorId: 'vendor-1',
        siteId: 'site-1',
        activeVersionId: 'version-new',
        contractCode: 'HD-01',
        contractName: 'Hop dong bao ve',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        value: 30000000,
        currency: 'VND',
        guardCountPerShift: 2,
        acceptancePolicy: { source: 'live-new' },
        evidencePolicy: { live: true },
        penaltyPolicy: { source: 'live-new' },
        slaConfig: { responseTimeMinutes: 15 },
        activeVersion: {
          id: 'version-new',
          versionNumber: 2,
          status: 'ACTIVE',
          effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
          effectiveTo: null,
          totalContractValue: 30000000,
          currency: 'VND',
          guardCountPerShift: 3,
          acceptancePolicy: { source: 'active-new' },
          penaltyPolicy: { source: 'active-new' },
          slaConfig: { responseTimeMinutes: 10 },
        },
      }),
    },
    contractVersion: {
      findFirst: vi.fn(),
    },
    patrolSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    incident: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    violationEvent: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'vio-1',
          status: 'PENALIZED',
          violationType: 'SHIFT_UNDERSTAFFED',
          vendorId: 'vendor-1',
          contractId: 'contract-1',
          siteId: 'site-1',
          sourceType: 'SHIFT_SCHEDULE',
          severity: 'HIGH',
          occurredAt: new Date('2026-05-10T01:00:00.000Z'),
          penaltyAmount: 0,
          evidence: {},
          metadata: {},
        },
      ]),
    },
    shiftSchedule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    shiftComplianceItem: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    site: {
      findFirst: vi.fn().mockResolvedValue({ id: 'site-1', siteName: 'Site A', status: 'ACTIVE' }),
    },
    contractPenaltyRule: {
      findMany: vi.fn(),
    },
    vendorScorecard: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'scorecard-1' }),
      update: vi.fn(),
    },
    monthlyAcceptanceReport: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'report-1' }),
      update: vi.fn(),
    },
    penaltyItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };

  return tx;
}

const oldVersion = {
  id: 'version-old',
  versionNumber: 1,
  status: 'SUPERSEDED',
  effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
  effectiveTo: new Date('2026-05-31T23:59:59.999Z'),
  totalContractValue: 20000000,
  currency: 'VND',
  guardCountPerShift: 2,
  acceptancePolicy: { source: 'old-policy' },
  penaltyPolicy: { source: 'old-policy' },
  slaConfig: { responseTimeMinutes: 30 },
  lineItems: [
    {
      id: 'line-old',
      siteId: 'site-1',
      guardPostId: null,
      shiftType: 'MORNING',
      shiftName: 'Ca cu',
      startTime: '08:00',
      endTime: '20:00',
      positionName: 'Bao ve cu',
      requiredStaffCount: 2,
      unitPrice: 10000000,
      billingCycle: 'MONTHLY',
      totalAmount: 20000000,
      sortOrder: 1,
    },
  ],
};

const newVersion = {
  id: 'version-new',
  versionNumber: 2,
  status: 'ACTIVE',
  effectiveFrom: new Date('2026-06-01T00:00:00.000Z'),
  effectiveTo: null,
  totalContractValue: 30000000,
  currency: 'VND',
  guardCountPerShift: 3,
  acceptancePolicy: { source: 'new-policy' },
  penaltyPolicy: { source: 'new-policy' },
  slaConfig: { responseTimeMinutes: 10 },
  lineItems: [
    {
      id: 'line-new',
      siteId: 'site-1',
      guardPostId: null,
      shiftType: 'NIGHT',
      shiftName: 'Ca moi',
      startTime: '20:00',
      endTime: '08:00',
      positionName: 'Bao ve moi',
      requiredStaffCount: 3,
      unitPrice: 10000000,
      billingCycle: 'MONTHLY',
      totalAmount: 30000000,
      sortOrder: 1,
    },
  ],
};

const oldRule = {
  id: 'rule-old',
  ruleName: 'Rule cu',
  violationCode: 'SHIFT_UNDERSTAFFED',
  penaltyUnit: 'PER_OCCURRENCE',
  amount: 100000,
  percentValue: 0,
  graceCount: 0,
  maxMonthlyPenalty: null,
  repeatEscalation: null,
  isActive: true,
  sortOrder: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  clauseCode: 'OLD',
  contractVersionId: 'version-old',
};

const newRule = {
  ...oldRule,
  id: 'rule-new',
  ruleName: 'Rule moi',
  amount: 500000,
  clauseCode: 'NEW',
  contractVersionId: 'version-new',
};

describe('monthly compliance contract version snapshot correctness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    withTenantMock.mockReset();
  });

  it('khong doi ket qua thang cu khi live activeVersion da chuyen sang policy moi', async () => {
    const tx = createReportTx();
    tx.contractVersion.findFirst.mockResolvedValue(oldVersion);
    tx.contractPenaltyRule.findMany.mockResolvedValue([oldRule]);
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await generateMonthlyComplianceSnapshot({
      tenantId: 'tenant-1',
      month: '2026-05',
      vendorId: 'vendor-1',
      contractId: 'contract-1',
      siteId: 'site-1',
      actorId: 'user-1',
    });

    expect(result.report).toEqual({ id: 'report-1' });
    expect(tx.contractVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        contractId: 'contract-1',
        effectiveFrom: { lt: new Date('2026-06-01T00:00:00.000Z') },
      }),
    }));
    expect(tx.contractPenaltyRule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        contractVersionId: 'version-old',
      }),
    }));
    expect(tx.monthlyAcceptanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contractVersionId: 'version-old',
        totalPenaltyAmount: expect.anything(),
        penaltyPolicySnapshot: { source: 'old-policy' },
        summary: expect.objectContaining({
          contractVersionId: 'version-old',
          financialSummary: expect.objectContaining({
            contractValue: 20000000,
            totalEffectivePenalty: 100000,
            totalProposedAcceptance: 19900000,
          }),
        }),
        contractSnapshot: expect.objectContaining({
          contractVersionId: 'version-old',
          value: 20000000,
          lineItems: [expect.objectContaining({ id: 'line-old' })],
        }),
      }),
    }));
  });

  it('thang moi dung version va penalty policy moi theo cutoff', async () => {
    const tx = createReportTx();
    tx.contractVersion.findFirst.mockResolvedValue(newVersion);
    tx.contractPenaltyRule.findMany.mockResolvedValue([newRule]);
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    await generateMonthlyComplianceSnapshot({
      tenantId: 'tenant-1',
      month: '2026-06',
      vendorId: 'vendor-1',
      contractId: 'contract-1',
      siteId: 'site-1',
      actorId: 'user-1',
    });

    expect(tx.contractPenaltyRule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        contractVersionId: 'version-new',
      }),
    }));
    expect(tx.monthlyAcceptanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contractVersionId: 'version-new',
        penaltyPolicySnapshot: { source: 'new-policy' },
        summary: expect.objectContaining({
          contractVersionId: 'version-new',
          financialSummary: expect.objectContaining({
            contractValue: 30000000,
            totalEffectivePenalty: 500000,
            totalProposedAcceptance: 29500000,
          }),
        }),
      }),
    }));
  });

  it('fallback an toan cho legacy contract chua co ContractVersion', async () => {
    const tx = createReportTx();
    tx.contractVersion.findFirst.mockResolvedValue(null);
    tx.contractPenaltyRule.findMany.mockResolvedValue([]);
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    await generateMonthlyComplianceSnapshot({
      tenantId: 'tenant-1',
      month: '2026-04',
      vendorId: 'vendor-1',
      contractId: 'contract-1',
      siteId: 'site-1',
      actorId: 'user-1',
    });

    expect(tx.monthlyAcceptanceReport.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contractVersionId: 'version-new',
        contractSnapshot: expect.objectContaining({
          contractVersionId: 'version-new',
          value: 30000000,
        }),
      }),
    }));
  });
});

describe('monthly acceptance version binding API use case', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    withTenantMock.mockReset();
  });

  it('tra ve contractVersionId da bind tren report ma khong resolve lai live version', async () => {
    const tx = createReportTx({
      monthlyAcceptanceReport: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'report-old',
          tenantId: 'tenant-1',
          month: '2026-05',
          vendorId: 'vendor-1',
          contractId: 'contract-1',
          siteId: 'site-1',
          status: 'FINALIZED',
          contractVersionId: 'version-old',
          contractSnapshot: { contractVersionId: 'version-old', value: 20000000 },
          summary: { contractVersionId: 'version-old' },
        }),
      },
    });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    const result = await new GetMonthlyAcceptanceVersionBindingUseCase().execute({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'TENANT_ADMIN',
    } as any, 'report-old');

    expect(result).toEqual(expect.objectContaining({
      reportId: 'report-old',
      contractVersionId: 'version-old',
      summaryContractVersionId: 'version-old',
      contractSnapshot: expect.objectContaining({ contractVersionId: 'version-old' }),
    }));
    expect(tx.contractVersion.findFirst).not.toHaveBeenCalled();
  });

  it('bao loi REPORT_NOT_FOUND khi report khong ton tai trong tenant', async () => {
    const tx = createReportTx({
      monthlyAcceptanceReport: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    await expect(new GetMonthlyAcceptanceVersionBindingUseCase().execute({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'TENANT_ADMIN',
    } as any, 'missing-report')).rejects.toThrow('REPORT_NOT_FOUND');
  });

  it('reject invalid reportId truoc khi query DB', async () => {
    const tx = createReportTx();
    withTenantMock.mockImplementation(async (_tenantId, operation) => operation(tx));

    await expect(new GetMonthlyAcceptanceVersionBindingUseCase().execute({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'TENANT_ADMIN',
    } as any, '')).rejects.toThrow();
    expect(withTenantMock).not.toHaveBeenCalled();
  });
});
