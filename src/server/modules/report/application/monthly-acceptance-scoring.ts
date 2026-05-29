type AuditStatus = 'OK' | 'ZERO' | 'PENDING_VERIFICATION';

type MetricInput = {
  earned: number;
  possible: number;
  missingData?: boolean;
  zeroWhenMissing?: boolean;
};

export type ScorecardGroupKey =
  | 'staffing'
  | 'patrol'
  | 'incidentSla'
  | 'evidence'
  | 'manualInspection';

export type ScorecardCriterion = {
  code: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  maxWeightedScore: number;
  status: AuditStatus;
  formula: string;
  source: Record<string, unknown>;
  reason: string;
};

export type ScorecardGroupBreakdown = {
  key: ScorecardGroupKey;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  maxWeightedScore: number;
  status: AuditStatus;
  formula: string;
  reason: string;
  source: Record<string, unknown>;
  criteria: ScorecardCriterion[];
};

export type ScorecardComputationInput = {
  totalShiftRequired: number;
  totalShiftActualQualified: number;
  totalShiftMissingCount: number;
  totalShiftLateCount: number;
  totalShiftWrongPositionCount: number;
  patrolSessionsCount: number;
  patrolAverageScore: number;
  incidentsCount: number;
  compliantIncidentsCount: number;
  evidenceRequiredCount: number;
  evidenceCompleteCount: number;
  manualInspectionScore?: number | null;
  manualInspectionMaxScore?: number | null;
};

export type ScorecardComputationResult = {
  totalScore: number;
  formulaVersion: string;
  groups: ScorecardGroupBreakdown[];
  status: AuditStatus;
  needsVerification: boolean;
  rates: {
    shiftCoverageRate: number;
    patrolComplianceRate: number;
    incidentSlaRate: number;
    evidenceCompletenessRate: number;
    manualAuditRate: number;
  };
};

function round2(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeMetric(input: MetricInput): { rawScore: number; status: AuditStatus; reason: string } {
  if (input.missingData) {
    if (input.zeroWhenMissing) {
      return { rawScore: 0, status: 'ZERO', reason: 'Thiếu dữ liệu nguồn, áp dụng 0 theo quy định.' };
    }
    return { rawScore: 0, status: 'PENDING_VERIFICATION', reason: 'Thiếu dữ liệu nguồn, cần xác minh trước khi kết luận.' };
  }

  if (input.possible <= 0) {
    return { rawScore: 0, status: 'PENDING_VERIFICATION', reason: 'Không có mẫu số hợp lệ để chấm điểm.' };
  }

  return {
    rawScore: round2(clampRatio(input.earned / input.possible) * 100),
    status: input.earned <= 0 ? 'ZERO' : 'OK',
    reason: 'Điểm được tính từ dữ liệu nguồn hợp lệ.',
  };
}

function makeCriterion(input: {
  code: string;
  label: string;
  weight: number;
  metric: MetricInput;
  formula: string;
  source: Record<string, unknown>;
}): ScorecardCriterion {
  const metric = safeMetric(input.metric);
  const maxWeightedScore = round2(input.weight * 100);
  return {
    code: input.code,
    label: input.label,
    weight: input.weight,
    rawScore: metric.rawScore,
    weightedScore: round2(metric.rawScore * input.weight),
    maxWeightedScore,
    status: metric.status,
    formula: input.formula,
    source: input.source,
    reason: metric.reason,
  };
}

function summarizeGroup(input: {
  key: ScorecardGroupKey;
  label: string;
  weight: number;
  criteria: ScorecardCriterion[];
  source: Record<string, unknown>;
}): ScorecardGroupBreakdown {
  const weightedScore = round2(input.criteria.reduce((sum, item) => sum + item.weightedScore, 0));
  const maxWeightedScore = round2(input.weight * 100);
  const rawScore = input.weight > 0 ? round2(weightedScore / input.weight) : 0;
  const hasPending = input.criteria.some((item) => item.status === 'PENDING_VERIFICATION');
  const hasAnyPositive = input.criteria.some((item) => item.rawScore > 0);

  return {
    key: input.key,
    label: input.label,
    weight: input.weight,
    rawScore,
    weightedScore,
    maxWeightedScore,
    status: hasPending ? 'PENDING_VERIFICATION' : (hasAnyPositive ? 'OK' : 'ZERO'),
    formula: `${input.label} = tổng điểm trọng số của các tiêu chí con`,
    reason: hasPending
      ? 'Nhóm có tiêu chí thiếu dữ liệu, cần xác minh trước khi chốt.'
      : 'Nhóm được tổng hợp trực tiếp từ các tiêu chí con.',
    source: input.source,
    criteria: input.criteria,
  };
}

export function computeMonthlyAcceptanceScorecard(input: ScorecardComputationInput): ScorecardComputationResult {
  const staffingPresence = makeCriterion({
    code: 'STAFFING_PRESENCE',
    label: 'Đủ quân theo yêu cầu',
    weight: 0.2,
    metric: {
      earned: input.totalShiftActualQualified,
      possible: input.totalShiftRequired,
      missingData: input.totalShiftRequired <= 0,
    },
    formula: 'actualQualified / required * 100',
    source: {
      totalShiftActualQualified: input.totalShiftActualQualified,
      totalShiftRequired: input.totalShiftRequired,
      totalShiftMissingCount: input.totalShiftMissingCount,
    },
  });

  const staffingPunctuality = makeCriterion({
    code: 'STAFFING_PUNCTUALITY',
    label: 'Đúng ca, đúng chốt',
    weight: 0.1,
    metric: {
      earned: Math.max(0, input.totalShiftRequired - input.totalShiftLateCount - input.totalShiftWrongPositionCount),
      possible: input.totalShiftRequired,
      missingData: input.totalShiftRequired <= 0,
    },
    formula: '(required - lateCount - wrongPositionCount) / required * 100',
    source: {
      totalShiftRequired: input.totalShiftRequired,
      totalShiftLateCount: input.totalShiftLateCount,
      totalShiftWrongPositionCount: input.totalShiftWrongPositionCount,
    },
  });

  const patrolCompliance = makeCriterion({
    code: 'PATROL_ROUTE_CHECKLIST',
    label: 'Tuần tra đúng tuyến và checklist',
    weight: 0.3,
    metric: {
      earned: input.patrolAverageScore,
      possible: 100,
      missingData: input.patrolSessionsCount <= 0,
    },
    formula: 'avg(patrol compliance score)',
    source: {
      patrolSessionsCount: input.patrolSessionsCount,
      patrolAverageScore: input.patrolAverageScore,
    },
  });

  const incidentSla = makeCriterion({
    code: 'INCIDENT_SLA',
    label: 'Xử lý sự cố đúng SLA',
    weight: 0.25,
    metric: {
      earned: input.compliantIncidentsCount,
      possible: input.incidentsCount,
      missingData: input.incidentsCount <= 0,
    },
    formula: 'compliantIncidents / incidents * 100',
    source: {
      incidentsCount: input.incidentsCount,
      compliantIncidentsCount: input.compliantIncidentsCount,
    },
  });

  const evidence = makeCriterion({
    code: 'EVIDENCE_COMPLETENESS',
    label: 'Bằng chứng đầy đủ',
    weight: 0.1,
    metric: {
      earned: input.evidenceCompleteCount,
      possible: input.evidenceRequiredCount,
      missingData: input.evidenceRequiredCount <= 0,
    },
    formula: 'completeEvidence / requiredEvidence * 100',
    source: {
      evidenceRequiredCount: input.evidenceRequiredCount,
      evidenceCompleteCount: input.evidenceCompleteCount,
    },
  });

  const manualInspection = makeCriterion({
    code: 'MANUAL_INSPECTION',
    label: 'Kiểm tra đột xuất / đánh giá thủ công',
    weight: 0.05,
    metric: {
      earned: Number(input.manualInspectionScore ?? 0),
      possible: Number(input.manualInspectionMaxScore ?? 0),
      missingData: input.manualInspectionScore == null || input.manualInspectionMaxScore == null,
    },
    formula: 'manualInspectionScore / manualInspectionMaxScore * 100',
    source: {
      manualInspectionScore: input.manualInspectionScore ?? null,
      manualInspectionMaxScore: input.manualInspectionMaxScore ?? null,
    },
  });

  const groups: ScorecardGroupBreakdown[] = [
    summarizeGroup({
      key: 'staffing',
      label: 'Nhóm 1 - Đủ quân, đúng ca, đúng chốt',
      weight: 0.3,
      criteria: [staffingPresence, staffingPunctuality],
      source: {
        totalShiftRequired: input.totalShiftRequired,
        totalShiftActualQualified: input.totalShiftActualQualified,
        totalShiftMissingCount: input.totalShiftMissingCount,
        totalShiftLateCount: input.totalShiftLateCount,
        totalShiftWrongPositionCount: input.totalShiftWrongPositionCount,
      },
    }),
    summarizeGroup({
      key: 'patrol',
      label: 'Nhóm 2 - Tuần tra đúng tuyến và checklist',
      weight: 0.3,
      criteria: [patrolCompliance],
      source: {
        patrolSessionsCount: input.patrolSessionsCount,
        patrolAverageScore: input.patrolAverageScore,
      },
    }),
    summarizeGroup({
      key: 'incidentSla',
      label: 'Nhóm 3 - Xử lý sự cố đúng SLA',
      weight: 0.25,
      criteria: [incidentSla],
      source: {
        incidentsCount: input.incidentsCount,
        compliantIncidentsCount: input.compliantIncidentsCount,
      },
    }),
    summarizeGroup({
      key: 'evidence',
      label: 'Nhóm 4 - Bằng chứng đầy đủ',
      weight: 0.1,
      criteria: [evidence],
      source: {
        evidenceRequiredCount: input.evidenceRequiredCount,
        evidenceCompleteCount: input.evidenceCompleteCount,
      },
    }),
    summarizeGroup({
      key: 'manualInspection',
      label: 'Nhóm 5 - Kiểm tra đột xuất / đánh giá thủ công',
      weight: 0.05,
      criteria: [manualInspection],
      source: {
        manualInspectionScore: input.manualInspectionScore ?? null,
        manualInspectionMaxScore: input.manualInspectionMaxScore ?? null,
      },
    }),
  ];

  const totalScore = round2(groups.reduce((sum, item) => sum + item.weightedScore, 0));
  const needsVerification = groups.some((item) => item.status === 'PENDING_VERIFICATION');
  const getGroupRawScore = (key: ScorecardGroupKey) => groups.find((item) => item.key === key)?.rawScore ?? 0;

  return {
    totalScore,
    formulaVersion: 'monthly-acceptance-scorecard-v2.5-groups',
    groups,
    status: needsVerification ? 'PENDING_VERIFICATION' : 'OK',
    needsVerification,
    rates: {
      shiftCoverageRate: getGroupRawScore('staffing'),
      patrolComplianceRate: getGroupRawScore('patrol'),
      incidentSlaRate: getGroupRawScore('incidentSla'),
      evidenceCompletenessRate: getGroupRawScore('evidence'),
      manualAuditRate: getGroupRawScore('manualInspection'),
    },
  };
}

export type FinancialPenaltyLine = {
  penaltyId: string;
  violationEventId: string | null;
  type: string;
  status: string;
  amount: number;
  finalAmount?: number | null;
  reason?: string | null;
  calculationDetail?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type MonthlyFinancialSummaryInput = {
  contractValue: number;
  penalties: FinancialPenaltyLine[];
};

export type MonthlyFinancialSummary = {
  contractValue: number;
  totalPenaltyProposed: number;
  totalWaived: number;
  totalDisputed: number;
  totalEffectivePenalty: number;
  totalProposedAcceptance: number;
  lines: Array<FinancialPenaltyLine & {
    originalAmount: number;
    waivedAmount: number;
    effectiveAmount: number;
    disputeAmount: number;
    evidenceLinks: string[];
  }>;
};

function extractEvidenceLinks(metadata?: Record<string, unknown> | null): string[] {
  if (!metadata || !Array.isArray(metadata.evidenceLinks)) return [];
  return metadata.evidenceLinks.filter((item): item is string => typeof item === 'string');
}

export function computeMonthlyFinancialSummary(input: MonthlyFinancialSummaryInput): MonthlyFinancialSummary {
  const lines = input.penalties.map((item) => {
    const originalAmount = Number(item.finalAmount ?? item.amount ?? 0);
    const normalizedStatus = String(item.status || '').toUpperCase();
    const disputeAmount = normalizedStatus === 'DISPUTED' ? originalAmount : 0;
    const waivedAmount = normalizedStatus === 'WAIVED'
      ? originalAmount
      : Math.max(0, originalAmount - Number(item.amount ?? originalAmount));
    const effectiveAmount = normalizedStatus === 'WAIVED'
      ? 0
      : normalizedStatus === 'DISPUTED'
        ? 0
        : Number(item.amount ?? originalAmount);

    return {
      ...item,
      originalAmount,
      waivedAmount,
      effectiveAmount,
      disputeAmount,
      evidenceLinks: extractEvidenceLinks(item.metadata),
    };
  });

  const totalPenaltyProposed = Number(lines.reduce((sum, item) => sum + item.originalAmount, 0).toFixed(2));
  const totalWaived = Number(lines.reduce((sum, item) => sum + item.waivedAmount, 0).toFixed(2));
  const totalDisputed = Number(lines.reduce((sum, item) => sum + item.disputeAmount, 0).toFixed(2));
  const totalEffectivePenalty = Number(lines.reduce((sum, item) => sum + item.effectiveAmount, 0).toFixed(2));
  const totalProposedAcceptance = Number(Math.max(0, input.contractValue - totalEffectivePenalty).toFixed(2));

  return {
    contractValue: Number(input.contractValue.toFixed(2)),
    totalPenaltyProposed,
    totalWaived,
    totalDisputed,
    totalEffectivePenalty,
    totalProposedAcceptance,
    lines,
  };
}
