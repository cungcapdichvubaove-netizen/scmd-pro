import { z } from 'zod';

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const complianceScopeSchema = z.object({
  month: monthSchema,
  vendorId: z.string().min(1),
  contractId: z.string().min(1).optional().nullable(),
  siteId: z.string().min(1).optional().nullable(),
});

export const reportListQuerySchema = z.object({
  month: monthSchema.optional(),
  vendorId: z.string().min(1).optional(),
  contractId: z.string().min(1).optional(),
  siteId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const finalizeMonthlyAcceptanceReportSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export const createMonthlyAcceptanceRevisionSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export const monthlyAcceptanceVersionBindingSchema = z.object({
  reportId: z.string().min(1),
});

export const submitViolationDisputeSchema = z.object({
  violationEventId: z.string().min(1),
  reportId: z.string().min(1).optional().nullable(),
  reason: z.string().min(5).max(4000),
  responseNote: z.string().max(2000).optional().nullable(),
});

export const resolveViolationDisputeSchema = z.object({
  resolution: z.enum(['CONFIRMED', 'WAIVED', 'PENALIZED']),
  responseNote: z.string().min(3).max(4000),
});

export const exportMonthlyAcceptanceReportSchema = z.object({
  format: z.enum(['pdf', 'excel']),
});

export const violationDisputeListQuerySchema = z.object({
  reportId: z.string().min(1).optional(),
  violationEventId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  vendorId: z.string().min(1).optional(),
  contractId: z.string().min(1).optional(),
  siteId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
