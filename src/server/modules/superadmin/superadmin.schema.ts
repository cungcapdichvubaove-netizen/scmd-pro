import { z } from 'zod';
import { TenantPlan, TenantStatus } from '../../core/architecture/types.js';
import { SubscriptionPlan } from '@prisma/client';

export const onboardTenantSchema = z.object({
  name: z.string().min(2),
  subdomain: z.string().regex(/^[a-z0-9-]{3,30}$/, "Subdomain chỉ được chứa chữ thường, số và dấu gạch ngang (3-30 ký tự)"),
  plan: z.nativeEnum(TenantPlan),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  ownerName: z.string().min(2),
  max_employees: z.number().int().positive().optional(),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.ACTIVE),
});

export const updateSubscriptionSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

export const globalAuditLogQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  action: z.string().optional()
});
