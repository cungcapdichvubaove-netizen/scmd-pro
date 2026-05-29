import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('auth cookie policy', () => {
  it('uses secure __Host cookies by default in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_COOKIE_SECURE;

    const cookies = await import('./auth.cookies.js');

    expect(cookies.isAuthCookieSecure()).toBe(true);
    expect(cookies.AUTH_ACCESS_COOKIE).toBe('__Host-scmd_access');
    expect(cookies.AUTH_REFRESH_COOKIE).toBe('__Host-scmd_refresh');
  });

  it('uses local non-__Host cookies when desktop explicitly disables secure cookies', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SECURE = 'false';

    const cookies = await import('./auth.cookies.js');

    expect(cookies.isAuthCookieSecure()).toBe(false);
    expect(cookies.AUTH_ACCESS_COOKIE).toBe('scmd_access');
    expect(cookies.AUTH_REFRESH_COOKIE).toBe('scmd_refresh');
  });

  it('reads legacy secure cookies during local transition', async () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SECURE = 'false';

    const cookies = await import('./auth.cookies.js');
    const parsed = {
      '__Host-scmd_access': 'legacy-access',
      '__Host-scmd_refresh': 'legacy-refresh',
    };

    expect(cookies.getAccessTokenCookie(parsed)).toBe('legacy-access');
    expect(cookies.getRefreshTokenCookie(parsed)).toBe('legacy-refresh');
  });
});
