import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const monthlyComplianceInputSchema = z.object({
  tenantId: z.string().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  vendorId: z.string().min(1),
  contractId: z.string().min(1).optional().nullable(),
  siteId: z.string().min(1).optional().nullable(),
  actorId: z.string().min(1).optional().nullable(),
});

export type ReportScopeInput = z.infer<typeof monthlyComplianceInputSchema>;

export type MonthlyComplianceRevisionInput = {
  tenantId: string;
  reportId: string;
  actorId: string;
  notes?: string | null;
};

export type MonthlyComplianceFinalizeInput = {
  tenantId: string;
  reportId: string;
  actorId: string;
  notes?: string | null;
};

export type PenaltyItemPayload = {
  tenantId: string;
  violationEventId: string;
  penaltyRuleId: string | null;
  vendorId: string;
  contractId: string | null;
  siteId: string | null;
  type: string;
  status: string;
  baseAmount: Prisma.Decimal;
  unit: string;
  quantity: Prisma.Decimal;
  graceApplied: boolean;
  capApplied: boolean;
  finalAmount: Prisma.Decimal;
  amount: Prisma.Decimal;
  reason: string;
  calculationDetail: Record<string, unknown>;
  contractVersionSnapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};

export type SnapshotBundle = {
  summary: Record<string, unknown>;
  contractVersionId: string | null;
  contractSnapshot: Record<string, unknown> | null;
  vendorSnapshot: Record<string, unknown>;
  siteSnapshot: Record<string, unknown> | null;
  slaPolicySnapshot: Record<string, unknown> | null;
  penaltyPolicySnapshot: Record<string, unknown> | null;
  scoreFormulaVersion: string;
  violationSnapshots: Array<Record<string, unknown>>;
  evidenceSnapshots: Array<Record<string, unknown>>;
  penaltyCalculationDetails: Record<string, unknown>;
  generatedDataHash: string;
  totalPenaltySuggested: number;
  totalConfirmedViolations: number;
  totalPendingViolations: number;
  totalWaivedAmount: number;
  totalDisputedAmount: number;
  totalProposedAcceptance: number;
  penaltyItemsPayload: PenaltyItemPayload[];
  metrics: Record<string, unknown>;
  patrolRate: number;
  incidentRate: number;
  disciplineRate: number;
  shiftCoverageRate: number;
  patrolComplianceRate: number;
  incidentSlaRate: number;
  evidenceCompletenessRate: number;
  manualAuditRate: number;
  scoreBreakdown: Record<string, unknown>;
  formulaVersion: string;
  totalScore: number;
};

export type ReportCutoff = {
  periodStart: Date;
  periodEndExclusive: Date;
  asOf: Date;
};
