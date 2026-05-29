import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { IncidentController } from './incident.controller.js';

const {
  resolveMock,
  loggerErrorMock,
  listExecuteMock,
  getExecuteMock,
  createExecuteMock,
  assignExecuteMock,
  updateStatusExecuteMock,
  exportExecuteMock,
  analyzeImageExecuteMock,
  submitFeedbackExecuteMock,
  acknowledgeExecuteMock,
  addEvidenceExecuteMock,
  updateEvidenceStatusExecuteMock,
  rejectResolutionExecuteMock,
  approveResolutionExecuteMock,
  closeExecuteMock,
} = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  listExecuteMock: vi.fn(),
  getExecuteMock: vi.fn(),
  createExecuteMock: vi.fn(),
  assignExecuteMock: vi.fn(),
  updateStatusExecuteMock: vi.fn(),
  exportExecuteMock: vi.fn(),
  analyzeImageExecuteMock: vi.fn(),
  submitFeedbackExecuteMock: vi.fn(),
  acknowledgeExecuteMock: vi.fn(),
  addEvidenceExecuteMock: vi.fn(),
  updateEvidenceStatusExecuteMock: vi.fn(),
  rejectResolutionExecuteMock: vi.fn(),
  approveResolutionExecuteMock: vi.fn(),
  closeExecuteMock: vi.fn(),
}));

vi.mock('../../core/context/index.js', () => ({
  RequestContextResolver: {
    resolve: resolveMock,
  },
}));

vi.mock('../../core/logger/index.js', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

vi.mock('./application/list-incidents.usecase.js', () => ({
  ListIncidentsUseCase: class {
    execute = listExecuteMock;
  },
}));

vi.mock('./application/get-incident.usecase.js', () => ({
  GetIncidentUseCase: class {
    execute = getExecuteMock;
  },
}));

vi.mock('./application/create-incident.usecase.js', () => ({
  CreateIncidentUseCase: class {
    execute = createExecuteMock;
  },
}));

vi.mock('./application/assign-incident.usecase.js', () => ({
  AssignIncidentUseCase: class {
    execute = assignExecuteMock;
  },
}));

vi.mock('./application/update-incident-status.usecase.js', () => ({
  UpdateIncidentStatusUseCase: class {
    execute = updateStatusExecuteMock;
  },
}));

vi.mock('./application/export-incident-pdf.usecase.js', () => ({
  ExportIncidentPdfUseCase: class {
    execute = exportExecuteMock;
  },
}));

vi.mock('./application/analyze-incident-image.usecase.js', () => ({
  AnalyzeIncidentImageUseCase: class {
    execute = analyzeImageExecuteMock;
  },
}));

vi.mock('./application/submit-anomaly-feedback.usecase.js', () => ({
  SubmitAnomalyFeedbackUseCase: class {
    execute = submitFeedbackExecuteMock;
  },
}));

vi.mock('./application/acknowledge-incident.usecase.js', () => ({
  AcknowledgeIncidentUseCase: class {
    execute = acknowledgeExecuteMock;
  },
}));

vi.mock('./application/add-incident-evidence.usecase.js', () => ({
  AddIncidentEvidenceUseCase: class {
    execute = addEvidenceExecuteMock;
  },
}));

vi.mock('./application/update-incident-evidence-status.usecase.js', () => ({
  UpdateIncidentEvidenceStatusUseCase: class {
    execute = updateEvidenceStatusExecuteMock;
  },
}));

vi.mock('./application/reject-incident-resolution.usecase.js', () => ({
  RejectIncidentResolutionUseCase: class {
    execute = rejectResolutionExecuteMock;
  },
}));

vi.mock('./application/approve-incident-resolution.usecase.js', () => ({
  ApproveIncidentResolutionUseCase: class {
    execute = approveResolutionExecuteMock;
  },
}));

vi.mock('./application/close-incident.usecase.js', () => ({
  CloseIncidentUseCase: class {
    execute = closeExecuteMock;
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
    setHeader: vi.fn(),
  } as unknown as Response;
}

describe('IncidentController', () => {
  const ctx = {
    userId: 'guard-1',
    tenantId: 'tenant-1',
    role: 'guard',
  } as any;

  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    resolveMock.mockReturnValue(ctx);
    next = vi.fn();
  });

  describe('create', () => {
    it('normalize severity, giữ nguyên contract scope, và map field optional đúng trước khi gọi use case', async () => {
      const req = makeReq({
        body: {
          type: 'SOS',
          severity: 'high',
          description: 'Có sự cố nghiêm trọng tại cổng chính',
          imageUri: null,
          location: { lat: 10.1, lng: 106.2 },
          vendorId: null,
          contractId: '11111111-1111-1111-1111-111111111111',
          siteId: '22222222-2222-2222-2222-222222222222',
        },
      });
      const res = makeRes();
      createExecuteMock.mockResolvedValue({ id: 'incident-1' });

      await IncidentController.create(req, res, next);

      expect(createExecuteMock).toHaveBeenCalledWith(ctx, {
        type: 'SOS',
        severity: IncidentSeverity.HIGH,
        description: 'Có sự cố nghiêm trọng tại cổng chính',
        imageUri: undefined,
        location: { lat: 10.1, lng: 106.2 },
        vendorId: undefined,
        contractId: '11111111-1111-1111-1111-111111111111',
        siteId: '22222222-2222-2222-2222-222222222222',
      });
      expect(res.json).toHaveBeenCalledWith({ id: 'incident-1' });
    });

    it('đẩy lỗi validation sang next và log lỗi khi payload create không hợp lệ', async () => {
      const req = makeReq({
        body: {
          severity: 'HIGH',
        },
      });
      const res = makeRes();

      await IncidentController.create(req, res, next);

      expect(createExecuteMock).not.toHaveBeenCalled();
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.objectContaining({ err: expect.anything() }), 'Failed to create incident');
      expect(next).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('assign', () => {
    it('map chính xác req.params.id và req.body.staffId vào assign use case để chặn staffId drift ở controller boundary', async () => {
      const req = makeReq({
        params: { id: 'incident-123' },
        body: { staffId: '33333333-3333-3333-3333-333333333333' },
      });
      const res = makeRes();
      assignExecuteMock.mockResolvedValue({ id: 'incident-123', assignedToId: '33333333-3333-3333-3333-333333333333' });

      await IncidentController.assign(req, res, next);

      expect(assignExecuteMock).toHaveBeenCalledWith(ctx, {
        incidentId: 'incident-123',
        staffId: '33333333-3333-3333-3333-333333333333',
      });
      expect(res.json).toHaveBeenCalledWith({ id: 'incident-123', assignedToId: '33333333-3333-3333-3333-333333333333' });
    });

    it('không cho staffId invalid lọt qua controller', async () => {
      const req = makeReq({
        params: { id: 'incident-123' },
        body: { staffId: 'not-a-uuid' },
      });
      const res = makeRes();

      await IncidentController.assign(req, res, next);

      expect(assignExecuteMock).not.toHaveBeenCalled();
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.objectContaining({ err: expect.anything() }), 'Failed to assign incident');
      expect(next).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('updateStatus', () => {
    it('truyền đầy đủ resolution và reopen fields sang use case', async () => {
      const req = makeReq({
        params: { id: 'incident-123' },
        body: {
          status: IncidentStatus.RESOLVED,
          resolutionNotes: 'Đã xử lý',
          resolutionImages: ['https://example.com/evidence-1.jpg'],
          requiredNextAction: 'FOLLOW_UP',
        },
      });
      const res = makeRes();
      updateStatusExecuteMock.mockResolvedValue({ id: 'incident-123', status: IncidentStatus.RESOLVED });

      await IncidentController.updateStatus(req, res, next);

      expect(updateStatusExecuteMock).toHaveBeenCalledWith(ctx, {
        id: 'incident-123',
        status: IncidentStatus.RESOLVED,
        resolutionNotes: 'Đã xử lý',
        resolutionImages: ['https://example.com/evidence-1.jpg'],
        reopenReason: undefined,
        requiredNextAction: 'FOLLOW_UP',
      });
      expect(res.json).toHaveBeenCalledWith({ id: 'incident-123', status: IncidentStatus.RESOLVED });
    });
  });

  describe('list', () => {
    it('giới hạn limit tối đa 200 và bật cache header cho resolved incidents', async () => {
      const req = makeReq({
        query: {
          status: 'resolved',
          type: 'SOS',
          limit: '999',
          cursor: 'cursor-1',
          view: 'ops',
          sortBy: 'reportedAt',
          sortOrder: 'asc',
          priorityOnly: 'true',
        },
      });
      const res = makeRes();
      listExecuteMock.mockResolvedValue({ data: [], nextCursor: null });

      await IncidentController.list(req, res, next);

      expect((res.setHeader as any)).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
      expect(listExecuteMock).toHaveBeenCalledWith(ctx, {
        status: 'resolved',
        type: 'SOS',
        limit: 200,
        cursor: 'cursor-1',
        view: 'ops',
        sortBy: 'reportedAt',
        sortOrder: 'asc',
        priorityOnly: true,
      });
    });
  });
});
