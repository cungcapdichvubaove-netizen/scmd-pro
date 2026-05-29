export const VIOLATION_EVENT_CANONICAL_STATUSES = [
  'PENDING_REVIEW',
  'CONFIRMED',
  'DISPUTED',
  'WAIVED',
  'PENALIZED',
  'CLOSED',
] as const;

export const VIOLATION_EVENT_REVIEWABLE_STATUSES = [
  'PENDING_REVIEW',
] as const;

export const VIOLATION_EVENT_SCORED_STATUSES = [
  'CONFIRMED',
  'PENALIZED',
  'CLOSED',
] as const;

export const VIOLATION_EVENT_PENALTY_STATUSES = [
  'PENALIZED',
] as const;

export const VIOLATION_EVENT_DISPUTED_STATUSES = [
  'DISPUTED',
] as const;

export const VIOLATION_EVENT_WAIVED_STATUSES = [
  'WAIVED',
] as const;

export const VIOLATION_EVENT_LEGACY_PENDING_STATUSES = [
  'OPEN',
  'PENDING',
] as const;

export function normalizeViolationEventStatus(status?: string | null) {
  const normalized = String(status || '').toUpperCase();

  if (VIOLATION_EVENT_LEGACY_PENDING_STATUSES.includes(normalized as typeof VIOLATION_EVENT_LEGACY_PENDING_STATUSES[number])) {
    return 'PENDING_REVIEW';
  }

  return normalized;
}
