import { z } from 'zod';
import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';
import { assertVendorActorValueInScope, requireVendorActorScope } from '../../../shared/security/vendor-actor-scope.js';

const createAssignmentSchema = z.object({
  routeId: z.string().min(1),
  staffId: z.string().min(1),
  shiftScheduleId: z.string().optional(),
  contractId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  assignmentDate: z.string().optional(),
  plannedStartAt: z.string().datetime().optional(),
  plannedEndAt: z.string().datetime().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export class CreatePatrolAssignmentUseCase extends BaseUseCase<unknown, any> {
  protected override async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN, UserRole.VENDOR_COMMANDER];
    if (!allowedRoles.includes(context.role)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected override async validate(request: unknown): Promise<void> {
    createAssignmentSchema.parse(request);
  }

  protected override async internalExecute(context: SecurityContext, payload: unknown): Promise<any> {
    const data = createAssignmentSchema.parse(payload);
    if (context.role === UserRole.VENDOR_COMMANDER) {
      requireVendorActorScope(context);
      assertVendorActorValueInScope(context, {
        vendorId: data.vendorId ?? null,
        contractId: data.contractId ?? null,
      });
    }

    const route = await db.forTenant(context.tenantId, { readOnly: true }).patrolRoute.findUnique({
      where: { id: data.routeId },
      select: { id: true, status: true, contractId: true, vendorId: true, siteId: true },
    });
    if (!route) throw new Error('PATROL_ROUTE_NOT_FOUND');
    if (route.status !== 'ACTIVE') throw new Error('PATROL_ASSIGNMENT_REQUIRES_ACTIVE_ROUTE');

    const staff = await db.forTenant(context.tenantId, { readOnly: true }).staff.findUnique({
      where: { id: data.staffId },
      select: { id: true, fullName: true, status: true, assignedVendorId: true, assignedSiteId: true, assignedContractId: true },
    });
    if (!staff) throw new Error('STAFF_NOT_FOUND');
    if (staff.status !== 'active' && staff.status !== 'ACTIVE') throw new Error('STAFF_INACTIVE');

    const contractId = data.contractId || route.contractId;
    const vendorId = data.vendorId || route.vendorId;
    if (context.role === UserRole.VENDOR_COMMANDER) {
      assertVendorActorValueInScope(context, {
        vendorId,
        siteId: route.siteId ?? null,
        contractId,
      });
      if (staff.assignedVendorId && staff.assignedVendorId !== context.assignedVendorId) {
        throw new Error('STAFF_VENDOR_SCOPE_MISMATCH');
      }
      if (context.assignedSiteId && staff.assignedSiteId && staff.assignedSiteId !== context.assignedSiteId) {
        throw new Error('STAFF_SITE_SCOPE_MISMATCH');
      }
      if (context.assignedContractId && staff.assignedContractId && staff.assignedContractId !== context.assignedContractId) {
        throw new Error('STAFF_CONTRACT_SCOPE_MISMATCH');
      }
    }

    if (contractId) {
      const contract = await db.forTenant(context.tenantId, { readOnly: true }).contract.findFirst({
        where: { id: contractId },
        select: { id: true, status: true, vendorId: true },
      });
      if (!contract) throw new Error('CONTRACT_NOT_FOUND');
      if (contract.status !== 'ACTIVE') throw new Error('PATROL_ASSIGNMENT_REQUIRES_ACTIVE_CONTRACT');
      if (vendorId && contract.vendorId !== vendorId) throw new Error('CONTRACT_VENDOR_MISMATCH');
    }

    if (data.shiftScheduleId) {
      const shift = await db.forTenant(context.tenantId, { readOnly: true }).shiftSchedule.findFirst({
        where: { id: data.shiftScheduleId },
        select: { id: true, contractId: true },
      });
      if (!shift) throw new Error('SHIFT_SCHEDULE_NOT_FOUND');
      if (contractId && shift.contractId !== contractId) throw new Error('SHIFT_CONTRACT_MISMATCH');
    }

    const assignment = await db.forTenant(context.tenantId).patrolAssignment.create({
      data: {
        routeId: data.routeId,
        staffId: data.staffId,
        shiftScheduleId: data.shiftScheduleId || null,
        contractId: contractId || null,
        vendorId: vendorId || null,
        assignmentDate: data.assignmentDate || null,
        startAt: data.plannedStartAt || data.startAt ? new Date((data.plannedStartAt || data.startAt) as string) : null,
        endAt: data.plannedEndAt || data.endAt ? new Date((data.plannedEndAt || data.endAt) as string) : null,
        assignedBy: context.userId,
        metadata: data.metadata || {},
      },
      include: {
        route: { select: { id: true, name: true } },
        staff: { select: { id: true, fullName: true, username: true } },
      },
    });

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'CREATE_PATROL_ASSIGNMENT',
      resource: `patrol-assignment/${assignment.id}`,
      status: 'SUCCESS',
      payload: { routeId: data.routeId, staffId: data.staffId, contractId, vendorId },
    });

    return assignment;
  }
}
