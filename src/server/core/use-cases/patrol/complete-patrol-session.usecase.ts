import { BaseUseCase } from '../../architecture/usecase.js';
import { SecurityContext, UserRole } from '../../architecture/types.js';
import { db } from '../../db/prisma.js';
import { AuditService } from '../../audit/audit.service.js';
import { EventBus } from '../../events/event-bus.js';
import { PatrolComplianceCalculator } from '../../../modules/patrol/patrol-compliance.calculator.js';

type ComplianceResult = ReturnType<typeof PatrolComplianceCalculator.calculate>;

function resolvePatrolStatus(session: any, compliance: ComplianceResult) {
  const target = session.route.requiredCompletionPercent || 100;
  const hasCriticalFraud = compliance.gpsViolationCount > 0;
  if (hasCriticalFraud) return 'INVALID';
  if (compliance.completionPercent >= target && compliance.missedCheckpointIds.length === 0) return 'COMPLETED';
  if (compliance.completionPercent > 0) return 'PARTIAL';
  return 'MISSED';
}

export class CompletePatrolSessionUseCase extends BaseUseCase<string, any> {
  protected async authorize(context: SecurityContext): Promise<void> {
    const allowedRoles = [UserRole.GUARD, UserRole.SUPERVISOR, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(context.role)) {
      throw new Error('UNAUTHORIZED_ACTION');
    }
  }

  protected async internalExecute(context: SecurityContext, sessionId: string): Promise<any> {
    const session = await db.forTenant(context.tenantId, { readOnly: true }).patrolSession.findUnique({
      where: { id: sessionId },
      include: {
        route: { include: { checkpoints: { orderBy: { sequence: 'asc' } } } },
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new Error('PATROL_SESSION_NOT_FOUND');
    if (context.role === UserRole.GUARD && session.staffId !== context.userId) throw new Error('UNAUTHORIZED_ACTION');
    if (['COMPLETED', 'CANCELLED', 'MISSED', 'INVALID'].includes(session.status)) throw new Error('PATROL_SESSION_ALREADY_CLOSED');

    const completedAt = new Date();
    const compliance = PatrolComplianceCalculator.calculate({
      startedAt: session.startedAt,
      completedAt,
      route: session.route,
      logs: session.logs,
    });

    const exceptionSummary = {
      missedCheckpointIds: compliance.missedCheckpointIds,
      lateCheckpointIds: compliance.lateCheckpointIds,
      outOfOrderCount: compliance.outOfOrderCount,
      gpsViolationCount: compliance.gpsViolationCount,
      evidenceMissingCount: compliance.evidenceMissingCount,
      recommendation: compliance.recommendation,
      violationTypes: compliance.violationTypes,
      requiredCompletionTarget: session.route.requiredCompletionPercent || 100,
    };

    const status = resolvePatrolStatus(session, compliance);

    const updated = await db.withTenant(context.tenantId, async (tx: any) => {
      const result = await tx.patrolSession.update({
        where: { id: sessionId },
        data: {
          status,
          completedAt,
          expectedCheckpointCount: session.route.checkpoints.filter((cp: any) => cp.isRequired).length,
          scannedCheckpointCount: new Set(session.logs.map((log: any) => log.routeCheckpointId).filter(Boolean)).size,
          completionPercent: compliance.completionPercent,
          missedCheckpointCount: compliance.missedCheckpointIds.length,
          lateCheckpointCount: compliance.lateCheckpointIds.length,
          outOfOrderCount: compliance.outOfOrderCount,
          gpsViolationCount: compliance.gpsViolationCount,
          evidenceMissingCount: compliance.evidenceMissingCount,
          complianceScore: compliance.complianceScore,
          exceptionSummary,
        },
      });

      await EventBus.dispatch({
        type: 'PATROL_SESSION_COMPLETED',
        version: '1.0',
        tenantId: context.tenantId,
        actorId: context.userId,
        payload: {
          sessionId,
          status,
          complianceScore: compliance.complianceScore,
          completionPercent: compliance.completionPercent,
          shouldCreateViolation: compliance.shouldCreateViolation,
          violationTypes: compliance.violationTypes,
        },
      }, tx);

      return result;
    });

    if (session.patrolAssignmentId) {
      await db.forTenant(context.tenantId).patrolAssignment.update({
        where: { id: session.patrolAssignmentId },
        data: { status: status === 'COMPLETED' ? 'COMPLETED' : 'MISSED' },
      });
    }

    await AuditService.log({
      userId: context.userId,
      tenantId: context.tenantId,
      action: 'COMPLETE_PATROL_SESSION',
      resource: `patrol-session/${sessionId}`,
      status: 'SUCCESS',
      payload: { complianceScore: compliance.complianceScore, completionPercent: compliance.completionPercent, exceptionSummary, status },
    });

    return updated;
  }

}
