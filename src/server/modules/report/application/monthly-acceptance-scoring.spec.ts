import { describe, it, expect } from 'vitest';
import {
  computeMonthlyAcceptanceScorecard,
  computeMonthlyFinancialSummary,
} from './monthly-acceptance-scoring';

describe('computeMonthlyAcceptanceScorecard', () => {
  it('tinh dung tong diem va breakdown 5 nhom co the audit', () => {
    const result = computeMonthlyAcceptanceScorecard({
      totalShiftRequired: 100,
      totalShiftActualQualified: 95,
      totalShiftMissingCount: 5,
      totalShiftLateCount: 10,
      totalShiftWrongPositionCount: 5,
      patrolSessionsCount: 20,
      patrolAverageScore: 80,
      incidentsCount: 8,
      compliantIncidentsCount: 6,
      evidenceRequiredCount: 10,
      evidenceCompleteCount: 9,
      manualInspectionScore: 4,
      manualInspectionMaxScore: 5,
    });

    expect(result.formulaVersion).toBe('monthly-acceptance-scorecard-v2.5-groups');
    expect(result.totalScore).toBe(83.25);
    expect(result.rates).toEqual({
      shiftCoverageRate: 91.67,
      patrolComplianceRate: 80,
      incidentSlaRate: 75,
      evidenceCompletenessRate: 90,
      manualAuditRate: 80,
    });
    expect(result.groups).toHaveLength(5);
    expect(result.groups[0]).toMatchObject({
      key: 'staffing',
      weightedScore: 27.5,
    });
    expect(result.groups[1]).toMatchObject({
      key: 'patrol',
      weightedScore: 24,
    });
    expect(result.groups[2]).toMatchObject({
      key: 'incidentSla',
      weightedScore: 18.75,
    });
    expect(result.groups[3]).toMatchObject({
      key: 'evidence',
      weightedScore: 9,
    });
    expect(result.groups[4]).toMatchObject({
      key: 'manualInspection',
      weightedScore: 4,
    });
  });

  it('danh dau can xac minh khi thieu du lieu nhom', () => {
    const result = computeMonthlyAcceptanceScorecard({
      totalShiftRequired: 0,
      totalShiftActualQualified: 0,
      totalShiftMissingCount: 0,
      totalShiftLateCount: 0,
      totalShiftWrongPositionCount: 0,
      patrolSessionsCount: 0,
      patrolAverageScore: 0,
      incidentsCount: 0,
      compliantIncidentsCount: 0,
      evidenceRequiredCount: 0,
      evidenceCompleteCount: 0,
      manualInspectionScore: null,
      manualInspectionMaxScore: null,
    });

    expect(result.status).toBe('PENDING_VERIFICATION');
    expect(result.needsVerification).toBe(true);
    expect(result.groups.every((item) => item.status === 'PENDING_VERIFICATION')).toBe(true);
  });
});

describe('computeMonthlyFinancialSummary', () => {
  it('tong hop dung penalty de xuat, waive, dispute va acceptance amount', () => {
    const result = computeMonthlyFinancialSummary({
      contractValue: 10000000,
      penalties: [
        {
          penaltyId: 'p1',
          violationEventId: 'v1',
          type: 'SHIFT_UNDERSTAFFED',
          status: 'SUGGESTED',
          amount: 300000,
          finalAmount: 300000,
          metadata: { evidenceLinks: ['evidence://1'] },
        },
        {
          penaltyId: 'p2',
          violationEventId: 'v2',
          type: 'LATE_RESPONSE',
          status: 'WAIVED',
          amount: 0,
          finalAmount: 200000,
          metadata: { evidenceLinks: ['evidence://2'] },
        },
        {
          penaltyId: 'p3',
          violationEventId: 'v3',
          type: 'CHECKLIST_MISSED',
          status: 'DISPUTED',
          amount: 150000,
          finalAmount: 150000,
          metadata: { evidenceLinks: ['evidence://3'] },
        },
      ],
    });

    expect(result.totalPenaltyProposed).toBe(650000);
    expect(result.totalWaived).toBe(200000);
    expect(result.totalDisputed).toBe(150000);
    expect(result.totalEffectivePenalty).toBe(300000);
    expect(result.totalProposedAcceptance).toBe(9700000);
    expect(result.lines[1]).toMatchObject({
      waivedAmount: 200000,
      effectiveAmount: 0,
    });
    expect(result.lines[2]).toMatchObject({
      disputeAmount: 150000,
      effectiveAmount: 0,
    });
  });
});
