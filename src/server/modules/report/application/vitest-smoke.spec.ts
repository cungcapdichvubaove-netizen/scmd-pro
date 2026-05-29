import { describe, expect, it } from 'vitest';
import { computeMonthlyAcceptanceScorecard } from './monthly-acceptance-scoring';

describe('report application smoke', () => {
  it('loads monthly acceptance scoring and computes a minimal scorecard', () => {
    const result = computeMonthlyAcceptanceScorecard({
      totalShiftRequired: 1,
      totalShiftActualQualified: 1,
      totalShiftMissingCount: 0,
      totalShiftLateCount: 0,
      totalShiftWrongPositionCount: 0,
      patrolSessionsCount: 1,
      patrolAverageScore: 100,
      incidentsCount: 0,
      compliantIncidentsCount: 0,
      evidenceRequiredCount: 0,
      evidenceCompleteCount: 0,
      manualInspectionScore: null,
      manualInspectionMaxScore: null,
    });

    expect(result).toBeDefined();
    expect(result.formulaVersion).toContain('monthly-acceptance');
  });
});
