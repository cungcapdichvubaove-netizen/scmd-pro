import { z } from 'zod';

export const vendorSchema = z.object({
  name: z.string().min(1),
  taxCode: z.string().optional(),
  address: z.string().optional(),
  managerName: z.string().optional(),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  serviceScope: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED']).default('ACTIVE'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  notes: z.string().optional(),
});

export const siteSchema = z.object({
  siteName: z.string().min(1),
  address: z.string().min(1),
  siteType: z.enum(['FACTORY', 'OFFICE', 'WAREHOUSE', 'BUILDING', 'RETAIL', 'OTHER']).default('OTHER'),
  geoFence: z.any().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  managerName: z.string().optional(),
  managerPhone: z.string().optional(),
  vendorId: z.string().uuid().optional(),
});

const guardPostBaseSchema = z.object({
  siteId: z.string().uuid(),
  postName: z.string().min(1),
  postType: z.enum(['GATE', 'LOBBY', 'PARKING', 'WAREHOUSE', 'PERIMETER', 'CONTROL_ROOM', 'OTHER']).default('OTHER'),
  requiredGuardCount: z.number().int().positive().default(1),
  requiredSkill: z.string().optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().int().positive().default(50),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const validateGuardPostGps = (data: { gpsLat?: number; gpsLng?: number }, ctx: z.RefinementCtx) => {
  const hasLat = typeof data.gpsLat === 'number';
  const hasLng = typeof data.gpsLng === 'number';
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasLat ? ['gpsLng'] : ['gpsLat'],
      message: 'GPS_LAT_LNG_REQUIRED_TOGETHER',
    });
  }
};

export const guardPostSchema = guardPostBaseSchema.superRefine(validateGuardPostGps);
export const guardPostUpdateSchema = guardPostBaseSchema.partial().superRefine(validateGuardPostGps);

export const slaConfigSchema = z.object({
  patrolCompletionTargetPercent: z.number().min(0).max(100).optional(),
  incidentResponseMinutes: z.number().int().positive().optional(),
  incidentResolutionMinutes: z.number().int().positive().optional(),
  lateCheckInGraceMinutes: z.number().int().nonnegative().optional(),
  missingGuardPenalty: z.number().nonnegative().optional(),
  missedPatrolPenalty: z.number().nonnegative().optional(),
  unresolvedIncidentPenalty: z.number().nonnegative().optional(),
  requiredEvidenceTypes: z.array(z.enum(['PHOTO', 'VIDEO', 'NOTE', 'DOCUMENT', 'SIGNATURE'])).default([]),
  patrol_frequency_minutes: z.number().int().positive().optional(),
  min_patrol_compliance: z.number().min(0).max(100).optional(),
  max_incident_response_minutes: z.number().int().positive().optional(),
  max_violations_per_month: z.number().int().nonnegative().optional(),
  penalty_per_violation: z.number().nonnegative().optional(),
  bonus_kpi_target: z.number().min(0).max(100).optional(),
}).passthrough();

const contractBaseSchema = z.object({
  contractName: z.string().min(1).optional(),
  contractCode: z.string().min(1).optional(),
  vendorId: z.string().uuid(),
  siteId: z.string().uuid(),
  siteName: z.string().min(1).optional(),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  value: z.number(),
  currency: z.string().default('VND'),
  guardCountPerShift: z.number().int().positive(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).default('DRAFT'),
  slaConfig: slaConfigSchema,
  acceptancePolicy: z.record(z.any()).optional(),
  evidencePolicy: z.record(z.any()).optional(),
  penaltyPolicy: z.record(z.any()).optional(),
  contractFileUrl: z.string().url().optional(),
});

const validateContractDates = (data: { startDate?: Date; endDate?: Date }, ctx: z.RefinementCtx) => {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'END_DATE_MUST_AFTER_START_DATE' });
  }
};

export const contractSchema = contractBaseSchema.superRefine(validateContractDates);
export const contractUpdateSchema = contractBaseSchema.partial().superRefine(validateContractDates);

export const contractVersionParamsSchema = z.object({
  contractId: z.string().uuid(),
  versionId: z.string().uuid().optional(),
});

const contractVersionDateSchema = z.preprocess(
  (value) => value instanceof Date ? value : typeof value === 'string' ? new Date(value) : value,
  z.date(),
);

export const contractVersionCreateSchema = z.object({
  versionLabel: z.string().min(1).optional(),
  changeSummary: z.string().optional(),
  effectiveFrom: contractVersionDateSchema,
  effectiveTo: contractVersionDateSchema.optional(),
  currency: z.string().default('VND'),
  totalContractValue: z.number().nonnegative().optional(),
  guardCountPerShift: z.number().int().positive().optional(),
  acceptancePolicy: z.record(z.any()).optional(),
  evidencePolicy: z.record(z.any()).optional(),
  penaltyPolicy: z.record(z.any()).optional(),
  slaConfig: slaConfigSchema.optional(),
  metadata: z.record(z.any()).optional(),
}).superRefine((data, ctx) => {
  if (data.effectiveTo && data.effectiveTo <= data.effectiveFrom) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'EFFECTIVE_TO_MUST_AFTER_EFFECTIVE_FROM' });
  }
});

export const shiftScheduleListSchema = z.object({
  contractId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const generateShiftSchedulesSchema = z.object({
  contractId: z.string().uuid(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const assignShiftSchema = z.object({
  shiftScheduleId: z.string().uuid(),
  staffId: z.string().uuid(),
  notes: z.string().optional(),
});

export const removeShiftAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
});

export type VendorDTO = z.infer<typeof vendorSchema>;
export type SiteDTO = z.infer<typeof siteSchema>;
export type GuardPostDTO = z.infer<typeof guardPostSchema>;
export type ContractDTO = z.infer<typeof contractSchema>;
export type ContractVersionCreateDTO = z.infer<typeof contractVersionCreateSchema>;
export type ShiftScheduleListDTO = z.infer<typeof shiftScheduleListSchema>;
export type GenerateShiftSchedulesDTO = z.infer<typeof generateShiftSchedulesSchema>;
export type AssignShiftDTO = z.infer<typeof assignShiftSchema>;
