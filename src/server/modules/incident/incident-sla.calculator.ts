import { IncidentSeverity } from '@prisma/client';

export interface IncidentSlaInput {
  tenantId: string;
  contractId?: string | null;
  siteId?: string | null;
  severity: IncidentSeverity;
  incidentType: string;
  reportedAt: Date;
}

export interface IncidentSlaDecision {
  responseDueMinutes: number;
  resolutionDueMinutes: number;
  escalationAfterMinutes: number;
  responseDueAt: Date;
  resolutionDueAt: Date;
  requiredEvidenceTypes: string[];
  penaltyPolicy?: Record<string, unknown> | null;
  ruleId?: string | null;
}

const DEFAULT_RESPONSE_MINUTES: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 60,
  [IncidentSeverity.MEDIUM]: 30,
  [IncidentSeverity.HIGH]: 15,
  [IncidentSeverity.CRITICAL]: 5,
};

const DEFAULT_RESOLUTION_MINUTES: Record<IncidentSeverity, number> = {
  [IncidentSeverity.LOW]: 240,
  [IncidentSeverity.MEDIUM]: 120,
  [IncidentSeverity.HIGH]: 60,
  [IncidentSeverity.CRITICAL]: 30,
};

export class IncidentSlaCalculator {
  static fallback(input: IncidentSlaInput): IncidentSlaDecision {
    const responseDueMinutes = DEFAULT_RESPONSE_MINUTES[input.severity] ?? DEFAULT_RESPONSE_MINUTES.LOW;
    const resolutionDueMinutes = DEFAULT_RESOLUTION_MINUTES[input.severity] ?? DEFAULT_RESOLUTION_MINUTES.LOW;
    return {
      responseDueMinutes,
      resolutionDueMinutes,
      escalationAfterMinutes: responseDueMinutes,
      responseDueAt: new Date(input.reportedAt.getTime() + responseDueMinutes * 60_000),
      resolutionDueAt: new Date(input.reportedAt.getTime() + resolutionDueMinutes * 60_000),
      requiredEvidenceTypes: [],
      penaltyPolicy: null,
      ruleId: null,
    };
  }

  static async resolve(tx: any, input: IncidentSlaInput): Promise<IncidentSlaDecision> {
    const scopeFilters: any[] = [{ contractId: null, siteId: null }];
    if (input.contractId && input.siteId) scopeFilters.push({ contractId: input.contractId, siteId: input.siteId });
    if (input.contractId) scopeFilters.push({ contractId: input.contractId, siteId: null });
    if (input.siteId) scopeFilters.push({ contractId: null, siteId: input.siteId });

    const candidates = await tx.incidentSlaRule.findMany({
      where: {
        tenantId: input.tenantId,
        status: 'ACTIVE',
        severity: input.severity,
        incidentType: { in: [input.incidentType, 'OTHER', '*'] },
        OR: scopeFilters,
      },
      orderBy: [{ contractId: 'desc' }, { siteId: 'desc' }, { incidentType: 'asc' }],
      take: 10,
    });

    const exact = candidates.find((rule: any) => rule.contractId === input.contractId && rule.siteId === input.siteId && rule.incidentType === input.incidentType)
      ?? candidates.find((rule: any) => rule.contractId === input.contractId && rule.incidentType === input.incidentType)
      ?? candidates.find((rule: any) => rule.siteId === input.siteId && rule.incidentType === input.incidentType)
      ?? candidates.find((rule: any) => rule.incidentType === input.incidentType)
      ?? candidates[0];

    if (!exact) return this.fallback(input);

    const responseDueMinutes = Math.max(1, exact.responseDueMinutes);
    const resolutionDueMinutes = Math.max(responseDueMinutes, exact.resolutionDueMinutes);
    const escalationAfterMinutes = Math.max(1, exact.escalationAfterMinutes ?? responseDueMinutes);

    return {
      responseDueMinutes,
      resolutionDueMinutes,
      escalationAfterMinutes,
      responseDueAt: new Date(input.reportedAt.getTime() + responseDueMinutes * 60_000),
      resolutionDueAt: new Date(input.reportedAt.getTime() + resolutionDueMinutes * 60_000),
      requiredEvidenceTypes: exact.requiredEvidenceTypes ?? [],
      penaltyPolicy: exact.penaltyPolicy as Record<string, unknown> | null,
      ruleId: exact.id,
    };
  }
}
