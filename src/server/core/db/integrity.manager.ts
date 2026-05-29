import { db } from './prisma.js';
import { logger } from '../logger/index.js';

export class IntegrityGuard {
  /**
   * Check if a tenant has reached their employee limit.
   *
   * FIX [RLS-500]: db.system() chỉ trả Prisma client thuần — KHÔNG set session variable
   * app.current_tenant_id. Bảng "tenants" có RLS policy:
   *   USING (current_setting('app.current_tenant_id', true) = 'SYSTEM')
   * → db.system() query sẽ bị RLS block → Prisma throw → HTTP 500.
   *
   * Giải pháp: dùng db.withTenant('SYSTEM') — luôn chạy trong transaction và
   * thực thi SET LOCAL app.current_tenant_id = 'SYSTEM' trước mọi query,
   * đúng theo pattern đã dùng ở auth.middleware.ts và superadmin services.
   */
  static async checkStaffQuota(tenantId: string): Promise<void> {
    let tenant: {
      maxEmployees: number;
      paidUsers: number;
      plan: string;
      _count: { staff: number };
    } | null = null;

    await db.withTenant('SYSTEM', async (tx) => {
      tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { maxEmployees: true, paidUsers: true, plan: true, _count: { select: { staff: true } } }
      });
    }, { readOnly: true });

    if (!tenant) throw new Error('TENANT_NOT_FOUND');

    const limit = (tenant as any).plan === 'FREE'
      ? (tenant as any).maxEmployees
      : ((tenant as any).paidUsers > 0 ? (tenant as any).paidUsers : (tenant as any).maxEmployees);

    if ((tenant as any)._count.staff >= limit) {
      logger.warn({ tenantId, max: limit, current: (tenant as any)._count.staff }, 'Quota exceeded: staff');
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