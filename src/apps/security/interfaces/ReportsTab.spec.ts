import { describe, expect, it } from 'vitest';
import {
  MONTHLY_ACCEPTANCE_EXPORT_BLOCKED_MESSAGE,
  isFinalizedMonthlyAcceptanceReport,
  isMonthlyAcceptanceExportBlockedError,
} from './ReportsTab';

describe('monthly acceptance export UI guards', () => {
  it('chi cho phep export khi report da FINALIZED', () => {
    expect(isFinalizedMonthlyAcceptanceReport('FINALIZED')).toBe(true);
    expect(isFinalizedMonthlyAcceptanceReport('finalized')).toBe(true);
    expect(isFinalizedMonthlyAcceptanceReport('DRAFT')).toBe(false);
    expect(isFinalizedMonthlyAcceptanceReport('SUPERSEDED')).toBe(false);
  });

  it('nhan dien dung domain error contract cho export report chua finalized', () => {
    expect(isMonthlyAcceptanceExportBlockedError({
      message: 'REPORT_EXPORT_REQUIRES_FINALIZED_STATUS',
      status: 409,
    })).toBe(true);

    expect(isMonthlyAcceptanceExportBlockedError({
      message: 'REPORT_EXPORT_REQUIRES_FINALIZED_STATUS',
      status: 500,
    })).toBe(false);

    expect(isMonthlyAcceptanceExportBlockedError({
      message: 'INTERNAL_SERVER_ERROR',
      status: 409,
    })).toBe(false);
  });

  it('giu thong diep UX ro rang cho export bi chan', () => {
    expect(MONTHLY_ACCEPTANCE_EXPORT_BLOCKED_MESSAGE).toContain('FINALIZED');
    expect(MONTHLY_ACCEPTANCE_EXPORT_BLOCKED_MESSAGE).toContain('chốt');
  });
});
