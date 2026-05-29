import { Decimal } from '@prisma/client/runtime/library';

export type PenaltyCalculationInput = {
  violationId: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
};

type TenantScopedClient = {
  violationEvent: {
    findUnique(args: any): Promise<any>;
    count(args: any): Promise<number>;
  };
  contractPenaltyRule: {
    findFirst(args: any): Promise<any>;
  };
};

type TenantDatabase = {
  forTenant(tenantId: string): TenantScopedClient;
};

export class CalculatePenaltyUseCase {
  constructor(private readonly db: TenantDatabase) {}

  async execute(input: PenaltyCalculationInput) {
    const { violationId, tenantId, periodStart, periodEnd } = input;

    const tenantDb = this.db.forTenant(tenantId);
    const violation = await tenantDb.violationEvent.findUnique({
      where: { id: violationId },
      include: { contract: { include: { activeVersion: true } } },
    });

    if (!violation || !violation.contractId) {
      throw new Error('VIOLATION_NOT_FOUND');
    }

    const rule = await tenantDb.contractPenaltyRule.findFirst({
      where: {
        contractId: violation.contractId,
        violationCode: violation.violationCode,
        isActive: true,
      },
    });

    if (!rule) {
      return null;
    }

    const historyCount = await tenantDb.violationEvent.count({
      where: {
        contractId: violation.contractId,
        violationCode: violation.violationCode,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: { in: ['PENALIZED', 'CONFIRMED', 'CLOSED'] },
      },
    });

    if (historyCount <= rule.graceCount) {
      return { finalAmount: 0, reason: 'GRACE_PERIOD_APPLIED' };
    }

    let baseAmount = new Decimal(rule.amount || 0);
    if (rule.penaltyUnit === 'PERCENT_CONTRACT') {
      const contractTotal = violation.contract?.totalAmount || 0;
      baseAmount = new Decimal(contractTotal).mul(new Decimal(rule.percentValue || 0).div(100));
    }

    const effectiveRepeats = historyCount - rule.graceCount - 1;
    let escalatedAmount = baseAmount;
    if (effectiveRepeats > 0 && rule.repeatEscalation > 0) {
      escalatedAmount = baseAmount.mul(1 + (effectiveRepeats * rule.repeatEscalation));
    }

    let finalAmount = escalatedAmount;
    let capApplied = false;
    if (rule.maxMonthlyPenalty && finalAmount.gt(rule.maxMonthlyPenalty)) {
      finalAmount = new Decimal(rule.maxMonthlyPenalty);
      capApplied = true;
    }

    return {
      violationId,
      penaltyRuleId: rule.id,
      baseAmount: baseAmount.toNumber(),
      finalAmount: finalAmount.toNumber(),
      unit: rule.penaltyUnit,
      quantity: 1,
      graceApplied: rule.graceCount > 0,
      capApplied,
      calculationDetail: `Base: ${baseAmount}, Repeats: ${effectiveRepeats}, Cap: ${rule.maxMonthlyPenalty}`,
    };
  }
}
