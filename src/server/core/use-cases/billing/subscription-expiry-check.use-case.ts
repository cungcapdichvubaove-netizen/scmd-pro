import { db } from '../../db/prisma.js'
import { redisClient } from '../../redis.js'
import { getLightQueue } from '../../queue/index.js'
import { AuditService } from '../../audit/audit.service.js'
import { EXPIRY_WARNING_DAYS, GRACE_PERIOD_DAYS } from '../../../shared/constants/billing.constants.js'

export class SubscriptionExpiryCheckUseCase {
  async execute(traceId: string): Promise<{ expired: number; warned: number }> {
    const now = new Date()

    // --- 1. Downgrade các subscription đã hết hạn (kể cả hết grace period) ---
    // Grace period = expiresAt + gracePeriodDays ngày
    const expiredSubs = await db.system().tenantSubscription.findMany({
      where: {
        plan:          { not: 'FREE' },
        autoDowngrade: true,
        expiresAt: {
          // Downgrade khi: expiresAt + gracePeriodDays < now
          lt: new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      select: { tenantId: true, expiresAt: true, gracePeriodDays: true },
    })

    let expiredCount = 0
    for (const sub of expiredSubs) {
      // Double-check với gracePeriodDays riêng của từng tenant
      const graceEnd = new Date(sub.expiresAt!)
      graceEnd.setDate(graceEnd.getDate() + (sub.gracePeriodDays ?? GRACE_PERIOD_DAYS))
      if (graceEnd > now) continue // chưa hết grace period → bỏ qua

      await db.system().$transaction(async (tx: any) => {
        await tx.tenantSubscription.update({
          where: { tenantId: sub.tenantId },
          data:  { plan: 'FREE', paidUsers: 0, expiresAt: null },
        })
        await tx.billingPayment.updateMany({
          where: { tenantId: sub.tenantId, status: 'ACTIVE' },
          data:  { status: 'EXPIRED' },
        })
      })

      // Invalidate cache
      if (redisClient) {
        await redisClient.del(`sub:${sub.tenantId}`)
      }

      await AuditService.log({
        action:   'BILLING_AUTO_DOWNGRADED',
        tenantId: sub.tenantId,
        userId:   'SYSTEM',
        resource: 'billing',
        status:   'SUCCESS',
        payload: { reason: 'grace_period_exceeded', downgradedAt: now.toISOString() },
        traceId,
      })

      const lightQueue = getLightQueue()
      if (lightQueue) {
        await lightQueue.add('billing-notification', {
          type:     'SUBSCRIPTION_EXPIRED',
          tenantId: sub.tenantId,
        })
      }
      expiredCount++
    }

    // --- 2. Cảnh báo sắp hết hạn (7 ngày và 3 ngày) ---
    let warnCount = 0
    const lightQueue = getLightQueue()
    if (lightQueue) {
      for (const daysAhead of EXPIRY_WARNING_DAYS) {
        const windowStart = new Date(now.getTime() + (daysAhead - 0.5) * 24 * 60 * 60 * 1000)
        const windowEnd   = new Date(now.getTime() + (daysAhead + 0.5) * 24 * 60 * 60 * 1000)

        const warningSubs = await db.system().tenantSubscription.findMany({
          where: {
            plan:      { not: 'FREE' },
            expiresAt: { gt: windowStart, lt: windowEnd },
          },
          select: { tenantId: true, expiresAt: true },
        })

        for (const sub of warningSubs) {
          await lightQueue.add('billing-notification', {
            type:     'SUBSCRIPTION_EXPIRING_SOON',
            tenantId: sub.tenantId,
            data:     { daysLeft: daysAhead, expiresAt: sub.expiresAt?.toISOString() },
          })
          warnCount++
        }
      }
    }

    return { expired: expiredCount, warned: warnCount }
  }
}
