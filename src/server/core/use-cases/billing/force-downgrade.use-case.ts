import { trace } from '@opentelemetry/api'
import { db } from '../../db/prisma.js'
import { redisClient } from '../../redis.js'
import { getLightQueue } from '../../queue/index.js'
import { AuditService } from '../../audit/audit.service.js'
import { ForceDowngradeSchema } from './billing.schemas.js'

export class ForceDowngradeUseCase {
  async execute(rawInput: unknown): Promise<void> {
    const input = ForceDowngradeSchema.parse(rawInput)

    const tenant = await db.system().tenant.findUnique({ where: { id: input.tenantId } })
    if (!tenant) throw new Error(`Tenant không tồn tại: ${input.tenantId}`)

    await db.system().$transaction(async (tx: any) => {
      await tx.tenantSubscription.update({
        where: { tenantId: input.tenantId },
        data:  { plan: 'FREE', paidUsers: 0, expiresAt: null },
      })
      await tx.billingPayment.updateMany({
        where: { tenantId: input.tenantId, status: 'ACTIVE' },
        data:  { status: 'CANCELLED' },
      })
    })

    if (redisClient) {
      await redisClient.del(`sub:${input.tenantId}`)
    }

    const span    = trace.getActiveSpan()
    const traceId = span?.spanContext().traceId ?? ''

    await AuditService.log({
      action:   'BILLING_FORCE_DOWNGRADED',
      tenantId: input.tenantId,
      userId:   input.actorId,
      resource: 'billing',
      status:   'SUCCESS',
      payload: { reason: input.reason },
      traceId,
    })

    const lightQueue = getLightQueue()
    if (lightQueue) {
      await lightQueue.add('billing-notification', {
        type:     'SUBSCRIPTION_FORCE_CANCELLED',
        tenantId: input.tenantId,
        data:     { reason: input.reason },
      })
    }
  }
}
