import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../core/architecture/types.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { VendorRepository } from './vendor.repository.js';

const { withTenantMock, getSpanMock, activeContextMock } = vi.hoisted(() => ({
  withTenantMock: vi.fn(),
  getSpanMock: vi.fn(),
  activeContextMock: { trace: 'ctx' },
}));

vi.mock('@opentelemetry/api', () => ({
  context: {
    active: vi.fn(() => activeContextMock),
  },
  trace: {
    getSpan: getSpanMock,
  },
}));

vi.mock('../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

vi.mock('../../core/audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn(),
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  loggerContext: {
    getStore: vi.fn(() => ({ traceId: 'logger-trace-id' })),
  },
}));

describe('VendorRepository.updateContract penalty rules audit', () => {
  const ctx = {
    userId: 'user-123',
    tenantId: 'tenant-123',
    role: UserRole.TENANT_ADMIN,
  };

  const existingContract = {
    id: 'contract-123',
    tenantId: 'tenant-123',
    vendorId: 'vendor-123',
    siteId: 'site-123',
    siteName: 'Site A',
    status: 'DRAFT',
    startDate: '2026-05-01',
    endDate: '2026-12-31',
    guardCountPerShift: 2,
    slaConfig: { responseTimeMinutes: 30 },
    acceptancePolicy: { shiftRequirements: [{ guardPostId: 'gp-1', startTime: '08:00', endTime: '20:00' }] },
    penaltyPolicy: {
      rules: [
        {
          clauseCode: 'C1',
          violationCode: 'LATE_CHECKIN',
          violationName: 'Late checkin',
          amount: 100,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
        {
          clauseCode: 'C2',
          violationCode: 'MISSING_POST',
          violationName: 'Missing post',
          amount: 200,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: true,
        },
      ],
    },
    activeVersionId: 'version-1',
  };

  const updatedContract = {
    ...existingContract,
    penaltyPolicy: {
      rules: [
        {
          clauseCode: 'C1',
          violationCode: 'LATE_CHECKIN',
          violationName: 'Late checkin',
          amount: 150,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
        {
          clauseCode: 'C3',
          violationCode: 'UNIFORM_VIOLATION',
          violationName: 'Uniform violation',
          amount: 50,
          penaltyUnit: 'PER_OCCURRENCE',
          graceCount: 0,
          evidenceRequired: false,
        },
      ],
    },
  };

  const beforeRuleRows = [
    {
      clauseCode: 'C1',
      violationCode: 'LATE_CHECKIN',
      ruleName: 'Late checkin',
      penaltyUnit: 'PER_OCCURRENCE',
      amount: 100,
      percentValue: null,
      graceCount: 0,
      maxMonthlyPenalty: null,
      repeatEscalation: null,
      evidenceRequired: false,
      isActive: true,
      extractedFromAI: false,
      sortOrder: 0,
      metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
    },
    {
      clauseCode: 'C2',
      violationCode: 'MISSING_POST',
      ruleName: 'Missing post',
      penaltyUnit: 'PER_OCCURRENCE',
      amount: 200,
      percentValue: null,
      graceCount: 0,
      maxMonthlyPenalty: null,
      repeatEscalation: null,
      evidenceRequired: true,
      isActive: true,
      extractedFromAI: false,
      sortOrder: 1,
      metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
    },
  ];

  const afterRuleRows = [
    {
      clauseCode: 'C1',
      violationCode: 'LATE_CHECKIN',
      ruleName: 'Late checkin',
      penaltyUnit: 'PER_OCCURRENCE',
      amount: 150,
      percentValue: null,
      graceCount: 0,
      maxMonthlyPenalty: null,
      repeatEscalation: null,
      evidenceRequired: false,
      isActive: true,
      extractedFromAI: false,
      sortOrder: 0,
      metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
    },
    {
      clauseCode: 'C2',
      violationCode: 'MISSING_POST',
      ruleName: 'Missing post',
      penaltyUnit: 'PER_OCCURRENCE',
      amount: 200,
      percentValue: null,
      graceCount: 0,
      maxMonthlyPenalty: null,
      repeatEscalation: null,
      evidenceRequired: true,
      isActive: false,
      extractedFromAI: false,
      sortOrder: 1,
      metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
    },
    {
      clauseCode: 'C3',
      violationCode: 'UNIFORM_VIOLATION',
      ruleName: 'Uniform violation',
      penaltyUnit: 'PER_OCCURRENCE',
      amount: 50,
      percentValue: null,
      graceCount: 0,
      maxMonthlyPenalty: null,
      repeatEscalation: null,
      evidenceRequired: false,
      isActive: true,
      extractedFromAI: false,
      sortOrder: 1,
      metadata: { legacyPenaltyUnit: 'PER_OCCURRENCE', notes: null },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getSpanMock.mockReturnValue({
      spanContext: () => ({ traceId: 'otel-trace-id' }),
    });
  });

  it('ghi audit event CONTRACT_PENALTY_RULES_SYNCED với before/after diff chính xác', async () => {
    const findManyMock = vi
      .fn()
      .mockResolvedValueOnce(beforeRuleRows)
      .mockResolvedValueOnce([
        { id: 'rule-1', violationCode: 'LATE_CHECKIN', clauseCode: 'C1' },
        { id: 'rule-2', violationCode: 'MISSING_POST', clauseCode: 'C2' },
        { id: 'rule-3', violationCode: 'UNIFORM_VIOLATION', clauseCode: 'C3' },
      ])
      .mockResolvedValueOnce(afterRuleRows);

    const tx = {
      contract: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(existingContract)
          .mockResolvedValueOnce(updatedContract),
        update: vi.fn().mockResolvedValue(updatedContract),
      },
      contractPenaltyRule: {
        findMany: findManyMock,
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: 'rule-1' })
          .mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockResolvedValue(undefined),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      site: {
        findFirst: vi.fn().mockResolvedValue({ id: 'site-123', siteName: 'Site A', status: 'ACTIVE' }),
      },
    };

    withTenantMock.mockImplementation(async (_tenantId: string, callback: (client: any) => Promise<unknown>) => callback(tx));

    const result = await VendorRepository.updateContract(ctx as any, 'contract-123', {
      penaltyPolicy: updatedContract.penaltyPolicy,
    });

    expect(result).toEqual(updatedContract);
    expect(AuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        tenantId: 'tenant-123',
        action: 'CONTRACT_PENALTY_RULES_SYNCED',
        resource: 'contract/contract-123/penalty-rules',
        status: 'SUCCESS',
        payload: expect.objectContaining({
          eventName: 'CONTRACT_PENALTY_RULES_SYNCED',
          rulesBeforeCount: 2,
          rulesAfterCount: 3,
          addedRuleKeys: ['tenant-123::contract-123::version-1::UNIFORM_VIOLATION::C3'],
          removedRuleKeys: [],
          changedRuleKeys: [
            'tenant-123::contract-123::version-1::LATE_CHECKIN::C1',
            'tenant-123::contract-123::version-1::MISSING_POST::C2',
          ],
          actorId: 'user-123',
          traceId: 'otel-trace-id',
        }),
      }),
      tx,
    );
  });
});

describe('VendorRepository vendor actor scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn vendor-commander assign guard vào ca thuộc vendor khác', async () => {
    const ctx = {
      userId: 'vendor-user-1',
      tenantId: 'tenant-123',
      role: UserRole.VENDOR_COMMANDER,
      assignedVendorId: 'vendor-a',
    };

    const tx = {
      shiftSchedule: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'schedule-b',
          contractId: 'contract-b',
          siteId: 'site-b',
          requiredCount: 1,
          date: '2026-06-01',
          startTime: '08:00',
          endTime: '20:00',
          guardPost: null,
          assignments: [],
        }),
      },
      contract: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'contract-b',
          vendorId: 'vendor-b',
          siteId: 'site-b',
          acceptancePolicy: {},
          activeVersion: { staffStandards: [] },
        }),
      },
      staff: {
        findFirst: vi.fn(),
      },
      shiftAssignment: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    withTenantMock.mockImplementation(async (_tenantId: string, callback: (client: any) => Promise<unknown>) => callback(tx));

    await expect(VendorRepository.assignGuardToShift(ctx as any, {
      shiftScheduleId: 'schedule-b',
      staffId: 'guard-1',
    })).rejects.toThrow('VENDOR_SCOPE_MISMATCH');

    expect(tx.staff.findFirst).not.toHaveBeenCalled();
    expect(tx.shiftAssignment.create).not.toHaveBeenCalled();
  });
});
