import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, type SecurityContext } from '../../../core/architecture/types.js';

const {
  createMonthlyComplianceRevisionMock,
  finalizeMonthlyComplianceReportMock,
  generateMonthlyComplianceSnapshotMock,
  withTenantMock,
} = vi.hoisted(() => ({
  createMonthlyComplianceRevisionMock: vi.fn(),
  finalizeMonthlyComplianceReportMock: vi.fn(),
  generateMonthlyComplianceSnapshotMock: vi.fn(),
  withTenantMock: vi.fn(),
}));

vi.mock('./monthly-compliance.shared.js', () => ({
  createMonthlyComplianceRevision: createMonthlyComplianceRevisionMock,
  finalizeMonthlyComplianceReport: finalizeMonthlyComplianceReportMock,
  generateMonthlyComplianceSnapshot: generateMonthlyComplianceSnapshotMock,
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    withTenant: withTenantMock,
  },
}));

import { CreateMonthlyAcceptanceRevisionUseCase } from './create-monthly-acceptance-revision.usecase.js';
import { FinalizeMonthlyAcceptanceReportUseCase } from './finalize-monthly-acceptance-report.usecase.js';
import { ResolveViolationDisputeUseCase } from './resolve-violation-dispute.usecase.js';

function makeCtx(role: UserRole): SecurityContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    role,
  };
}

describe('report authorization boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMonthlyComplianceRevisionMock.mockReset();
    finalizeMonthlyComplianceReportMock.mockReset();
    generateMonthlyComplianceSnapshotMock.mockReset();
    withTenantMock.mockReset();
  });

  it('chi cho TENANT_ADMIN tao revision monthly acceptance', async () => {
    createMonthlyComplianceRevisionMock.mockResolvedValue({ id: 'report-2' });

    const useCase = new CreateMonthlyAcceptanceRevisionUseCase();
    const result = await useCase.execute(makeCtx(UserRole.TENANT_ADMIN), {
      reportId: 'report-1',
      notes: 'Need correction',
    });

    expect(result).toEqual({ id: 'report-2' });
    expect(createMonthlyComplianceRevisionMock).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-1',
      notes: 'Need correction',
    });
  });

  it('chi cho SUPER_ADMIN finalize monthly acceptance report', async () => {
    finalizeMonthlyComplianceReportMock.mockResolvedValue({ id: 'report-1', status: 'FINALIZED' });

    const useCase = new FinalizeMonthlyAcceptanceReportUseCase();
    const result = await useCase.execute(makeCtx(UserRole.SUPER_ADMIN), {
      reportId: 'report-1',
      notes: 'approved',
    });

    expect(result).toEqual({ id: 'report-1', status: 'FINALIZED' });
    expect(finalizeMonthlyComplianceReportMock).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reportId: 'report-1',
      actorId: 'user-1',
      notes: 'approved',
    });
  });

  it.each([
    UserRole.GUARD,
    UserRole.SUPERVISOR,
    UserRole.TECHNICIAN,
    UserRole.VENDOR_COMMANDER,
    UserRole.VENDOR_REPRESENTATIVE,
  ])('tu choi role %s khi tao revision report', async (role) => {
    const useCase = new CreateMonthlyAcceptanceRevisionUseCase();

    await expect(useCase.execute(makeCtx(role), {
      reportId: 'report-1',
      notes: null,
    })).rejects.toThrow('CLIENT_DISPUTE_DECISION_FORBIDDEN');

    expect(createMonthlyComplianceRevisionMock).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.GUARD,
    UserRole.SUPERVISOR,
    UserRole.TECHNICIAN,
    UserRole.VENDOR_COMMANDER,
    UserRole.VENDOR_REPRESENTATIVE,
  ])('tu choi role %s khi finalize report', async (role) => {
    const useCase = new FinalizeMonthlyAcceptanceReportUseCase();

    await expect(useCase.execute(makeCtx(role), {
      reportId: 'report-1',
      notes: null,
    })).rejects.toThrow('CLIENT_DISPUTE_DECISION_FORBIDDEN');

    expect(finalizeMonthlyComplianceReportMock).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.GUARD,
    UserRole.SUPERVISOR,
    UserRole.TECHNICIAN,
    UserRole.VENDOR_COMMANDER,
    UserRole.VENDOR_REPRESENTATIVE,
  ])('tu choi role %s khi resolve dispute', async (role) => {
    const useCase = new ResolveViolationDisputeUseCase();

    await expect(useCase.execute(makeCtx(role), 'dispute-1', {
      resolution: 'WAIVED',
      responseNote: 'not allowed',
    })).rejects.toThrow('CLIENT_DISPUTE_DECISION_FORBIDDEN');

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(generateMonthlyComplianceSnapshotMock).not.toHaveBeenCalled();
  });
});
