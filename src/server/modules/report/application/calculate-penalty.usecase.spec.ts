import { describe, it, expect, vi } from 'vitest';
import { CalculatePenaltyUseCase } from './calculate-penalty.usecase.js';

function makeDb(overrides: {
  violation?: any;
  rule?: any;
  historyCount?: number;
} = {}) {
  const violation = overrides.violation ?? {
    id: 'violation-1',
    contractId: 'contract-1',
    violationCode: 'LATE_RESPONSE',
    contract: {
      totalAmount: 10000000,
    },
  };

  const rule = overrides.rule ?? {
    id: 'rule-1',
    contractId: 'contract-1',
    violationCode: 'LATE_RESPONSE',
    isActive: true,
    amount: 100000,
    penaltyUnit: 'PER_OCCURRENCE',
    percentValue: 0,
    graceCount: 1,
    repeatEscalation: 0.5,
    maxMonthlyPenalty: 180000,
  };

  return {
    forTenant: vi.fn().mockReturnValue({
      violationEvent: {
        findUnique: vi.fn().mockResolvedValue(violation),
        count: vi.fn().mockResolvedValue(overrides.historyCount ?? 1),
      },
      contractPenaltyRule: {
        findFirst: vi.fn().mockResolvedValue(rule),
      },
    }),
  };
}

describe('CalculatePenaltyUseCase', () => {
  it('ap dung repeatEscalation khi so lan tai pham vuot graceCount', async () => {
    const db = makeDb({
      historyCount: 4,
      rule: {
        id: 'rule-repeat',
        contractId: 'contract-1',
        violationCode: 'LATE_RESPONSE',
        isActive: true,
        amount: 100000,
        penaltyUnit: 'PER_OCCURRENCE',
        percentValue: 0,
        graceCount: 1,
        repeatEscalation: 0.5,
        maxMonthlyPenalty: null,
      },
    });

    const useCase = new CalculatePenaltyUseCase(db);

    const result = await useCase.execute({
      violationId: 'violation-1',
      tenantId: 'tenant-1',
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(result).toMatchObject({
      violationId: 'violation-1',
      penaltyRuleId: 'rule-repeat',
      baseAmount: 100000,
      finalAmount: 200000,
      capApplied: false,
    });
    expect(result?.calculationDetail).toContain('Repeats: 2');
  });

  it('gioi han finalAmount theo maxMonthlyPenalty sau khi escalation da tinh xong', async () => {
    const db = makeDb({
      historyCount: 3,
      rule: {
        id: 'rule-cap',
        contractId: 'contract-1',
        violationCode: 'LATE_RESPONSE',
        isActive: true,
        amount: 100000,
        penaltyUnit: 'PER_OCCURRENCE',
        percentValue: 0,
        graceCount: 0,
        repeatEscalation: 0.5,
        maxMonthlyPenalty: 180000,
      },
    });

    const useCase = new CalculatePenaltyUseCase(db);

    const result = await useCase.execute({
      violationId: 'violation-1',
      tenantId: 'tenant-1',
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(result).toMatchObject({
      violationId: 'violation-1',
      penaltyRuleId: 'rule-cap',
      baseAmount: 100000,
      finalAmount: 180000,
      capApplied: true,
    });
    expect(result?.calculationDetail).toContain('Cap: 180000');
  });
});
