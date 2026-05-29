export interface PatrolComplianceInput {
  startedAt: Date;
  completedAt?: Date | null;
  route: {
    estimatedMinutes?: number | null;
    requiredCompletionPercent?: number | null;
    checkpoints: Array<{
      id: string;
      checkpointId: string;
      sequence: number;
      isRequired: boolean;
      minOffsetMinutes?: number | null;
      maxOffsetMinutes?: number | null;
      photoRequired?: boolean;
      noteRequired?: boolean;
    }>;
  };
  logs: Array<{
    routeCheckpointId?: string | null;
    createdAt: Date;
    scannedAt?: Date | null;
    exceptionCodes?: string[];
    photoEvidenceIds?: string[];
    note?: string | null;
  }>;
}

export interface PatrolComplianceResult {
  completionPercent: number;
  complianceScore: number;
  missedCheckpointIds: string[];
  lateCheckpointIds: string[];
  gpsViolationCount: number;
  outOfOrderCount: number;
  evidenceMissingCount: number;
  tooFast: boolean;
  tooLate: boolean;
  recommendation: string;
  shouldCreateViolation: boolean;
  violationTypes: string[];
}

export class PatrolComplianceCalculator {
  static calculate(input: PatrolComplianceInput): PatrolComplianceResult {
    const required = input.route.checkpoints.filter((cp) => cp.isRequired);
    const requiredCount = Math.max(required.length, 1);
    const scannedRouteCheckpointIds = new Set(input.logs.map((log) => log.routeCheckpointId).filter(Boolean) as string[]);

    const missed = required.filter((cp) => !scannedRouteCheckpointIds.has(cp.id));
    const gpsViolationCount = input.logs.filter((log) => log.exceptionCodes?.includes('GPS_MISMATCH')).length;
    const outOfOrderCount = input.logs.filter((log) => log.exceptionCodes?.includes('WRONG_ORDER')).length;

    const lateCheckpointIds: string[] = [];
    let evidenceMissingCount = 0;

    for (const cp of input.route.checkpoints) {
      const log = input.logs.find((item) => item.routeCheckpointId === cp.id);
      if (!log) continue;

      const scannedAt = log.scannedAt || log.createdAt;
      const elapsedMinutes = Math.max(0, Math.floor((scannedAt.getTime() - input.startedAt.getTime()) / 60000));
      if (typeof cp.maxOffsetMinutes === 'number' && elapsedMinutes > cp.maxOffsetMinutes) {
        lateCheckpointIds.push(cp.checkpointId);
      }

      if (cp.photoRequired && (!log.photoEvidenceIds || log.photoEvidenceIds.length === 0)) {
        evidenceMissingCount += 1;
      }
      if (cp.noteRequired && !log.note) {
        evidenceMissingCount += 1;
      }
    }

    const completedAt = input.completedAt || new Date();
    const durationMinutes = Math.max(0, Math.floor((completedAt.getTime() - input.startedAt.getTime()) / 60000));
    const expectedDuration = input.route.estimatedMinutes || 0;
    const tooFast = expectedDuration > 0 && durationMinutes < Math.max(1, Math.floor(expectedDuration * 0.4));
    const tooLate = expectedDuration > 0 && durationMinutes > Math.ceil(expectedDuration * 1.5);

    const completionPercent = Math.round(((required.length - missed.length) / requiredCount) * 100);
    let complianceScore = 100;
    complianceScore -= missed.length * 20;
    complianceScore -= gpsViolationCount * 10;
    complianceScore -= outOfOrderCount * 5;
    complianceScore -= evidenceMissingCount * 10;
    if (tooFast) complianceScore -= 15;
    if (tooLate) complianceScore -= 10;
    complianceScore = Math.max(0, Math.min(100, Math.round(complianceScore)));

    const violationTypes: string[] = [];
    const target = input.route.requiredCompletionPercent || 100;
    if (completionPercent < target) violationTypes.push('PATROL_COMPLETION_BELOW_SLA');
    if (missed.length > 0) violationTypes.push('MISSED_REQUIRED_CHECKPOINT');
    if (gpsViolationCount > 0) violationTypes.push('GPS_VIOLATION');
    if (evidenceMissingCount > 0) violationTypes.push('MISSING_REQUIRED_EVIDENCE');
    if (tooFast) violationTypes.push('SUSPICIOUS_TOO_FAST');
    if (tooLate) violationTypes.push('PATROL_COMPLETED_LATE');

    return {
      completionPercent,
      complianceScore,
      missedCheckpointIds: missed.map((cp) => cp.checkpointId),
      lateCheckpointIds,
      gpsViolationCount,
      outOfOrderCount,
      evidenceMissingCount,
      tooFast,
      tooLate,
      recommendation: violationTypes.length > 0 ? 'Cần supervisor review và đưa vào đối soát vendor SLA.' : 'Phiên tuần tra đạt yêu cầu SLA.',
      shouldCreateViolation: violationTypes.length > 0,
      violationTypes,
    };
  }
}
