import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { ReportController } from './report.controller.js';
import { ConflictError } from '../../core/errors/domain.error.js';

const executeMock = vi.fn();
const resolveMock = vi.fn();
const parseMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock('../../core/context/index.js', () => ({
  RequestContextResolver: {
    resolve: (...args: unknown[]) => resolveMock(...args),
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock('./application/queue-monthly-acceptance-export.usecase.js', () => ({
  QueueMonthlyAcceptanceExportUseCase: vi.fn().mockImplementation(() => ({
    execute: (...args: unknown[]) => executeMock(...args),
  })),
}));

vi.mock('./report.schema.js', async () => {
  const actual = await vi.importActual<typeof import('./report.schema.js')>('./report.schema.js');
  return {
    ...actual,
    exportMonthlyAcceptanceReportSchema: {
      parse: (...args: unknown[]) => parseMock(...args),
    },
  };
});

describe('ReportController.queueMonthlyAcceptanceExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveMock.mockReturnValue({ tenantId: 'tenant-1', userId: 'user-1', role: 'tenant-admin' });
    parseMock.mockImplementation((payload: unknown) => payload);
  });

  it('forward domain error cho global error handler thay vi nuot thanh 500 tai controller', async () => {
    const req = {
      params: { id: 'report-1' },
      body: { format: 'pdf' },
    } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    const domainError = new ConflictError('REPORT_EXPORT_REQUIRES_FINALIZED_STATUS');

    executeMock.mockRejectedValue(domainError);

    await ReportController.queueMonthlyAcceptanceExport(req, res, next);

    expect(next).toHaveBeenCalledWith(domainError);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(loggerErrorMock).toHaveBeenCalled();
  });
});
