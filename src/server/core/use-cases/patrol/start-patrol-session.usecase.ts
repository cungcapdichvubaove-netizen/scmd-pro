import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';
import { EventBus } from '../../events/event-bus.js';

const startPatrolSessionSchema = z.object({
  routeId: z.string().optional(),
  shiftSessionId: z.string().optional(),
  patrolAssignmentId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.routeId || data.patrolAssignmentId, {
  message: 'routeId or patrolAssignmentId is required',
});

export class StartPatrolSessionUseCase extends BaseUseCase<unknown, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.GUARD, UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected override async validate(request: unknown): Promise<void> {
    startPatrolSessionSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, payload: unknown): Promise<any> {
    const data = startPatrolSessionSchema.parse(payload);
    let routeId = data.routeId || null;
    let staffId = context.userId;
    let assignment: any = null;

    if (data.patrolAssignmentId) {
      assignment = await db.forTenant(context.tenantId, { readOnly: true }).patrolAssignment.findUnique({
        where: { id: data.patrolAssignmentId },
      });
      if (!assignment) throw new Error('PATROL_ASSIGNMENT_NOT_FOUND');
      if (context.role === UserRole.GUARD && assignment.staffId !== context.userId) throw new Error('UNAUTHORIZED_ACTION');
      if (!['PLANNED', 'ACTIVE'].includes(assignment.status)) throw new Error('PATROL_ASSIGNMENT_NOT_STARTABLE');
      routeId = assignment.routeId;
      staffId = assignment.staffId;
    }

    if (!routeId) throw new Error('PATROL_ROUTE_REQUIRED');

    const route = await db.forTenant(context.tenantId, { readOnly: true }).patrolRoute.findUnique({
      where: { id: routeId },
      include: { checkpoints: true },
    });
    if (!route) throw new Error('PATROL_ROUTE_NOT_FOUND');
    if (route.status !== 'ACTIVE') throw new Error('PATROL_SESSION_REQUIRES_ACTIVE_ROUTE');

    const shiftSessionId = data.shiftSessionId || (await db.forTenant(context.tenantId, { readOnly: true }).shiftSession.findFirst({
      where: { staffId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    }))?.id || null;

    const session = await db.forTenant(context.tenantId).patrolSession.create({
      data: {
        routeId,
        staffId,
        vendorId: assignment?.vendorId || route.vendorId || null,
        contractId: assignment?.contractId || route.contractId || null,
        siteId: route.siteId || null,
        shiftSessionId,
        patrolAssignmentId: data.patrolAssignmentId || null,
        expectedCheckpointCount: route.checkpoints.filter((cp: any) => cp.isRequired).length,
        metadata: data.metadata || {},
      },
      include: {
        route: {
          include: {
            checkpoints: {
              orderBy: { sequence: 'asc' },
              include: { checkpoint: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (data.patrolAssignmentId) {
      await db.forTenant(context.tenantId).patrolAssignment.update({
        where: { id: data.patrolAssignmentId },
        data: { status: 'ACTIVE' },
      });
    }

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'START_PATROL_SESSION',
      resource: `patrol-session/${session.id}`,
      status: 'SUCCESS',
      payload: { routeId, staffId, patrolAssignmentId: data.patrolAssignmentId || null },
    });

    await db.withTenant(context.tenantId, async (tx: any) => {
      await EventBus.dispatch({
        type: 'PATROL_SESSION_STARTED',
        version: '1.0',
        tenantId: context.tenantId,
        actorId: context.userId,
        payload: { sessionId: session.id, routeId, staffId, patrolAssignmentId: data.patrolAssignmentId || null },
      }, tx);
    });

    return session;
  }
}
