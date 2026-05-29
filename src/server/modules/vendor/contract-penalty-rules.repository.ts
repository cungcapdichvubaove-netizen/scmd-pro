import { context, trace } from '@opentelemetry/api';
import { AuditService } from '../../core/audit/audit.service.js';
import { loggerContext } from '../../core/logger/index.js';

export type PenaltyPolicyRule = {
  clauseCode?: string;
  violationCode?: string;
  violationName?: string;
  clauseName?: string;
  penaltyAmount?: number | string;
  amount?: number | string;
  penaltyUnit?: string;
  percentValue?: number | string;
  percent?: number | string;
  graceCount?: number | string;
  monthlyCap?: number | string;
  maxMonthlyPenalty?: number | string;
  repeatEscalation?: unknown;
  repeatEscalationThreshold?: number | string;
  repeatEscalationMultiplier?: number | string;
  evidenceRequired?: boolean;
  extractedFromAI?: boolean;
  isActive?: boolean;
  notes?: string;
};

type ContractPenaltyRuleSnapshot = {
  key: string;
  fingerprint: string;
};

function parseJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function parsePenaltyPolicyRules(contract: any): PenaltyPolicyRule[] {
  return parseJsonArray<PenaltyPolicyRule>(contract?.penaltyPolicy?.rules)
    .filter((item) => item && item.violationCode);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizePenaltyUnit(value?: string | null): string {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PER_OCCURRENCE' || normalized === 'CASE' || normalized === 'SHIFT' || normalized === 'DAY' || normalized === 'MONTH') {
    return 'PER_OCCURRENCE';
  }
  if (normalized === 'PER_HOUR' || normalized === 'HOUR') {
    return 'PER_HOUR';
  }
  if (normalized === 'PER_GUARD' || normalized === 'GUARD') {
    return 'PER_GUARD';
  }
  if (normalized === 'PERCENT_CONTRACT' || normalized === 'PERCENT' || normalized === 'PERCENT_OF_CONTRACT') {
    return 'PERCENT_CONTRACT';
  }
  return 'PER_OCCURRENCE';
}

function normalizeRepeatEscalation(rule: PenaltyPolicyRule): Array<{ afterCount: number; multiplier: number }> | null {
  if (Array.isArray(rule.repeatEscalation)) {
    const normalized = rule.repeatEscalation
      .map((item: any) => {
        const afterCount = toFiniteNumber(item?.afterCount);
        const multiplier = toFiniteNumber(item?.multiplier);
        if (!afterCount || !multiplier || afterCount < 1 || multiplier <= 0) {
          return null;
        }
        return {
          afterCount: Math.floor(afterCount),
          multiplier,
        };
      })
      .filter(Boolean) as Array<{ afterCount: number; multiplier: number }>;

    return normalized.length > 0 ? normalized.sort((left, right) => left.afterCount - right.afterCount) : null;
  }

  const threshold = toFiniteNumber(rule.repeatEscalationThreshold);
  const multiplier = toFiniteNumber(rule.repeatEscalationMultiplier);
  if (threshold && multiplier && threshold >= 1 && multiplier > 0) {
    return [{ afterCount: Math.floor(threshold), multiplier }];
  }

  return null;
}

function buildContractPenaltyRuleKey(input: {
  tenantId: string;
  contractId: string;
  contractVersionId: string | null;
  violationCode: string | null | undefined;
  clauseCode: string | null | undefined;
}): string {
  return [
    input.tenantId,
    input.contractId,
    input.contractVersionId ?? '',
    String(input.violationCode || '').trim().toUpperCase(),
    String(input.clauseCode || '').trim(),
  ].join('::');
}

function buildContractPenaltyRuleFingerprint(rule: Record<string, unknown>): string {
  return JSON.stringify({
    ruleName: rule.ruleName ?? null,
    penaltyUnit: rule.penaltyUnit ?? null,
    amount: rule.amount ?? null,
    percentValue: rule.percentValue ?? null,
    graceCount: rule.graceCount ?? null,
    maxMonthlyPenalty: rule.maxMonthlyPenalty ?? null,
    repeatEscalation: rule.repeatEscalation ?? null,
    evidenceRequired: rule.evidenceRequired ?? null,
    isActive: rule.isActive ?? null,
    extractedFromAI: rule.extractedFromAI ?? null,
    sortOrder: rule.sortOrder ?? null,
    metadata: rule.metadata ?? null,
  });
}

async function getContractPenaltyRuleSnapshots(
  tx: any,
  tenantId: string,
  contractId: string,
  contractVersionId: string | null,
): Promise<ContractPenaltyRuleSnapshot[]> {
  const rules = await tx.contractPenaltyRule.findMany({
    where: {
      tenantId,
      contractId,
      contractVersionId,
    },
    select: {
      clauseCode: true,
      violationCode: true,
      ruleName: true,
      penaltyUnit: true,
      amount: true,
      percentValue: true,
      graceCount: true,
      maxMonthlyPenalty: true,
      repeatEscalation: true,
      evidenceRequired: true,
      isActive: true,
      extractedFromAI: true,
      sortOrder: true,
      metadata: true,
    },
  });

  return rules.map((rule: Record<string, unknown>) => ({
    key: buildContractPenaltyRuleKey({
      tenantId,
      contractId,
      contractVersionId,
      violationCode: rule.violationCode as string | null | undefined,
      clauseCode: rule.clauseCode as string | null | undefined,
    }),
    fingerprint: buildContractPenaltyRuleFingerprint(rule),
  }));
}

export async function syncContractPenaltyRules(
  tx: any,
  tenantId: string,
  contractId: string,
  contractVersionId: string | null | undefined,
  penaltyPolicy: unknown,
  actorId: string,
) {
  const rules = parsePenaltyPolicyRules({ penaltyPolicy });
  const normalizedContractVersionId = contractVersionId ?? null;
  const activeKeys = new Set<string>();
  const beforeSnapshots = await getContractPenaltyRuleSnapshots(tx, tenantId, contractId, normalizedContractVersionId);

  for (const [index, rule] of rules.entries()) {
    const violationCode = String(rule.violationCode || '').trim().toUpperCase();
    const clauseCode = String(rule.clauseCode || '').trim() || null;
    const businessKey = buildContractPenaltyRuleKey({
      tenantId,
      contractId,
      contractVersionId: normalizedContractVersionId,
      violationCode,
      clauseCode,
    });

    activeKeys.add(businessKey);

    const payload = {
      ruleName: rule.violationName || rule.clauseName || rule.violationCode || `Penalty Rule ${index + 1}`,
      penaltyUnit: normalizePenaltyUnit(rule.penaltyUnit),
      amount: toFiniteNumber(rule.amount ?? rule.penaltyAmount),
      percentValue: toFiniteNumber(rule.percentValue ?? rule.percent),
      graceCount: Math.max(0, Math.floor(toFiniteNumber(rule.graceCount) ?? 0)),
      maxMonthlyPenalty: toFiniteNumber(rule.maxMonthlyPenalty ?? rule.monthlyCap),
      repeatEscalation: normalizeRepeatEscalation(rule),
      evidenceRequired: Boolean(rule.evidenceRequired),
      isActive: rule.isActive !== false,
      extractedFromAI: Boolean(rule.extractedFromAI),
      sortOrder: index,
      metadata: {
        legacyPenaltyUnit: rule.penaltyUnit || null,
        notes: rule.notes || null,
      },
    };

    const existingRule = await tx.contractPenaltyRule.findFirst({
      where: {
        tenantId,
        contractId,
        contractVersionId: normalizedContractVersionId,
        violationCode,
        clauseCode,
      },
      select: {
        id: true,
      },
    });

    if (existingRule) {
      await tx.contractPenaltyRule.update({
        where: {
          id: existingRule.id,
        },
        data: payload,
      });
      continue;
    }

    await tx.contractPenaltyRule.create({
      data: {
        tenantId,
        contractId,
        contractVersionId: normalizedContractVersionId,
        clauseCode,
        violationCode,
        ...payload,
      },
    });
  }

  const existingRules = await tx.contractPenaltyRule.findMany({
    where: {
      tenantId,
      contractId,
      contractVersionId: normalizedContractVersionId,
    },
    select: {
      id: true,
      violationCode: true,
      clauseCode: true,
    },
  });

  const ruleIdsToDeactivate = existingRules
    .filter((rule: { violationCode: string; clauseCode: string | null }) => {
      const businessKey = buildContractPenaltyRuleKey({
        tenantId,
        contractId,
        contractVersionId: normalizedContractVersionId,
        violationCode: rule.violationCode,
        clauseCode: rule.clauseCode,
      });

      return !activeKeys.has(businessKey);
    })
    .map((rule: { id: string }) => rule.id);

  if (ruleIdsToDeactivate.length > 0) {
    await tx.contractPenaltyRule.updateMany({
      where: {
        tenantId,
        id: { in: ruleIdsToDeactivate },
      },
      data: {
        isActive: false,
      },
    });
  }

  const afterSnapshots = await getContractPenaltyRuleSnapshots(tx, tenantId, contractId, normalizedContractVersionId);
  const beforeMap = new Map(beforeSnapshots.map((item) => [item.key, item.fingerprint] as const));
  const afterMap = new Map(afterSnapshots.map((item) => [item.key, item.fingerprint] as const));
  const addedRuleKeys = [...afterMap.keys()].filter((key) => !beforeMap.has(key)).sort();
  const removedRuleKeys = [...beforeMap.keys()].filter((key) => !afterMap.has(key)).sort();
  const changedRuleKeys = [...afterMap.keys()]
    .filter((key) => beforeMap.has(key) && beforeMap.get(key) !== afterMap.get(key))
    .sort();

  await AuditService.log({
    userId: actorId,
    tenantId,
    action: 'CONTRACT_PENALTY_RULES_SYNCED',
    resource: `contract/${contractId}/penalty-rules`,
    payload: {
      eventName: 'CONTRACT_PENALTY_RULES_SYNCED',
      contractId,
      contractVersionId: normalizedContractVersionId,
      rulesBeforeCount: beforeSnapshots.length,
      rulesAfterCount: afterSnapshots.length,
      addedRuleKeys,
      removedRuleKeys,
      changedRuleKeys,
      actorId,
      traceId: trace.getSpan(context.active())?.spanContext().traceId ?? loggerContext.getStore()?.traceId ?? null,
    },
    status: 'SUCCESS',
  }, tx);
}
