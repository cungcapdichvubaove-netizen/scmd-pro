import { db } from './prisma.js';
import { logger } from '../logger/index.js';

export class IntegrityGuard {
  /**
   * Check if a tenant has reached their employee limit.
   */
  static async checkStaffQuota(tenantId: string): Promise<void> {
    const tenant = await db.system({ readOnly: true }).tenant.findUnique({
      where: { id: tenantId },
      select: { maxEmployees: true, paidUsers: true, plan: true, _count: { select: { staff: true } } }
    });

    if (!tenant) throw new Error('TENANT_NOT_FOUND');

    const limit = tenant.plan === 'FREE' ? tenant.maxEmployees : (tenant.paidUsers > 0 ? tenant.paidUsers : tenant.maxEmployees);

    if (tenant._count.staff >= limit) {
      logger.warn({ tenantId, max: limit, current: tenant._count.staff }, 'Quota exceeded: staff');
      throw new Error('QUOTA_EXCEEDED: STAFF_LIMIT');
    }
  }

  /**
   * Ensure that an array of IDs exists within the same tenant.
   * Useful for validating reporters, assignees, items, etc.
   */
  static async ensureSameTenant(tenantId: string, modelName: string, ids: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(ids.filter(id => !!id)));
    if (uniqueIds.length === 0) return;

    const count = await (db.forTenant(tenantId) as any)[modelName].count({
      where: { id: { in: uniqueIds } }
    });

    if (count !== uniqueIds.length) {
      logger.error({ tenantId, modelName, expected: uniqueIds.length, actual: count }, 'Integrity Violation: Cross-tenant reference detected');
      throw new Error('INTEGRITY_VIOLATION: CROSS_TENANT_REFERENCE');
    }
  }

  /**
   * Validate state transition for models with state machines (e.g. Incident)
   */
  static validateStateTransition(allowedTransitions: Record<string, string[]>, current: string, next: string): void {
    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new Error(`INVALID_STATE_TRANSITION: ${current} -> ${next}`);
    }
  }
}
