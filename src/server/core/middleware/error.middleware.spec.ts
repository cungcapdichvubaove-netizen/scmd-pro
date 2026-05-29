import { describe, expect, it, afterEach, vi } from 'vitest';
import { errorHandler } from './error.middleware.js';

vi.mock('../logger/index.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../metrics.js', () => ({
  metrics: {
    record: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    getHeader: vi.fn().mockReturnValue('trace-1'),
    headersSent: false,
  } as any;
}

describe('errorHandler', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sanitize unhandled 5xx message khi staging/demo public', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      APP_URL: 'https://staging.scmdpro.vn',
    };
    const res = makeRes();

    errorHandler(new Error('password failed for user scmduser'), { path: '/api/test', headers: {} } as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal Server Error',
        code: 'Error',
        traceId: 'trace-1',
      },
    });
  });

  it('giu DomainError message vi day la contract loi da sanitize', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      APP_URL: 'https://app.scmdpro.vn',
    };
    const res = makeRes();
    const err = {
      isDomainError: true,
      status: 409,
      name: 'CONFLICT',
      message: 'INVALID_STATE',
    };

    errorHandler(err, { path: '/api/test', headers: {} } as any, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'INVALID_STATE',
        code: 'CONFLICT',
      }),
    }));
  });
});
