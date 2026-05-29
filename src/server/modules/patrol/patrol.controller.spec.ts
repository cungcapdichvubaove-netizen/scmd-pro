import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { PatrolController } from './patrol.controller.js';

const {
  resolveMock,
  addJobMock,
  scanExecuteMock,
  openShiftSessionMock,
  checkAttendanceMock,
  getMyAttendanceMock,
  getAttendanceMock,
  getAttendanceOpsSummaryMock,
} = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  addJobMock: vi.fn(),
  scanExecuteMock: vi.fn(),
  openShiftSessionMock: vi.fn(),
  checkAttendanceMock: vi.fn(),
  getMyAttendanceMock: vi.fn(),
  getAttendanceMock: vi.fn(),
  getAttendanceOpsSummaryMock: vi.fn(),
}));

vi.mock('../../core/context/index.js', () => ({
  RequestContextResolver: {
    resolve: resolveMock,
  },
}));

vi.mock('../../core/queue/index.js', () => ({
  QueueService: {
    addJob: addJobMock,
  },
}));

vi.mock('../../core/media/media.service.js', () => ({
  MediaService: {
    uploadImage: vi.fn(),
  },
}));

vi.mock('../../core/use-cases/patrol/queries/get-logs.query.js', () => ({
  GetLogsQuery: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/get-checkpoints.usecase.js', () => ({
  GetCheckpointsUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/scan-qr.usecase.js', () => ({
  ScanQRUseCase: class {
    execute = scanExecuteMock;
  },
}));

vi.mock('../../core/use-cases/patrol/create-checkpoint.usecase.js', () => ({
  CreateCheckpointUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/update-checkpoint.usecase.js', () => ({
  UpdateCheckpointUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/delete-checkpoint.usecase.js', () => ({
  DeleteCheckpointUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/complete-patrol.usecase.js', () => ({
  CompletePatrolUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('../../core/use-cases/patrol/analyze-log.usecase.js', () => ({
  AnalyzeLogUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock('./patrol.service.js', () => ({
  PatrolService: {
    openShiftSession: openShiftSessionMock,
    getRoutes: vi.fn(),
    createRoute: vi.fn(),
    createAssignment: vi.fn(),
    listAssignments: vi.fn(),
    startPatrolSession: vi.fn(),
    completePatrolSession: vi.fn(),
    listPatrolExceptions: vi.fn(),
    checkAttendance: checkAttendanceMock,
    getMyAttendance: getMyAttendanceMock,
    getAttendance: getAttendanceMock,
    getAttendanceOpsSummary: getAttendanceOpsSummaryMock,
  },
}));

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as Request;
}

function makeRes(): Response {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('PatrolController', () => {
  const ctx = {
    userId: 'guard-123',
    tenantId: 'tenant-1',
    role: 'guard',
  } as any;

  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    resolveMock.mockReturnValue(ctx);
    next = vi.fn();
  });

  describe('scanQR', () => {
    it('ghi đè staffId từ request bằng ctx.userId khi queue offline sync để chặn drift từ client payload', async () => {
      const req = makeReq({
        body: {
          checkpointId: 'checkpoint-1',
          qr_hash: 'hash-1',
          gpsLat: 10.123,
          gpsLng: 106.456,
          accuracyMeters: 12,
          staffId: 'forged-staff-id',
          _timestamp: '1710000000000',
        },
      });
      const res = makeRes();
      addJobMock.mockResolvedValue({ id: 'job-1' });

      await PatrolController.scanQR(req, res, next);

      expect(addJobMock).toHaveBeenCalledWith(
        'OFFLINE_SYNC_SCAN',
        expect.objectContaining({
          context: ctx,
          request: expect.objectContaining({
            checkpointId: 'checkpoint-1',
            staffId: 'guard-123',
            qr_hash: 'hash-1',
            location: { lat: 10.123, lon: 106.456, accuracy: 12 },
            _timestamp: 1710000000000,
          }),
        }),
        'sync_scan_guard-123_1710000000000',
      );
      expect(res.status).toHaveBeenCalledWith(202);
    });

    it('ghi đè staffId từ request bằng ctx.userId khi execute trực tiếp scan use case', async () => {
      const req = makeReq({
        body: {
          checkpointId: 'checkpoint-2',
          qr_hash: 'hash-2',
          location: { lat: 11.1, lon: 107.2 },
          staffId: 'forged-staff-id',
          patrolSessionId: 'session-1',
        },
      });
      const res = makeRes();
      scanExecuteMock.mockResolvedValue({ id: 'log-1' });

      await PatrolController.scanQR(req, res, next);

      expect(scanExecuteMock).toHaveBeenCalledWith(ctx, {
        checkpointId: 'checkpoint-2',
        staffId: 'guard-123',
        qr_hash: 'hash-2',
        location: { lat: 11.1, lon: 107.2 },
        patrolSessionId: 'session-1',
        scannedAt: undefined,
        photoEvidenceIds: undefined,
        note: undefined,
        _signature: undefined,
        _timestamp: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({ id: 'log-1' });
    });
  });

  describe('openShiftSession', () => {
    it('vẫn forward body staffId hợp lệ sang service để service/RBAC quyết định thay vì controller tự mutate mơ hồ', async () => {
      const req = makeReq({
        body: {
          staffId: 'staff-target-1',
          shiftScheduleId: 'shift-1',
          metadata: { source: 'dispatcher' },
        },
      });
      const res = makeRes();
      openShiftSessionMock.mockResolvedValue({ id: 'shift-session-1' });

      await PatrolController.openShiftSession(req, res, next);

      expect(openShiftSessionMock).toHaveBeenCalledWith(ctx, {
        staffId: 'staff-target-1',
        shiftScheduleId: 'shift-1',
        metadata: { source: 'dispatcher' },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'shift-session-1' });
    });
  });

  describe('attendance self contract', () => {
    it('trả attendance trong ngày của chính actor cho /tenant/attendance/me', async () => {
      const req = makeReq({ query: { limit: '10' } });
      const res = makeRes();
      getMyAttendanceMock.mockResolvedValue([{ id: 'attendance-1', staffId: 'guard-123' }]);

      await PatrolController.getMyAttendance(req, res, next);

      expect(getMyAttendanceMock).toHaveBeenCalledWith(ctx, 10);
      expect(res.json).toHaveBeenCalledWith([{ id: 'attendance-1', staffId: 'guard-123' }]);
    });

    it('forward startDate/endDate/cursor/limit cho /tenant/attendance de giu contract pagination va summary', async () => {
      const req = makeReq({
        query: {
          cursor: 'attendance-99',
          limit: '200',
          startDate: '2026-05-01',
          endDate: '2026-05-31',
          shift: 'week',
          vendor: 'vendor-1',
        },
      });
      const res = makeRes();
      getAttendanceMock.mockResolvedValue({
        records: [{ id: 'attendance-1', staffId: 'guard-123' }],
        nextCursor: 'attendance-100',
        summary: [{ staffId: 'guard-123', staffName: 'Guard 123', count: 8, lastActive: '2026-05-25T10:00:00.000Z' }],
      });

      await PatrolController.getAttendance(req, res, next);

      expect(getAttendanceMock).toHaveBeenCalledWith(
        ctx,
        {
          cursor: 'attendance-99',
          limit: 200,
          startDate: '2026-05-01',
          endDate: '2026-05-31',
          shift: 'week',
          vendor: 'vendor-1',
        },
      );
      expect(res.json).toHaveBeenCalledWith({
        records: [{ id: 'attendance-1', staffId: 'guard-123' }],
        nextCursor: 'attendance-100',
        summary: [{ staffId: 'guard-123', staffName: 'Guard 123', count: 8, lastActive: '2026-05-25T10:00:00.000Z' }],
      });
    });

    it('forward filter ops summary cho /tenant/attendance/ops-summary', async () => {
      const req = makeReq({
        query: {
          shift: 'week',
          site: 'site-1',
          contractId: 'contract-1',
        },
      });
      const res = makeRes();
      getAttendanceOpsSummaryMock.mockResolvedValue({
        period: 'week',
        totals: { scheduledShifts: 10 },
        urgentItems: [],
        dailyTrend: [],
      });

      await PatrolController.getAttendanceOpsSummary(req, res, next);

      expect(getAttendanceOpsSummaryMock).toHaveBeenCalledWith(ctx, {
        shift: 'week',
        site: 'site-1',
        contractId: 'contract-1',
      });
      expect(res.json).toHaveBeenCalledWith({
        period: 'week',
        totals: { scheduledShifts: 10 },
        urgentItems: [],
        dailyTrend: [],
      });
    });

    it('map alias /tenant/attendance/check-in sang CHECK_IN payload', async () => {
      const req = makeReq({
        body: {
          location: { lat: 10.1, lon: 106.7 },
          notes: 'start',
        },
      });
      const res = makeRes();
      checkAttendanceMock.mockResolvedValue({ id: 'attendance-check-in' });

      await PatrolController.checkInAttendance(req, res, next);

      expect(checkAttendanceMock).toHaveBeenCalledWith(ctx, {
        type: 'CHECK_IN',
        location: { lat: 10.1, lon: 106.7 },
        notes: 'start',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'attendance-check-in' });
    });

    it('map alias /tenant/attendance/check-out sang CHECK_OUT payload', async () => {
      const req = makeReq({
        body: {
          location: { lat: 10.1, lon: 106.7 },
        },
      });
      const res = makeRes();
      checkAttendanceMock.mockResolvedValue({ id: 'attendance-check-out' });

      await PatrolController.checkOutAttendance(req, res, next);

      expect(checkAttendanceMock).toHaveBeenCalledWith(ctx, {
        type: 'CHECK_OUT',
        location: { lat: 10.1, lon: 106.7 },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'attendance-check-out' });
    });
  });
});
