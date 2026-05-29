import { createHash } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { db } from '../../../../core/db/prisma.js';
import {
  VIOLATION_EVENT_DISPUTED_STATUSES,
  VIOLATION_EVENT_PENALTY_STATUSES,
  VIOLATION_EVENT_REVIEWABLE_STATUSES,
  VIOLATION_EVENT_SCORED_STATUSES,
  VIOLATION_EVENT_WAIVED_STATUSES,
  normalizeViolationEventStatus,
} from '../../../../shared/business/violation-lifecycle.js';
import { computePenaltyItemsV2 } from '../penalty-engine-v2.js';
import {
  computeMonthlyAcceptanceScorecard,
  computeMonthlyFinancialSummary,
} from '../monthly-acceptance-scoring.js';
import {
  type ReportScopeInput,
  type SnapshotBundle,
  monthlyComplianceInputSchema,
} from './contracts.js';
import { buildScopeWhere, getMonthRange, getReportCutoff, roundScore, stableSerialize, toDecimalAmount, toPlainJson } from './utils.js';

const scoredViolationStatuses: Set<string> = new Set(VIOLATION_EVENT_SCORED_STATUSES);
const reviewableViolationStatuses: Set<string> = new Set(VIOLATION_EVENT_REVIEWABLE_STATUSES);
const penalizedViolationStatuses: Set<string> = new Set(VIOLATION_EVENT_PENALTY_STATUSES);
const disputedViolationStatuses: Set<string> = new Set(VIOLATION_EVENT_DISPUTED_STATUSES);
const waivedViolationStatuses: Set<string> = new Set(VIOLATION_EVENT_WAIVED_STATUSES);

async function findScopedScorecard(tx: any, input: ReportScopeInput) {
  return tx.vendorScorecard.findFirst({
    where: {
      tenantId: input.tenantId,
      month: input.month,
      vendorId: input.vendorId,
      contractId: input.contractId ?? null,
      siteId: input.siteId ?? null,
    },
  });
}

async function findLatestScopedReport(tx: any, input: ReportScopeInput) {
  return tx.monthlyAcceptanceReport.findFirst({
    where: {
      tenantId: input.tenantId,
      month: input.month,
      vendorId: input.vendorId,
      contractId: input.contractId ?? null,
      siteId: input.siteId ?? null,
      supersededAt: null,
    },
    orderBy: [
      { revisionNumber: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

async function resolveContractVersionForReport(
  tx: any,
  input: ReportScopeInput,
  contract: any,
  periodStart: Date,
  periodEndExclusive: Date,
) {
  if (!contract) {
    return null;
  }

  if (!tx.contractVersion?.findFirst) {
    return contract.activeVersion ?? null;
  }

  const include = {
    lineItems: {
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    },
  };

  const effectiveVersion = await tx.contractVersion.findFirst({
    where: {
      tenantId: input.tenantId,
      contractId: contract.id,
      effectiveFrom: { lt: periodEndExclusive },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: periodStart } },
      ],
    },
    include,
    orderBy: [
      { effectiveFrom: 'desc' },
      { versionNumber: 'desc' },
    ],
  });

  if (effectiveVersion) {
    return effectiveVersion;
  }

  if (contract.activeVersionId) {
    const activeVersion = await tx.contractVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        contractId: contract.id,
        id: contract.activeVersionId,
      },
      include,
      orderBy: [
        { effectiveFrom: 'desc' },
        { versionNumber: 'desc' },
      ],
    });

    return activeVersion ?? contract.activeVersion ?? null;
  }

  return contract.activeVersion ?? null;
}

function bindContractToReportVersion(contract: any, resolvedContractVersion: any) {
  if (!contract || !resolvedContractVersion) {
    return contract;
  }

  return {
    ...contract,
    activeVersionId: resolvedContractVersion.id,
    activeVersion: resolvedContractVersion,
    value: resolvedContractVersion.totalContractValue ?? contract.value,
    currency: resolvedContractVersion.currency ?? contract.currency,
    guardCountPerShift: resolvedContractVersion.guardCountPerShift ?? contract.guardCountPerShift,
    acceptancePolicy: resolvedContractVersion.acceptancePolicy ?? contract.acceptancePolicy,
    evidencePolicy: resolvedContractVersion.evidencePolicy ?? contract.evidencePolicy,
    penaltyPolicy: resolvedContractVersion.penaltyPolicy ?? contract.penaltyPolicy,
    slaConfig: resolvedContractVersion.slaConfig ?? contract.slaConfig,
  };
}

async function buildSnapshotBundle(
  tx: any,
  input: ReportScopeInput,
  vendor: any,
  contract: any,
  resolvedContractVersion: any,
  reportCutoff: ReturnType<typeof getReportCutoff>,
  patrolSessions: any[],
  incidents: any[],
  violations: any[],
  shiftSchedules: any[],
  shiftComplianceItems: any[],
): Promise<SnapshotBundle> {
  const scoredViolations = violations.filter((item: any) => scoredViolationStatuses.has(normalizeViolationEventStatus(item.status)));
  const pendingViolations = violations.filter((item: any) => reviewableViolationStatuses.has(normalizeViolationEventStatus(item.status)));
  const penalizedViolations = violations.filter((item: any) => penalizedViolationStatuses.has(normalizeViolationEventStatus(item.status)));
  const disputedViolations = violations.filter((item: any) => disputedViolationStatuses.has(normalizeViolationEventStatus(item.status)));
  const waivedViolations = violations.filter((item: any) => waivedViolationStatuses.has(normalizeViolationEventStatus(item.status)));

  const patrolScores = patrolSessions
    .filter((item: any) => ['COMPLETED', 'PARTIAL', 'MISSED', 'INVALID'].includes(item.status))
    .map((item: any) => Number(item.complianceScore ?? 0));

  const patrolRate = patrolScores.length > 0
    ? roundScore(patrolScores.reduce((sum: number, value: number) => sum + value, 0) / patrolScores.length)
    : 0;

  const compliantIncidents = incidents.filter((item: any) => item.slaBreached !== true).length;
  const incidentRate = incidents.length > 0
    ? roundScore((compliantIncidents / incidents.length) * 100)
    : 100;

  const totalShiftRequired = shiftSchedules.reduce((sum: number, item: any) => sum + Number(item.requiredCount ?? 0), 0);
  const totalShiftActualQualified = shiftComplianceItems.reduce((sum: number, item: any) => sum + Number(item.actualCount ?? 0), 0);
  const totalShiftMissingCount = shiftComplianceItems.reduce((sum: number, item: any) => sum + Number(item.missingCount ?? 0), 0);
  const totalShiftLateCount = shiftSchedules.reduce((sum: number, item: any) => sum + Number(item.lateCount ?? 0), 0);
  const totalShiftWrongPositionCount = shiftSchedules.reduce((sum: number, item: any) => sum + Number(item.wrongPositionCount ?? 0), 0);

  const site = input.siteId
    ? await tx.site.findFirst({
        where: {
          tenantId: input.tenantId,
          id: input.siteId,
        },
      })
    : null;

  const violationSnapshots = violations.map((violation: any) => ({
    id: violation.id,
    occurredAt: violation.occurredAt?.toISOString?.() ?? null,
    status: violation.status,
    normalizedStatus: normalizeViolationEventStatus(violation.status),
    severity: violation.severity,
    sourceType: violation.sourceType,
    violationType: violation.violationType,
    vendorId: violation.vendorId ?? input.vendorId,
    contractId: violation.contractId ?? input.contractId ?? null,
    siteId: violation.siteId ?? input.siteId ?? null,
    penaltyAmount: Number(violation.penaltyAmount ?? 0),
    evidence: toPlainJson(violation.evidence),
    metadata: toPlainJson(violation.metadata),
  }));

  const evidenceSnapshots = violationSnapshots.flatMap((violation) => {
    const evidence = violation.evidence;
    if (!evidence) {
      return [];
    }

    return [{
      violationEventId: violation.id,
      incidentId: typeof evidence.incidentId === 'string' ? evidence.incidentId : null,
      payload: evidence,
    }];
  });

  const reportBoundContract = bindContractToReportVersion(contract, resolvedContractVersion);

  const penaltyEngineResult = await computePenaltyItemsV2(
    tx,
    {
      tenantId: input.tenantId,
      month: input.month,
      vendorId: input.vendorId,
      contractId: input.contractId ?? null,
      siteId: input.siteId ?? null,
    },
    reportBoundContract,
    penalizedViolations,
  );

  const penaltyItemsPayload = penaltyEngineResult.items.map((item) => ({
    tenantId: input.tenantId,
    violationEventId: item.violationEventId,
    penaltyRuleId: item.penaltyRuleId,
    vendorId: item.vendorId,
    contractId: item.contractId,
    siteId: item.siteId,
    type: item.type,
    status: item.status,
    baseAmount: toDecimalAmount(item.baseAmount),
    unit: item.unit,
    quantity: toDecimalAmount(item.quantity),
    graceApplied: item.graceApplied,
    capApplied: item.capApplied,
    finalAmount: toDecimalAmount(item.finalAmount),
    amount: toDecimalAmount(item.finalAmount),
    reason: item.reason,
    calculationDetail: item.calculationDetail,
    contractVersionSnapshot: item.contractVersionSnapshot,
    metadata: item.metadata,
  }));

  const totalPenaltySuggested = penaltyItemsPayload.reduce(
    (sum: number, item: { amount: Prisma.Decimal }) => sum + Number(item.amount),
    0,
  );

  const evidenceRequiredCount = violations.length;
  const evidenceCompleteCount = violationSnapshots.filter((item) => item.evidence && Object.keys(item.evidence).length > 0).length;
  const scorecardBreakdown = computeMonthlyAcceptanceScorecard({
    totalShiftRequired,
    totalShiftActualQualified,
    totalShiftMissingCount,
    totalShiftLateCount,
    totalShiftWrongPositionCount,
    patrolSessionsCount: patrolSessions.length,
    patrolAverageScore: patrolRate,
    incidentsCount: incidents.length,
    compliantIncidentsCount: compliantIncidents,
    evidenceRequiredCount,
    evidenceCompleteCount,
    manualInspectionScore: null,
    manualInspectionMaxScore: null,
  });

  const financialSummary = computeMonthlyFinancialSummary({
    contractValue: Number(resolvedContractVersion?.totalContractValue ?? contract?.value ?? 0),
    penalties: penaltyItemsPayload.map((item) => ({
      penaltyId: `${item.violationEventId}:${item.penaltyRuleId ?? 'NO_RULE'}`,
      violationEventId: item.violationEventId,
      type: item.type,
      status: disputedViolations.some((violation: any) => violation.id === item.violationEventId)
        ? 'DISPUTED'
        : waivedViolations.some((violation: any) => violation.id === item.violationEventId)
          ? 'WAIVED'
          : item.status,
      amount: Number(item.amount),
      finalAmount: Number(item.finalAmount),
      reason: item.reason,
      calculationDetail: item.calculationDetail,
      metadata: {
        ...(item.metadata ?? {}),
        evidenceLinks: evidenceSnapshots
          .filter((evidence) => evidence.violationEventId === item.violationEventId)
          .map((evidence) => JSON.stringify(evidence.payload)),
      },
    })),
  });

  const metrics = {
    patrolSessions: patrolSessions.length,
    incidents: incidents.length,
    violations: violations.length,
    confirmedViolationIds: scoredViolations.map((item: any) => item.id),
    pendingViolationIds: pendingViolations.map((item: any) => item.id),
    penalizedViolationIds: penalizedViolations.map((item: any) => item.id),
    disputedViolationIds: disputedViolations.map((item: any) => item.id),
    waivedViolationIds: waivedViolations.map((item: any) => item.id),
    scorecard: scorecardBreakdown,
    scorecardRates: scorecardBreakdown.rates,
    financialSummary,
  };

  const scoreFormulaVersion = scorecardBreakdown.formulaVersion;
  const lineItems = Array.isArray(resolvedContractVersion?.lineItems)
    ? resolvedContractVersion.lineItems.map((item: any) => ({
        id: item.id,
        siteId: item.siteId,
        guardPostId: item.guardPostId ?? null,
        shiftType: item.shiftType ?? null,
        shiftName: item.shiftName ?? null,
        startTime: item.startTime ?? null,
        endTime: item.endTime ?? null,
        positionName: item.positionName ?? null,
        requiredStaffCount: item.requiredStaffCount ?? 0,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
        billingCycle: item.billingCycle ?? 'MONTHLY',
        totalAmount: item.totalAmount ? Number(item.totalAmount) : 0,
        sortOrder: item.sortOrder ?? 0,
      }))
    : [];
  const contractVersionId = resolvedContractVersion?.id ?? null;
  const contractSnapshot = contract
    ? {
        id: contract.id,
        code: contract.contractCode ?? null,
        name: contract.contractName ?? null,
        status: contract.status ?? null,
        startDate: contract.startDate?.toISOString?.() ?? null,
        endDate: contract.endDate?.toISOString?.() ?? null,
        guardCountPerShift: resolvedContractVersion?.guardCountPerShift ?? contract.guardCountPerShift ?? null,
        currency: resolvedContractVersion?.currency ?? contract.currency ?? null,
        value: resolvedContractVersion?.totalContractValue
          ? Number(resolvedContractVersion.totalContractValue)
          : (contract.value ? Number(contract.value) : null),
        contractVersionId,
        contractVersionNumber: resolvedContractVersion?.versionNumber ?? null,
        contractVersionStatus: resolvedContractVersion?.status ?? null,
        contractVersionEffectiveFrom: resolvedContractVersion?.effectiveFrom?.toISOString?.() ?? null,
        contractVersionEffectiveTo: resolvedContractVersion?.effectiveTo?.toISOString?.() ?? null,
        reportCutoffAt: reportCutoff.asOf.toISOString(),
        lineItems,
      }
    : null;
  const slaPolicySnapshot = toPlainJson(resolvedContractVersion?.slaConfig ?? contract?.slaConfig);
  const penaltyPolicySnapshot = toPlainJson(resolvedContractVersion?.penaltyPolicy ?? contract?.penaltyPolicy);
  const vendorSnapshot = {
    id: vendor.id,
    name: vendor.name,
  };
  const siteSnapshot = site
    ? {
        id: site.id,
        code: null,
        name: site.siteName ?? null,
        status: site.status ?? null,
        address: site.address ?? null,
        managerName: site.managerName ?? null,
        managerPhone: site.managerPhone ?? null,
      }
    : null;

  const summary = {
    month: input.month,
    vendor: vendorSnapshot,
    contractId: input.contractId ?? null,
    contractVersionId,
    reportCutoffAt: reportCutoff.asOf.toISOString(),
    siteId: input.siteId ?? null,
    patrolRate,
    incidentRate,
    disciplineRate: scorecardBreakdown.rates.shiftCoverageRate,
    shiftCoverageRate: scorecardBreakdown.rates.shiftCoverageRate,
    patrolComplianceRate: scorecardBreakdown.rates.patrolComplianceRate,
    incidentSlaRate: scorecardBreakdown.rates.incidentSlaRate,
    evidenceCompletenessRate: scorecardBreakdown.rates.evidenceCompletenessRate,
    manualAuditRate: scorecardBreakdown.rates.manualAuditRate,
    totalScore: scorecardBreakdown.totalScore,
    needsVerification: scorecardBreakdown.needsVerification,
    formulaVersion: scorecardBreakdown.formulaVersion,
    scorecardBreakdown,
    financialSummary,
    totals: {
      shiftRequired: totalShiftRequired,
      shiftActualQualified: totalShiftActualQualified,
      shiftMissingCount: totalShiftMissingCount,
      shiftLateCount: totalShiftLateCount,
      shiftWrongPositionCount: totalShiftWrongPositionCount,
      patrolSessions: patrolSessions.length,
      incidents: incidents.length,
      violations: violations.length,
      confirmedViolations: scoredViolations.length,
      pendingViolations: pendingViolations.length,
      disputedViolations: disputedViolations.length,
      waivedViolations: waivedViolations.length,
      penalizedViolations: penalizedViolations.length,
      penaltySuggested: totalPenaltySuggested,
      waivedAmount: financialSummary.totalWaived,
      disputedAmount: financialSummary.totalDisputed,
      proposedAcceptanceAmount: financialSummary.totalProposedAcceptance,
    },
  };

  const penaltyCalculationDetails = {
    generatedAt: new Date().toISOString(),
    engineVersion: penaltyEngineResult.summary.engineVersion,
    rulesEvaluated: penaltyEngineResult.summary.rulesEvaluated,
    unmatchedViolationIds: penaltyEngineResult.summary.unmatchedViolationIds,
    generatedPenaltyItems: penaltyItemsPayload.map((item) => ({
      violationEventId: item.violationEventId,
      penaltyRuleId: item.penaltyRuleId,
      unit: item.unit,
      quantity: Number(item.quantity),
      baseAmount: Number(item.baseAmount),
      graceApplied: item.graceApplied,
      capApplied: item.capApplied,
      finalAmount: Number(item.finalAmount),
    })),
  };

  const generatedDataHash = createHash('sha256').update(stableSerialize({
    month: input.month,
    vendorSnapshot,
    contractSnapshot,
    siteSnapshot,
    slaPolicySnapshot,
    penaltyPolicySnapshot,
    scoreFormulaVersion,
    violationSnapshots,
    evidenceSnapshots,
    penaltyCalculationDetails,
    summary,
  })).digest('hex');

  return {
    summary,
    contractVersionId,
    contractSnapshot,
    vendorSnapshot,
    siteSnapshot,
    slaPolicySnapshot,
    penaltyPolicySnapshot,
    scoreFormulaVersion,
    violationSnapshots,
    evidenceSnapshots,
    penaltyCalculationDetails,
    generatedDataHash,
    totalPenaltySuggested,
    totalConfirmedViolations: scoredViolations.length,
    totalPendingViolations: pendingViolations.length,
    totalWaivedAmount: financialSummary.totalWaived,
    totalDisputedAmount: financialSummary.totalDisputed,
    totalProposedAcceptance: financialSummary.totalProposedAcceptance,
    penaltyItemsPayload,
    metrics,
    patrolRate,
    incidentRate,
    disciplineRate: scorecardBreakdown.rates.shiftCoverageRate,
    shiftCoverageRate: scorecardBreakdown.rates.shiftCoverageRate,
    patrolComplianceRate: scorecardBreakdown.rates.patrolComplianceRate,
    incidentSlaRate: scorecardBreakdown.rates.incidentSlaRate,
    evidenceCompletenessRate: scorecardBreakdown.rates.evidenceCompletenessRate,
    manualAuditRate: scorecardBreakdown.rates.manualAuditRate,
    scoreBreakdown: JSON.parse(JSON.stringify(scorecardBreakdown)) as Record<string, unknown>,
    formulaVersion: scorecardBreakdown.formulaVersion,
    totalScore: scorecardBreakdown.totalScore,
  };
}

export async function generateMonthlyComplianceSnapshot(rawInput: ReportScopeInput) {
  const input = monthlyComplianceInputSchema.parse(rawInput);
  const { start, end } = getMonthRange(input.month);
  const reportCutoff = getReportCutoff(start, end);

  return db.withTenant(input.tenantId, async (tx: any) => {
    const vendor = await tx.vendor.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.vendorId,
      },
      select: { id: true, name: true },
    });

    if (!vendor) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    const contract = input.contractId
      ? await tx.contract.findFirst({
          where: {
            tenantId: input.tenantId,
            id: input.contractId,
            vendorId: input.vendorId,
          },
          include: {
            activeVersion: true,
          },
        })
      : null;

    if (input.contractId && !contract) {
      throw new Error('CONTRACT_NOT_FOUND');
    }

    const scopeWhere = buildScopeWhere(input);

    const [patrolSessions, incidents, violations, shiftSchedules, shiftComplianceItems] = await Promise.all([
      tx.patrolSession.findMany({
        where: {
          tenantId: input.tenantId,
          createdAt: { gte: start, lt: end },
          ...scopeWhere,
        },
        select: {
          id: true,
          status: true,
          complianceScore: true,
        },
      }),
      tx.incident.findMany({
        where: {
          tenantId: input.tenantId,
          reportedAt: { gte: start, lt: end },
          ...scopeWhere,
        },
        select: {
          id: true,
          slaBreached: true,
        },
      }),
      tx.violationEvent.findMany({
        where: {
          tenantId: input.tenantId,
          occurredAt: { gte: start, lt: end },
          ...scopeWhere,
        },
        orderBy: { occurredAt: 'desc' },
      }),
      tx.shiftSchedule.findMany({
        where: {
          tenantId: input.tenantId,
          date: { gte: input.month + '-01', lt: input.month + '-32' },
          ...(input.contractId ? { contractId: input.contractId } : {}),
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        select: {
          id: true,
          requiredCount: true,
          date: true,
          positionName: true,
          shiftType: true,
          attendanceRecords: {
            where: {
              tenantId: input.tenantId,
              type: 'CHECK_IN',
              lateMinutes: { gt: 0 },
            },
            select: { id: true },
          },
        },
      }).then((items: any[]) => items.map((item: any) => ({
        ...item,
        lateCount: Array.isArray(item.attendanceRecords) ? item.attendanceRecords.length : 0,
        wrongPositionCount: 0,
      }))),
      tx.shiftComplianceItem.findMany({
        where: {
          tenantId: input.tenantId,
          date: { gte: input.month + '-01', lt: input.month + '-32' },
          ...(input.contractId ? { contractId: input.contractId } : {}),
        },
        select: {
          id: true,
          actualCount: true,
          missingCount: true,
          requiredCount: true,
          date: true,
        },
      }),
    ]);

    const resolvedContractVersion = await resolveContractVersionForReport(tx, input, contract, reportCutoff.periodStart, reportCutoff.periodEndExclusive);
    const snapshot = await buildSnapshotBundle(
      tx,
      input,
      vendor,
      contract,
      resolvedContractVersion,
      reportCutoff,
      patrolSessions,
      incidents,
      violations,
      shiftSchedules,
      shiftComplianceItems,
    );

    const existingScorecard = await findScopedScorecard(tx, input);
    const scorecardData = {
      status: existingScorecard?.status === 'FINALIZED' ? 'FINALIZED' : 'DRAFT',
      patrolRate: snapshot.patrolRate,
      incidentRate: snapshot.incidentRate,
      disciplineRate: snapshot.disciplineRate,
      shiftCoverageRate: snapshot.shiftCoverageRate,
      patrolComplianceRate: snapshot.patrolComplianceRate,
      incidentSlaRate: snapshot.incidentSlaRate,
      evidenceCompletenessRate: snapshot.evidenceCompletenessRate,
      manualAuditRate: snapshot.manualAuditRate,
      totalScore: snapshot.totalScore,
      formulaVersion: snapshot.formulaVersion,
      scoreBreakdown: snapshot.scoreBreakdown,
      confirmedViolationsCount: snapshot.totalConfirmedViolations,
      pendingViolationsCount: snapshot.totalPendingViolations,
      violationsCount: violations.length,
      totalPenaltySuggested: toDecimalAmount(snapshot.totalPenaltySuggested),
      metrics: snapshot.metrics,
    };

    const scorecard = existingScorecard
      ? await tx.vendorScorecard.update({
          where: { id: existingScorecard.id },
          data: scorecardData,
        })
      : await tx.vendorScorecard.create({
          data: {
            tenantId: input.tenantId,
            vendorId: input.vendorId,
            contractId: input.contractId ?? null,
            siteId: input.siteId ?? null,
            month: input.month,
            ...scorecardData,
          },
        });

    const latestReport = await findLatestScopedReport(tx, input);
    const shouldCreateRevision = latestReport?.status === 'FINALIZED';
    const isExistingDraftEditable = latestReport?.status === 'DRAFT';
    const reportData = {
      status: 'DRAFT',
      scorecardId: scorecard.id,
      generatedAt: new Date(),
      generatedBy: input.actorId ?? 'system',
      finalizedAt: null,
      finalizedBy: null,
      totalPenaltyAmount: toDecimalAmount(snapshot.totalPenaltySuggested),
      totalConfirmedViolations: snapshot.totalConfirmedViolations,
      totalPendingViolations: snapshot.totalPendingViolations,
      summary: snapshot.summary,
      contractVersionId: snapshot.contractVersionId,
      contractSnapshot: snapshot.contractSnapshot,
      vendorSnapshot: snapshot.vendorSnapshot,
      siteSnapshot: snapshot.siteSnapshot,
      slaPolicySnapshot: snapshot.slaPolicySnapshot,
      penaltyPolicySnapshot: snapshot.penaltyPolicySnapshot,
      scoreFormulaVersion: snapshot.scoreFormulaVersion,
      violationSnapshots: snapshot.violationSnapshots,
      evidenceSnapshots: snapshot.evidenceSnapshots,
      penaltyCalculationDetails: snapshot.penaltyCalculationDetails,
      generatedDataHash: snapshot.generatedDataHash,
    };

    const report = shouldCreateRevision
      ? await tx.monthlyAcceptanceReport.create({
          data: {
            tenantId: input.tenantId,
            vendorId: input.vendorId,
            contractId: input.contractId ?? null,
            siteId: input.siteId ?? null,
            month: input.month,
            revisionNumber: (latestReport?.revisionNumber ?? 0) + 1,
            revisionRootId: latestReport?.revisionRootId ?? latestReport?.id ?? null,
            previousRevisionId: latestReport?.id ?? null,
            ...reportData,
          },
        })
      : isExistingDraftEditable
        ? await tx.monthlyAcceptanceReport.update({
            where: { id: latestReport.id },
            data: reportData,
          })
        : await tx.monthlyAcceptanceReport.create({
            data: {
              tenantId: input.tenantId,
              vendorId: input.vendorId,
              contractId: input.contractId ?? null,
              siteId: input.siteId ?? null,
              month: input.month,
              revisionNumber: 1,
              ...reportData,
            },
          });

    await tx.penaltyItem.deleteMany({
      where: {
        tenantId: input.tenantId,
        reportId: report.id,
      },
    });

    if (snapshot.penaltyItemsPayload.length > 0) {
      await tx.penaltyItem.createMany({
        data: snapshot.penaltyItemsPayload.map((item) => ({
          ...item,
          reportId: report.id,
        })),
      });
    }

    return {
      scorecard,
      report,
      summary: snapshot.summary,
    };
  });
}
