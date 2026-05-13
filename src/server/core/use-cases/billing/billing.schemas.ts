import { z } from 'zod'

export const ActivateSubscriptionSchema = z.object({
  tenantId:    z.string().cuid({ message: 'tenantId không hợp lệ' }),
  paidUsers:   z.number().int().min(1, 'Tối thiểu 1 user').max(10_000),
  paidMonths:  z.number().int().min(1, 'Tối thiểu 1 tháng').max(24),
  // amountVnd KHÔNG nhận từ client — server tự tính và so sánh (xem UseCase)
  paymentRef:  z.string().min(3).max(100).trim(),
  paidAt:      z.coerce.date().max(new Date(), { message: 'Ngày thanh toán không thể trong tương lai' }),
  activatedBy: z.string().cuid(),
  note:        z.string().max(500).optional(),
})

export const ListBillingTenantsSchema = z.object({
  status:  z.enum(['all', 'active', 'expiring', 'expired', 'free']).default('all'),
  cursor:  z.string().optional(),
  take:    z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
    z.number().int().min(1).max(100).default(50)
  ),
})

export const ForceDowngradeSchema = z.object({
  tenantId: z.string().cuid(),
  reason:   z.string().min(5, 'Lý do phải ít nhất 5 ký tự').max(500),
  actorId:  z.string().cuid(),
})

export type ActivateSubscriptionInput = z.infer<typeof ActivateSubscriptionSchema>
export type ListBillingTenantsInput   = z.infer<typeof ListBillingTenantsSchema>
export type ForceDowngradeInput       = z.infer<typeof ForceDowngradeSchema>
