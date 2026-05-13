import { z } from 'zod';

export const vendorSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  managerName: z.string().optional(),
  contactPerson: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  status: z.enum(['active', 'suspended']).default('active'),
});

export const contractSchema = z.object({
  vendorId: z.string().uuid(),
  siteName: z.string().min(1),
  startDate: z.string().transform((v) => new Date(v)),
  endDate: z.string().transform((v) => new Date(v)),
  value: z.number(),
  currency: z.string().default('VND'),
  guardCountPerShift: z.number().int().positive(),
  status: z.enum(['active', 'expired', 'terminated']).default('active'),
  slaConfig: z.object({
    patrol_frequency_minutes: z.number().int().positive(),
    min_patrol_compliance: z.number().min(0).max(100),
    max_incident_response_minutes: z.number().int().positive(),
    max_violations_per_month: z.number().int().nonnegative(),
    penalty_per_violation: z.number().nonnegative(),
    bonus_kpi_target: z.number().min(0).max(100),
  }),
});

export type VendorDTO = z.infer<typeof vendorSchema>;
export type ContractDTO = z.infer<typeof contractSchema>;
