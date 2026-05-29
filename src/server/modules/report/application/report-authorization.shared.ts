import { SecurityContext, UserRole } from '../../../core/architecture/types.js';

const CLIENT_DISPUTE_DECISION_ROLES = new Set<UserRole>([
  UserRole.TENANT_ADMIN,
  UserRole.SUPER_ADMIN,
]);

export function assertClientDisputeDecisionAuthority(ctx: SecurityContext) {
  if (!CLIENT_DISPUTE_DECISION_ROLES.has(ctx.role)) {
    throw new Error('CLIENT_DISPUTE_DECISION_FORBIDDEN');
  }
}
