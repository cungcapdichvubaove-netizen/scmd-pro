import { Prisma } from '@prisma/client';

type PenaltyEngineInput = {
  tenantId: string;
  month: string;
  vendorId: string;
  contractId?: string | null;
  siteId?: string | null;
};

type PenaltyComputation = {
  violationEventId: string;
  penaltyRuleId: string | null;
  vendorId: string;
  contractId: string | null;
  siteId: string | null;
  type: string;
  status: string;
  baseAmount: number;
  unit: string;
  quantity: number;
  graceApplied: boolean;
  capApplied: boolean;
  finalAmount: number;
  reason: string;
  calculationDetail: Record<string, unknown>;
  contractVersionSnapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};

type RuleComputationSummary = {
  ruleId: string;
  ruleName: string;
  violationCode: string;
  penaltyUnit: string;
  graceCount: number;
  maxMonthlyPenalty: number | null;
  evaluatedViolations: number;
  totalAmount: number;
};

type PenaltyEngineResult = {
  items: PenaltyComputation[];
  summary: {
    engineVersion: string;
    rulesEvaluated: RuleComputationSummary[];
    unmatchedViolationIds: string[];
  };
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (value instanceof Prisma.Decimal) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeViolationCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function normalizePenaltyUnit(value: unknown): string {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PER_HOUR') return 'PER_HOUR';
  if (normalized === 'PER_GUARD') return 'PER_GUARD';
  if (normalized === 'PERCENT_CONTRACT') return 'PERCENT_CONTRACT';
  return 'PER_OCCURRENCE';
}

function getDurationHours(metadata: Record<string, unknown>): number {
  const directHours = [
    metadata.durationHours,
    metadata.hours,
    metadata.lateHours,
    metadata.uncoveredHours,
    metadata.missingHours,
  ].map((value) => toFiniteNumber(value, 0)).find((value) => value > 0);
  if (directHours) {
    return directHours;
  }

  const minuteBased = [
    metadata.durationMinutes,
    metadata.lateMinutes,
    metadata.uncoveredMinutes,
    metadata.missingMinutes,
  ].map((value) => toFiniteNumber(value, 0)).find((value) => value > 0);
  if (minuteBased) {
    return minuteBased / 60;
  }

  return 1;
}

function getGuardQuantity(metadata: Record<string, unknown>): number {
  const quantity = [
    metadata.missingCount,
    metadata.guardCount,
    metadata.affectedGuardCount,
    metadata.understaffedCount,
    metadata.requiredReplacementCount,
  ].map((value) => toFiniteNumber(value, 0)).find((value) => value > 0);

  return quantity || 1;
}

function getQuantityForUnit(unit: string, contract: any, violation: any): {
  quantity: number;
  baseAmount: number;
  percentValue: number | null;
} {
  const metadata = toPlainObject(violation?.metadata);

  if (unit === 'PER_HOUR') {
    return {
      quantity: Math.max(1, Number(getDurationHours(metadata).toFixed(2))),
      baseAmount: 0,
      percentValue: null,
    };
  }

  if (unit === 'PER_GUARD') {
    return {
      quantity: Math.max(1, getGuardQuantity(metadata)),
      baseAmount: 0,
      percentValue: null,
    };
  }

  if (unit === 'PERCENT_CONTRACT') {
    return {
      quantity: 0,
      baseAmount: toFiniteNumber(contract?.value, 0),
      percentValue: null,
    };
  }

  return {
    quantity: 1,
    baseAmount: 0,
    percentValue: null,
  };
}

function getEscalationMultiplier(repeatEscalation: unknown, occurrenceIndex: number): {
  multiplier: number;
  appliedRule: Record<string, unknown> | null;
} {
  if (!Array.isArray(repeatEscalation)) {
    return { multiplier: 1, appliedRule: null };
  }

  const candidates = repeatEscalation
    .map((item: any) => ({
      afterCount: Math.max(0, Math.floor(toFiniteNumber(item?.afterCount, 0))),
      multiplier: toFiniteNumber(item?.multiplier, 1),
    }))
    .filter((item) => item.afterCount >= 1 && item.multiplier > 0)
    .sort((left, right) => left.afterCount - right.afterCount);

  let applied: { afterCount: number; multiplier: number } | null = null;
  for (const candidate of candidates) {
    if (occurrenceIndex > candidate.afterCount) {
      applied = candidate;
    }
  }

  return applied
    ? { multiplier: applied.multiplier, appliedRule: applied }
    : { multiplier: 1, appliedRule: null };
}

function buildContractVersionSnapshot(contract: any): Record<string, unknown> | null {
  if (!contract) {
    return null;
  }

  return {
    contractId: contract.id,
    contractVersionId: contract.activeVersionId ?? null,
    contractCode: contract.contractCode ?? null,
    contractName: contract.contractName ?? null,
    contractStatus: contract.status ?? null,
    startDate: contract.startDate?.toISOString?.() ?? null,
    endDate: contract.endDate?.toISOString?.() ?? null,
    value: toFiniteNumber(contract.value, 0),
    currency: contract.currency ?? 'VND',
    penaltyPolicySnapshot: contract.penaltyPolicy && typeof contract.penaltyPolicy === 'object'
      ? JSON.parse(JSON.stringify(contract.penaltyPolicy))
      : null,
  };
}

export async function computePenaltyItemsV2(
  tx: any,
  input: PenaltyEngineInput,
  contract: any,
  penalizedViolations: any[],
): Promise<PenaltyEngineResult> {
  const effectiveContractId = input.contractId ?? contract?.id ?? null;
  if (!effectiveContractId || penalizedViolations.length === 0) {
    return {
      items: [],
      summary: {
        engineVersion: 'penalty-engine-v2',
        rulesEvaluated: [],
        unmatchedViolationIds: penalizedViolations.map((item: any) => item.id),
      },
    };
  }

  const effectiveContractVersionId = contract?.activeVersionId ?? null;

  const rules = await tx.contractPenaltyRule.findMany({
    where: {
      tenantId: input.tenantId,
      contractId: effectiveContractId,
      contractVersionId: effectiveContractVersionId,
      isActive: true,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  const rulesByViolationCode = new Map<string, any>();
  for (const rule of rules) {
    const key = normalizeViolationCode(rule.violationCode);
    if (!key) {
      continue;
    }

    const existingRule = rulesByViolationCode.get(key);
    if (!existingRule) {
      rulesByViolationCode.set(key, rule);
      continue;
    }

    const existingVersionMatch = existingRule.contractVersionId === effectiveContractVersionId;
    const currentVersionMatch = rule.contractVersionId === effectiveContractVersionId;

    if (!existingVersionMatch && currentVersionMatch) {
      rulesByViolationCode.set(key, rule);
    }
  }

  const contractVersionSnapshot = buildContractVersionSnapshot(contract);
  const monthAccumulatedByRuleId = new Map<string, number>();
  const occurrenceByRuleId = new Map<string, number>();
  const ruleSummaries = new Map<string, RuleComputationSummary>();
  const unmatchedViolationIds: string[] = [];
  const items: PenaltyComputation[] = [];

  for (const violation of penalizedViolations) {
    const violationCode = normalizeViolationCode(violation.violationType);
    const matchedRule = rulesByViolationCode.get(violationCode);

    if (!matchedRule) {
      unmatchedViolationIds.push(violation.id);
      continue;
    }

    const ruleId = matchedRule.id as string;
    const unit = normalizePenaltyUnit(matchedRule.penaltyUnit);
    const occurrenceIndex = (occurrenceByRuleId.get(ruleId) ?? 0) + 1;
    occurrenceByRuleId.set(ruleId, occurrenceIndex);

    const amount = toFiniteNumber(matchedRule.amount, 0);
    const percentValue = toFiniteNumber(matchedRule.percentValue, 0);
    const maxMonthlyPenalty = matchedRule.maxMonthlyPenalty ? toFiniteNumber(matchedRule.maxMonthlyPenalty, 0) : null;
    const graceCount = Math.max(0, Math.floor(toFiniteNumber(matchedRule.graceCount, 0)));
    const quantityInfo = getQuantityForUnit(unit, contract, violation);
    const quantity = unit === 'PERCENT_CONTRACT'
      ? percentValue
      : quantityInfo.quantity;
    const baseAmount = unit === 'PERCENT_CONTRACT'
      ? quantityInfo.baseAmount
      : amount;

    let computedAmount = unit === 'PERCENT_CONTRACT'
      ? (baseAmount * quantity) / 100
      : baseAmount * quantity;

    const escalation = getEscalationMultiplier(matchedRule.repeatEscalation, occurrenceIndex);
    computedAmount = computedAmount * escalation.multiplier;

    const graceApplied = graceCount > 0 && occurrenceIndex <= graceCount;
    if (graceApplied) {
      computedAmount = 0;
    }

    let capApplied = false;
    const accumulatedBefore = monthAccumulatedByRuleId.get(ruleId) ?? 0;
    let finalAmount = computedAmount;
    if (maxMonthlyPenalty !== null) {
      const remaining = Math.max(0, maxMonthlyPenalty - accumulatedBefore);
      if (finalAmount > remaining) {
        finalAmount = remaining;
        capApplied = true;
      }
    }

    finalAmount = Number(finalAmount.toFixed(2));
    monthAccumulatedByRuleId.set(ruleId, accumulatedBefore + finalAmount);

    const detail = {
      engineVersion: 'penalty-engine-v2',
      month: input.month,
      violationCode,
      ruleName: matchedRule.ruleName,
      clauseCode: matchedRule.clauseCode ?? null,
      unit,
      occurrenceIndex,
      baseAmount,
      quantity,
      percentValue: unit === 'PERCENT_CONTRACT' ? percentValue : null,
      escalationMultiplier: escalation.multiplier,
      escalationRule: escalation.appliedRule,
      graceCount,
      graceApplied,
      maxMonthlyPenalty,
      capApplied,
      accumulatedBefore,
      accumulatedAfter: monthAccumulatedByRuleId.get(ruleId) ?? finalAmount,
      violationMetadata: toPlainObject(violation.metadata),
    };

    items.push({
      violationEventId: violation.id,
      penaltyRuleId: ruleId,
      vendorId: violation.vendorId ?? input.vendorId,
      contractId: violation.contractId ?? effectiveContractId,
      siteId: violation.siteId ?? input.siteId ?? null,
      type: violation.violationType,
      status: 'SUGGESTED',
      baseAmount,
      unit,
      quantity,
      graceApplied,
      capApplied,
      finalAmount,
      reason: `Penalty rule ${matchedRule.ruleName} applied to ${violation.violationType}`,
      calculationDetail: detail,
      contractVersionSnapshot,
      metadata: {
        sourceType: violation.sourceType,
        severity: violation.severity,
        occurredAt: violation.occurredAt?.toISOString?.() ?? null,
        clauseCode: matchedRule.clauseCode ?? null,
      },
    });

    const previousSummary = ruleSummaries.get(ruleId);
    if (previousSummary) {
      previousSummary.evaluatedViolations += 1;
      previousSummary.totalAmount = Number((previousSummary.totalAmount + finalAmount).toFixed(2));
    } else {
      ruleSummaries.set(ruleId, {
        ruleId,
        ruleName: matchedRule.ruleName,
        violationCode,
        penaltyUnit: unit,
        graceCount,
        maxMonthlyPenalty,
        evaluatedViolations: 1,
        totalAmount: finalAmount,
      });
    }
  }

  return {
    items,
    summary: {
      engineVersion: 'penalty-engine-v2',
      rulesEvaluated: [...ruleSummaries.values()],
      unmatchedViolationIds,
    },
  };
}
