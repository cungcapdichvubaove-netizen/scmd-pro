import { SecurityContext, UserRole } from '../../core/architecture/types.js';

const VENDOR_SCOPED_ROLES = new Set<UserRole>([
  UserRole.VENDOR_COMMANDER,
  UserRole.VENDOR_REPRESENTATIVE,
]);

export function isVendorScopedRole(role: UserRole | string): boolean {
  return VENDOR_SCOPED_ROLES.has(role as UserRole);
}

export function requireVendorActorScope(context: SecurityContext): void {
  if (!isVendorScopedRole(context.role)) {
    return;
  }

  if (!context.assignedVendorId) {
    throw new Error('VENDOR_SCOPE_REQUIRED');
  }
}

export function applyVendorActorScope<T extends Record<string, unknown>>(context: SecurityContext, where: T): T {
  if (!isVendorScopedRole(context.role)) {
    return where;
  }

  requireVendorActorScope(context);

  return {
    ...where,
    vendorId: context.assignedVendorId,
    ...(context.assignedSiteId ? { siteId: context.assignedSiteId } : {}),
    ...(context.assignedContractId ? { contractId: context.assignedContractId } : {}),
  };
}

export function assertVendorActorValueInScope(
  context: SecurityContext,
  input: { vendorId?: string | null; siteId?: string | null; contractId?: string | null },
): void {
  if (!isVendorScopedRole(context.role)) {
    return;
  }

  requireVendorActorScope(context);

  if (input.vendorId && input.vendorId !== context.assignedVendorId) {
    throw new Error('VENDOR_SCOPE_MISMATCH');
  }

  if (context.assignedSiteId && input.siteId !== context.assignedSiteId) {
    throw new Error('SITE_SCOPE_MISMATCH');
  }

  if (context.assignedContractId && input.contractId !== context.assignedContractId) {
    throw new Error('CONTRACT_SCOPE_MISMATCH');
  }
}
