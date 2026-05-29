import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicContactLeadUnavailableError } from './application/submit-contact-lead.usecase.js';
import { getClientIp, isTurnstileRequired, validateContactLeadChallengeConfig, verifyTurnstileToken } from './contact-lead.controller.js';

vi.mock('../../core/logger/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe('ContactLeadController Turnstile verification', () => {
  it('requires Turnstile by default in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CONTACT_LEAD_TURNSTILE_REQUIRED;

    expect(isTurnstileRequired()).toBe(true);
  });

  it('does not require Turnstile by default outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CONTACT_LEAD_TURNSTILE_REQUIRED;

    expect(isTurnstileRequired()).toBe(false);
    expect(() => validateContactLeadChallengeConfig()).not.toThrow();
  });

  it('allows explicit local or desktop opt-out even when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'false';
    delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.VITE_TURNSTILE_SITE_KEY;

    expect(isTurnstileRequired()).toBe(false);
    expect(() => validateContactLeadChallengeConfig()).not.toThrow();
    await expect(verifyTurnstileToken(null)).resolves.toBe(true);
  });

  it('throws sanitized unavailable error when challenge is required but secret is missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    await expect(verifyTurnstileToken('token')).rejects.toBeInstanceOf(PublicContactLeadUnavailableError);
  });

  it('validates required production site key and secret at startup', () => {
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    process.env.VITE_TURNSTILE_SITE_KEY = 'site-key';

    expect(() => validateContactLeadChallengeConfig()).not.toThrow();
  });

  it('rejects missing production site key during startup validation', () => {
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    delete process.env.VITE_TURNSTILE_SITE_KEY;

    expect(() => validateContactLeadChallengeConfig()).toThrow(PublicContactLeadUnavailableError);
  });

  it('rejects missing token when challenge is required', async () => {
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';

    await expect(verifyTurnstileToken(null)).resolves.toBe(false);
  });

  it('accepts successful Cloudflare response', async () => {
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }));

    await expect(verifyTurnstileToken('valid-token', '127.0.0.1')).resolves.toBe(true);
  });

  it('fails closed on network error', async () => {
    process.env.CONTACT_LEAD_TURNSTILE_REQUIRED = 'true';
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(verifyTurnstileToken('token')).resolves.toBe(false);
  });
  it('does not trust x-forwarded-for from an untrusted remote socket', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
      ip: '198.51.100.20',
      socket: { remoteAddress: '198.51.100.20' },
    };

    expect(getClientIp(req as any)).toBe('198.51.100.20');
  });

  it('accepts x-forwarded-for only from a local trusted proxy', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    expect(getClientIp(req as any)).toBe('203.0.113.10');
  });
});
