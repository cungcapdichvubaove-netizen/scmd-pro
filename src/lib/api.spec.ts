import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, resolveApiUrl } from './api.js';

describe('resolveApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('giữ URL tương đối khi không cấu hình VITE_API_URL để dùng same-origin/reverse proxy', () => {
    vi.stubEnv('VITE_API_URL', '');

    expect(resolveApiUrl('/api/v1/me')).toBe('/api/v1/me');
  });

  it('nối API path với origin cấu hình khi VITE_API_URL là origin', () => {
    vi.stubEnv('VITE_API_URL', 'https://app.scmdpro.vn');

    expect(resolveApiUrl('/api/v1/me')).toBe('https://app.scmdpro.vn/api/v1/me');
  });

  it('không nhân đôi /api khi VITE_API_URL đã chứa API prefix', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.scmdpro.vn/api/v1');

    expect(resolveApiUrl('/api/v1/me')).toBe('https://api.scmdpro.vn/api/v1/me');
  });

  it('không ép endpoint ngoài /api vào prefix /api/v1 khi VITE_API_URL bị cấu hình kèm API path', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.scmdpro.vn/api/v1');

    expect(resolveApiUrl('/tenant/settings')).toBe('https://api.scmdpro.vn/tenant/settings');
  });

  it('không thay đổi URL tuyệt đối do caller truyền vào', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.scmdpro.vn');

    expect(resolveApiUrl('https://other.scmdpro.vn/api/v1/me')).toBe('https://other.scmdpro.vn/api/v1/me');
  });
  it('gan status vao loi HTTP de UI co the xu ly 403 feature guard', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'FEATURE_DEPENDENCY_MISSING' }),
      {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'content-type': 'application/json' },
      },
    )));

    await expect(apiFetch('/api/tenant/vendor-scorecards', {
      suppressErrorToast: true,
    })).rejects.toMatchObject({
      message: 'FEATURE_DEPENDENCY_MISSING',
      status: 403,
      statusText: 'Forbidden',
    });
  });
});
