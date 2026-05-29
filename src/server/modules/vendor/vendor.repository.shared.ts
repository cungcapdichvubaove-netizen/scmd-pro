import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/domain.error.js';
import { SecurityContext } from '../../core/architecture/types.js';

export const ACTIVE_CONTRACT_STATUS = 'ACTIVE';
export const SHIFT_VIOLATION_SOURCE = 'SHIFT_SCHEDULE';
export const SHIFT_SHORTAGE_VIOLATION = 'SHIFT_UNDERSTAFFED';

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function clampCursorLimit(limit: number, max: number = 100): number {
  return Math.min(limit, max);
}

export function toCursorPage<T extends { id: string }>(rows: T[], take: number): CursorPage<T> {
  const hasMore = rows.length > take;
  const data = hasMore ? rows.slice(0, take) : rows;
  const lastItem = data.length > 0 ? data[data.length - 1] : null;

  return {
    data,
    nextCursor: hasMore && lastItem ? lastItem.id : null,
    hasMore,
  };
}

export function buildScopedContractWhere(ctx: SecurityContext, where: Record<string, unknown> = {}) {
  const scopedWhere: Record<string, unknown> = {
    ...where,
    ...(ctx.assignedVendorId ? { vendorId: ctx.assignedVendorId } : {}),
    ...(ctx.assignedSiteId ? { siteId: ctx.assignedSiteId } : {}),
  };

  if (ctx.assignedContractId) {
    scopedWhere.id = ctx.assignedContractId;
  }

  return scopedWhere;
}

export function throwVendorNotFound(): never {
  throw new NotFoundError('VENDOR_NOT_FOUND');
}

export function throwSiteNotFound(): never {
  throw new NotFoundError('SITE_NOT_FOUND');
}

export function throwGuardPostNotFound(): never {
  throw new NotFoundError('GUARD_POST_NOT_FOUND');
}

export function throwContractNotFound(): never {
  throw new NotFoundError('CONTRACT_NOT_FOUND');
}

export function throwContractVersionNotFound(): never {
  throw new NotFoundError('CONTRACT_VERSION_NOT_FOUND');
}

export function throwConflict(message: string): never {
  throw new ConflictError(message);
}

export function throwBadRequest(message: string): never {
  throw new BadRequestError(message);
}
