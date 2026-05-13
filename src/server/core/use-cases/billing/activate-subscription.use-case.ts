import { trace } from '@opentelemetry/api'
import { db } from '../../db/prisma.js'
import { redisClient } from '../../redis.js'
import { getLightQueue } from '../../queue/index.js'
import { AuditService } from '../../audit/audit.service.js'
import { SubscriptionEntity } from '../../../domain/entities/billing/subscription.entity.js'
import {
  ActivateSubscriptionSchema,
} from './billing.schemas.js'
import {
  PRICE_PER_USER_PER_MONTH_VND,
} from '../../../shared/constants/billing.constants.js'

export class ActivateSubscriptionUseCase {
  async execute(rawInput: unknown): Promise<{ expiresAt: Date; amountVnd: string }> {
    // 1. Validate input (shape + types)
    const input = ActivateSubscriptionSchema.parse(rawInput)

    // 2. Server-side tính lại amountVnd — KHÔNG trust client
    const expectedAmount = BigInt(input.paidUsers) * BigInt(input.paidMonths) * PRICE_PER_USER_PER_MONTH_VND['PRO']

    // 3. Validate tenant tồn tại
    const tenant = await db.system().tenant.findUnique({
      where:  { id: input.tenantId },
      select: { id: true, name: true },
    })
    if (!tenant) throw new Error(`Tenant không tồn tại: ${input.tenantId}`)

    const activatedAt = new Date()
    let newExpiry!: Date
    let periodStart!: Date

    // 4. Transaction với SELECT FOR UPDATE — chống race condition
    await db.system().$transaction(async (tx: any) => {
      // Lock row trước khi đọc
      const rows = await tx.$queryRaw<Array<{
        id: string | null
        plan: string
        paidUsers: number
        activeUsers: number
        expiresAt: Date | null
        gracePeriodDays: number
        autoDowngrade: boolean
      }>>`
        SELECT id, plan, paid_users, active_users, expires_at, grace_period_days, auto_downgrade
        FROM tenant_subscriptions
        WHERE tenant_id = ${input.tenantId}
        FOR UPDATE
      `

      const current = rows[0] ?? null

      const entity = current
        ? new SubscriptionEntity({
            tenantId:        input.tenantId,
            plan:            current.plan as any,
            paidUsers:       current.paidUsers,
            activeUsers:     current.activeUsers,
            expiresAt:       current.expiresAt,
            gracePeriodDays: current.gracePeriodDays,
            autoDowngrade:   current.autoDowngrade,
          })
        : new SubscriptionEntity({
            tenantId:        input.tenantId,
            plan:            'FREE',
            paidUsers:       0,
            activeUsers:     0,
            expiresAt:       null,
            gracePeriodDays: 3,
            autoDowngrade:   true,
          })

      newExpiry   = entity.calculateNewExpiry(input.paidMonths, activatedAt)
      periodStart = entity.isActive && entity.props.expiresAt
        ? entity.props.expiresAt
        : activatedAt

      // Upsert subscription
      await tx.tenantSubscription.upsert({
        where:  { tenantId: input.tenantId },
        update: {
          plan:         'PRO',
          paidUsers:    input.paidUsers,
          expiresAt:    newExpiry,
          autoDowngrade: true,
          updatedAt:    activatedAt,
        },
        create: {
          tenantId:       input.tenantId,
          plan:           'PRO',
          paidUsers:      input.paidUsers,
          activeUsers:    0,
          expiresAt:      newExpiry,
          gracePeriodDays: 3,
          autoDowngrade:  true,
        },
      })

      // Tạo payment record (paymentRef unique → DB sẽ throw nếu duplicate)
      await tx.billingPayment.create({
        data: {
          tenantId:    input.tenantId,
          paidUsers:   input.paidUsers,
          paidMonths:  input.paidMonths,
          amountVnd:   expectedAmount,  // tính server-side
          status:      'ACTIVE',
          paymentRef:  input.paymentRef,
          paidAt:      input.paidAt,
          activatedAt,
          activatedBy: input.activatedBy,
          note:        input.note,
          periodStart,
          periodEnd:   newExpiry,
        },
      })
    })

    // 5. Invalidate Redis cache — PHẢI làm sau transaction
    if (redisClient) {
      await redisClient.del(`sub:${input.tenantId}`)
    }

    // 6. AuditLog — kèm traceId
    const span    = trace.getActiveSpan()
    const traceId = span?.spanContext().traceId ?? ''
    await AuditService.log({
      action:   'BILLING_SUBSCRIPTION_ACTIVATED',
      tenantId: input.tenantId,
      userId:   input.activatedBy,
      resource: 'billing',
      status:   'SUCCESS',
      payload: {
        paidUsers:    input.paidUsers,
        paidMonths:   input.paidMonths,
        amountVnd:    expectedAmount.toString(),
        newExpiry:    newExpiry.toISOString(),
        paymentRef:   input.paymentRef,
        periodStart:  periodStart.toISOString(),
      },
      traceId,
    })

    // 7. Notification qua Light Queue
    const lightQueue = getLightQueue()
    if (lightQueue) {
      await lightQueue.add('billing-notification', {
        type:     'SUBSCRIPTION_ACTIVATED',
        tenantId: input.tenantId,
        data: {
          tenantName:  tenant.name,
          paidUsers:   input.paidUsers,
          paidMonths:  input.paidMonths,
          amountVnd:   expectedAmount.toString(),
          expiresAt:   newExpiry.toISOString(),
          paymentRef:  input.paymentRef,
        },
      })
    }

    return {
      expiresAt: newExpiry,
      amountVnd: expectedAmount.toString(),
    }
  }
}
