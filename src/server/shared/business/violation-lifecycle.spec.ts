import { describe, expect, it } from 'vitest';
import {
  VIOLATION_EVENT_CANONICAL_STATUSES,
  normalizeViolationEventStatus,
} from './violation-lifecycle.js';

describe('violation lifecycle policy', () => {
  it('khong coi OPEN/PENDING la status canonical cho ViolationEvent moi', () => {
    expect(VIOLATION_EVENT_CANONICAL_STATUSES).not.toContain('OPEN' as any);
    expect(VIOLATION_EVENT_CANONICAL_STATUSES).not.toContain('PENDING' as any);
    expect(VIOLATION_EVENT_CANONICAL_STATUSES[0]).toBe('PENDING_REVIEW');
  });

  it('normalize legacy OPEN/PENDING ve PENDING_REVIEW de bao ve report pipeline', () => {
    expect(normalizeViolationEventStatus('OPEN')).toBe('PENDING_REVIEW');
    expect(normalizeViolationEventStatus('PENDING')).toBe('PENDING_REVIEW');
    expect(normalizeViolationEventStatus('confirmed')).toBe('CONFIRMED');
  });
});
