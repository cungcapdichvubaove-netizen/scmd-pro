import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computePenaltyItemsV2 } from './penalty-engine-v2';

function makeTx(rules: any[]) {
  return {
    contractPenaltyRule: {
      findMany: vi.fn().mockResolvedValue(rules),
    },
  };
}

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    ruleName: 'Understaffed penalty',
    violationCode: 'SHIFT_UNDERSTAFFED',
    penaltyUnit: 'PER_OCCURRENCE',
    amount: 100000,
    percentValue: 0,
    graceCount: 0,
    maxMonthlyPenalty: null,
    repeatEscalation: null,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    clauseCode: 'C-01',
    ...overrides,
  };
}

function makeViolation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vio-1',
    violationType: 'SHIFT_UNDERSTAFFED',
    vendorId: 'vendor-1',
    contractId: 'contract-1',
    siteId: 'site-1',
    sourceType: 'SHIFT_SCHEDULE',
    severity: 'HIGH',
    occurredAt: new Date('2026-05-10T01:00:00.000Z'),
    metadata: {},
    ...overrides,
  };
}

const baseInput = {
  tenantId: 'tenant-1',
  month: '2026-05',
  vendorId: 'vendor-1',
  contractId: 'contract-1',
  siteId: 'site-1',
};

const baseContract = {
  id: 'contract-1',
  activeVersionId: 'contract-version-old',
  contractCode: 'HD-01',
  contractName: 'Hop dong bao ve',
  status: 'ACTIVE',
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-12-31T00:00:00.000Z'),
  value: 10000000,
  currency: 'VND',
  penaltyPolicy: { rules: [] },
};

describe('computePenaltyItemsV2', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mien phat lan dau theo graceCount va van giu audit detail ro rang', async () => {
    const tx = makeTx([
      makeRule({ graceCount: 1 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation(),
      makeViolation({ id: 'vio-2', occurredAt: new Date('2026-05-11T01:00:00.000Z') }),
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.finalAmount).toBe(0);
    expect(result.items[0]?.graceApplied).toBe(true);
    expect(result.items[1]?.finalAmount).toBe(100000);
    expect(result.items[1]?.graceApplied).toBe(false);
    expect(result.items[0]?.calculationDetail).toMatchObject({
      graceCount: 1,
      graceApplied: true,
      occurrenceIndex: 1,
    });
  });

  it('ap dung tran phat theo thang va khong cho vuot cap', async () => {
    const tx = makeTx([
      makeRule({ amount: 100000, maxMonthlyPenalty: 150000 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation(),
      makeViolation({ id: 'vio-2' }),
      makeViolation({ id: 'vio-3' }),
    ]);

    expect(result.items.map((item) => item.finalAmount)).toEqual([100000, 50000, 0]);
    expect(result.items.map((item) => item.capApplied)).toEqual([false, true, true]);
    expect(result.summary.rulesEvaluated[0]?.totalAmount).toBe(150000);
  });

  it('phat theo phan tram gia tri hop dong', async () => {
    const tx = makeTx([
      makeRule({
        id: 'rule-percent',
        ruleName: 'Percent contract',
        violationCode: 'SLA_BREACH',
        penaltyUnit: 'PERCENT_CONTRACT',
        amount: 0,
        percentValue: 2.5,
      }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-sla', violationType: 'SLA_BREACH' }),
    ]);

    expect(result.items[0]).toMatchObject({
      unit: 'PERCENT_CONTRACT',
      baseAmount: 10000000,
      quantity: 2.5,
      finalAmount: 250000,
    });
  });

  it('phat theo so luong guard thieu', async () => {
    const tx = makeTx([
      makeRule({ penaltyUnit: 'PER_GUARD', amount: 200000 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ metadata: { missingCount: 3 } }),
    ]);

    expect(result.items[0]).toMatchObject({
      unit: 'PER_GUARD',
      quantity: 3,
      baseAmount: 200000,
      finalAmount: 600000,
    });
  });

  it('phat theo so gio di tre hoac phan ung tre va lam tron 2 chu so thap phan', async () => {
    const tx = makeTx([
      makeRule({
        id: 'rule-hour',
        ruleName: 'Late by hour',
        violationCode: 'LATE_RESPONSE',
        penaltyUnit: 'PER_HOUR',
        amount: 125000,
      }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({
        id: 'vio-late',
        violationType: 'LATE_RESPONSE',
        metadata: { lateMinutes: 95 },
      }),
    ]);

    expect(result.items[0]).toMatchObject({
      unit: 'PER_HOUR',
      quantity: 1.58,
      baseAmount: 125000,
      finalAmount: 197500,
    });
  });

  it('phat tang dan khi tai pham nhieu lan theo repeatEscalation', async () => {
    const tx = makeTx([
      makeRule({
        repeatEscalation: [
          { afterCount: 1, multiplier: 1.5 },
          { afterCount: 3, multiplier: 2 },
        ],
      }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-1' }),
      makeViolation({ id: 'vio-2' }),
      makeViolation({ id: 'vio-3' }),
      makeViolation({ id: 'vio-4' }),
    ]);

    expect(result.items.map((item) => item.finalAmount)).toEqual([100000, 150000, 150000, 200000]);
    expect(result.items[3]?.calculationDetail).toMatchObject({
      escalationMultiplier: 2,
      escalationRule: { afterCount: 3, multiplier: 2 },
    });
  });

  it('xu ly nhieu loai phat cung ky mot cach doc lap theo tung rule', async () => {
    const tx = makeTx([
      makeRule({ id: 'rule-a', violationCode: 'SHIFT_UNDERSTAFFED', penaltyUnit: 'PER_GUARD', amount: 100000 }),
      makeRule({ id: 'rule-b', violationCode: 'LATE_RESPONSE', penaltyUnit: 'PER_HOUR', amount: 50000 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-a', metadata: { missingCount: 2 } }),
      makeViolation({ id: 'vio-b', violationType: 'LATE_RESPONSE', metadata: { lateMinutes: 120 } }),
    ]);

    expect(result.items.map((item) => item.finalAmount)).toEqual([200000, 100000]);
    expect(result.summary.rulesEvaluated).toHaveLength(2);
  });

  it('khong vuot cap ngay ca khi co escalation va gia tri cuoi cung con lai nho hon computed amount', async () => {
    const tx = makeTx([
      makeRule({
        amount: 100000,
        maxMonthlyPenalty: 220000,
        repeatEscalation: [{ afterCount: 1, multiplier: 2 }],
      }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-1' }),
      makeViolation({ id: 'vio-2' }),
    ]);

    expect(result.items.map((item) => item.finalAmount)).toEqual([100000, 120000]);
    expect(result.items[1]?.capApplied).toBe(true);
  });

  it('tra ve so tien phat bang 0 khi rule amount bang 0', async () => {
    const tx = makeTx([
      makeRule({ amount: 0 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [makeViolation()]);

    expect(result.items[0]?.finalAmount).toBe(0);
    expect(result.summary.rulesEvaluated[0]?.totalAmount).toBe(0);
  });

  it('bo qua violation khong co rule match va ghi vao unmatchedViolationIds', async () => {
    const tx = makeTx([
      makeRule({ violationCode: 'ANOTHER_CODE' }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-unmatched', violationType: 'UNKNOWN_CODE' }),
    ]);

    expect(result.items).toEqual([]);
    expect(result.summary.unmatchedViolationIds).toEqual(['vio-unmatched']);
  });

  it('tra ve rong khi thieu contractId hieu luc', async () => {
    const tx = makeTx([makeRule()]);

    const result = await computePenaltyItemsV2(
      tx,
      { ...baseInput, contractId: null },
      null,
      [makeViolation()],
    );

    expect(result.items).toEqual([]);
    expect(result.summary.unmatchedViolationIds).toEqual(['vio-1']);
  });

  it('fallback quantity = 1 khi metadata PER_GUARD hoac PER_HOUR thieu hoac khong hop le', async () => {
    const tx = makeTx([
      makeRule({ id: 'rule-guard', penaltyUnit: 'PER_GUARD', amount: 100000 }),
      makeRule({ id: 'rule-hour', violationCode: 'LATE_RESPONSE', penaltyUnit: 'PER_HOUR', amount: 50000 }),
    ]);

    const result = await computePenaltyItemsV2(tx, baseInput, baseContract, [
      makeViolation({ id: 'vio-guard', metadata: { missingCount: 'abc' } }),
      makeViolation({ id: 'vio-hour', violationType: 'LATE_RESPONSE', metadata: { lateMinutes: 'invalid' } }),
    ]);

    expect(result.items[0]).toMatchObject({ quantity: 1, finalAmount: 100000 });
    expect(result.items[1]).toMatchObject({ quantity: 1, finalAmount: 50000 });
  });

  it('uu tien rule theo contractVersionId cua report thay vi rule cu chi trung contractId', async () => {
    const newVersionRule = makeRule({
      id: 'rule-new-version',
      ruleName: 'Rule version moi',
      amount: 250000,
      contractVersionId: 'contract-version-new',
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
    });
    const oldVersionRule = makeRule({
      id: 'rule-old-version',
      ruleName: 'Rule version cu',
      amount: 100000,
      contractVersionId: 'contract-version-old',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    const tx = makeTx([oldVersionRule, newVersionRule]);
    const reportBoundContract = {
      ...baseContract,
      activeVersionId: 'contract-version-new',
    };

    const result = await computePenaltyItemsV2(
      tx,
      baseInput,
      reportBoundContract,
      [makeViolation()],
    );

    expect(tx.contractPenaltyRule.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        contractId: 'contract-1',
        contractVersionId: 'contract-version-new',
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      penaltyRuleId: 'rule-new-version',
      finalAmount: 250000,
    });
    expect(result.items[0]?.contractVersionSnapshot).toMatchObject({
      contractVersionId: 'contract-version-new',
    });
  });
});
