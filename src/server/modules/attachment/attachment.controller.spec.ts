import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { AttachmentController } from './attachment.controller.js';

const {
  resolveMock,
  createMock,
  uploadImageMock,
} = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  createMock: vi.fn(),
  uploadImageMock: vi.fn(),
}));

vi.mock('../../core/context/index.js', () => ({
  RequestContextResolver: {
    resolve: resolveMock,
  },
}));

vi.mock('./attachment.repository.js', () => ({
  AttachmentRepository: {
    create: createMock,
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../core/media/media.service.js', () => ({
  MediaService: {
    uploadImage: uploadImageMock,
  },
}));

function makeRes(): Response {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('AttachmentController.upload', () => {
  const originalEnv = { ...process.env };
  const ctx = {
    userId: 'staff-1',
    tenantId: 'tenant-1',
    role: 'guard',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    resolveMock.mockReturnValue(ctx);
    createMock.mockImplementation((_ctx, input) => Promise.resolve({ id: 'attachment-1', ...input }));
  });

  it('parse multipart tags JSON thành array trước khi lưu attachment', async () => {
    uploadImageMock.mockResolvedValue({
      url: 'https://storage.example.com/tenant-1/evidence.jpg',
      publicId: 'evidence.jpg',
      format: 'jpg',
      bytes: 128,
    });

    const req = {
      body: {
        category: 'INCIDENT',
        tags: JSON.stringify(['incident', 'camera']),
      },
      file: {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'evidence.jpg',
        size: 128,
      },
    } as Request;
    const res = makeRes();

    await AttachmentController.upload(req, res);

    expect(createMock).toHaveBeenCalledWith(ctx, expect.objectContaining({
      url: 'https://storage.example.com/tenant-1/evidence.jpg',
      tags: ['incident', 'camera'],
      category: 'INCIDENT',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('cho phép desktop/local fallback data URI do server tạo khi chưa cấu hình storage provider', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SECURE = 'false';
    process.env.APP_URL = 'http://localhost:3000';
    uploadImageMock.mockRejectedValue(new Error('NO_STORAGE_PROVIDER_CONFIGURED'));

    const req = {
      body: {
        category: 'INCIDENT',
        tags: JSON.stringify(['offline']),
      },
      file: {
        buffer: Buffer.from('local-image'),
        mimetype: 'image/jpeg',
        originalname: 'local.jpg',
        size: 11,
      },
    } as Request;
    const res = makeRes();

    await AttachmentController.upload(req, res);

    expect(createMock).toHaveBeenCalledWith(ctx, expect.objectContaining({
      url: expect.stringMatching(/^data:image\/jpeg;base64,/),
      tags: ['offline'],
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('production thật fail rõ ràng khi thiếu storage provider thay vì lưu Base64 fallback', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SECURE = 'true';
    process.env.APP_URL = 'https://app.scmdpro.vn';
    uploadImageMock.mockRejectedValue(new Error('NO_STORAGE_PROVIDER_CONFIGURED'));

    const req = {
      body: { category: 'INCIDENT' },
      file: {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'evidence.jpg',
        size: 128,
      },
    } as Request;
    const res = makeRes();

    await AttachmentController.upload(req, res);

    expect(createMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'ATTACHMENT_STORAGE_UNAVAILABLE',
    }));
  });

  it('không nhận data URI trực tiếp từ client khi không có uploaded file', async () => {
    const req = {
      body: {
        name: 'inline.jpg',
        url: 'data:image/jpeg;base64,aW1hZ2U=',
        fileType: 'image/jpeg',
        size: 5,
        category: 'INCIDENT',
      },
    } as Request;
    const res = makeRes();

    await AttachmentController.upload(req, res);

    expect(createMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'INVALID_ATTACHMENT_URL',
    }));
  });
  it('khong fallback Base64 cho public production chi vi AUTH_COOKIE_SECURE=false', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SECURE = 'false';
    process.env.APP_URL = 'https://app.scmdpro.vn';
    uploadImageMock.mockRejectedValue(new Error('NO_STORAGE_PROVIDER_CONFIGURED'));

    const req = {
      body: { category: 'INCIDENT' },
      file: {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'evidence.jpg',
        size: 128,
      },
    } as Request;
    const res = makeRes();

    await AttachmentController.upload(req, res);

    expect(createMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
