import type { Request, Response, NextFunction } from 'express'
import { trace } from '@opentelemetry/api'
import { db } from '../../../core/db/prisma.js'
import { ActivateSubscriptionUseCase } from '../../../core/use-cases/billing/activate-subscription.use-case.js'
import { ForceDowngradeUseCase } from '../../../core/use-cases/billing/force-downgrade.use-case.js'
import { ListBillingTenantsSchema } from '../../../core/use-cases/billing/billing.schemas.js'

export class BillingController {
  async listTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const input = ListBillingTenantsSchema.parse(req.query)
      const now   = new Date()
      const in7d  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const filterMap: Record<string, object> = {
        active:   { plan: { not: 'FREE' }, expiresAt: { gt: in7d } },
        expiring: { plan: { not: 'FREE' }, expiresAt: { gt: now, lte: in7d } },
        expired:  { OR: [{ plan: 'FREE' }, { expiresAt: { lt: now } }] },
        free:     { plan: 'FREE' },
      }

      const subs = await db.system().tenantSubscription.findMany({
        take:    input.take + 1,
        cursor:  input.cursor ? { id: input.cursor } : undefined,
        where:   filterMap[input.status] ?? {},
        include: {
          tenant: { select: { name: true, subdomain: true, status: true } },
        },
        orderBy: { expiresAt: 'asc' },
      })

      const hasMore    = subs.length > input.take
      const items      = hasMore ? subs.slice(0, -1) : subs
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

      res.json({ items, nextCursor })
      return
    } catch (err) { 
      next(err) 
    }
  }

  async getTenantBilling(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.params.tenantId as string;
      const [sub, payments] = await Promise.all([
        db.system().tenantSubscription.findUnique({ where: { tenantId } }),
        db.system().billingPayment.findMany({
          where:   { tenantId },
          orderBy: { createdAt: 'desc' },
          take:    50,
        }),
      ])
      res.json({ subscription: sub, payments })
      return
    } catch (err) { 
      next(err) 
    }
  }

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await new ActivateSubscriptionUseCase().execute({
        ...req.body,
        activatedBy: (req as any).user!.id,
      })
      const span    = trace.getActiveSpan()
      const traceId = span?.spanContext().traceId ?? ''
      res.status(200).json({ success: true, ...result, traceId })
      return
    } catch (err) { 
      next(err) 
    }
  }

  async forceDowngrade(req: Request, res: Response, next: NextFunction) {
    try {
      await new ForceDowngradeUseCase().execute({
        ...req.body,
        tenantId: req.params.tenantId,
        actorId:  (req as any).user!.id,
      })
      const span    = trace.getActiveSpan()
      const traceId = span?.spanContext().traceId ?? ''
      res.status(200).json({ success: true, traceId })
      return
    } catch (err) { 
      next(err) 
    }
  }
}


