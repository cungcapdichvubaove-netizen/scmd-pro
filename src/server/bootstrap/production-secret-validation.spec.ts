import { afterEach, describe, expect, it } from 'vitest';
import { validateProductionSecrets } from './production-secret-validation.js';

const originalEnv = { ...process.env };

function withEnv(values: Record<string, string | undefined>) {
  process.env = { ...originalEnv, ...values };
}

describe('validateProductionSecrets', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('bo qua profile desktop/local production khi APP_URL la localhost', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_URL: 'http://localhost:3000',
      AUTH_COOKIE_SECURE: 'false',
      JWT_SECRET: 'replace_me_with_strong_random_secret_min_64chars',
    });

    expect(() => validateProductionSecrets()).not.toThrow();
  });

  it('khong coi APP_URL localhost la local profile neu cookie secure van bat', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_URL: 'http://localhost:3000',
      ALLOWED_ORIGINS: 'http://localhost:3000',
      AUTH_COOKIE_SECURE: 'true',
      JWT_SECRET: 'replace_me_with_strong_random_secret_min_64chars',
      INTERNAL_API_SECRET: 'x'.repeat(32),
      DEVICE_SECRET: 'y'.repeat(32),
      DATABASE_URL: 'postgresql://user:pass@db:5432/scmd',
      DIRECT_URL: 'postgresql://user:pass@db:5432/scmd',
      REDIS_PASSWORD: 'z'.repeat(16),
    });

    expect(() => validateProductionSecrets()).toThrow(/APP_URL: public production URL is required/);
  });

  it('khong bypass secret validation cho public production chi vi AUTH_COOKIE_SECURE=false', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_URL: 'https://app.scmdpro.vn',
      ALLOWED_ORIGINS: 'https://app.scmdpro.vn',
      AUTH_COOKIE_SECURE: 'false',
      JWT_SECRET: 'replace_me_with_strong_random_secret_min_64chars',
      INTERNAL_API_SECRET: 'x'.repeat(32),
      DEVICE_SECRET: 'y'.repeat(32),
      DATABASE_URL: 'postgresql://user:pass@db:5432/scmd',
      DIRECT_URL: 'postgresql://user:pass@db:5432/scmd',
      REDIS_PASSWORD: 'z'.repeat(16),
    });

    expect(() => validateProductionSecrets()).toThrow(/AUTH_COOKIE_SECURE: must be true/);
  });

  it('bo qua profile desktop production khi APP_ENV=desktop duoc khai bao ro', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_ENV: 'desktop',
      APP_URL: 'http://scmd-desktop.local',
      AUTH_COOKIE_SECURE: 'false',
      JWT_SECRET: 'replace_me_with_strong_random_secret_min_64chars',
    });

    expect(() => validateProductionSecrets()).not.toThrow();
  });

  it('fail-fast production that neu con placeholder secret', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_URL: 'https://app.scmdpro.vn',
      ALLOWED_ORIGINS: 'https://app.scmdpro.vn',
      AUTH_COOKIE_SECURE: 'true',
      JWT_SECRET: 'replace_me_with_strong_random_secret_min_64chars',
      INTERNAL_API_SECRET: 'x'.repeat(32),
      DEVICE_SECRET: 'y'.repeat(32),
      DATABASE_URL: 'postgresql://user:pass@db:5432/scmd',
      DIRECT_URL: 'postgresql://user:pass@db:5432/scmd',
      REDIS_PASSWORD: 'z'.repeat(16),
    });

    expect(() => validateProductionSecrets()).toThrow(/JWT_SECRET: placeholder/);
  });

  it('chap nhan production that khi secret du manh va khong phai placeholder', () => {
    withEnv({
      NODE_ENV: 'production',
      APP_URL: 'https://app.scmdpro.vn',
      ALLOWED_ORIGINS: 'https://app.scmdpro.vn',
      AUTH_COOKIE_SECURE: 'true',
      JWT_SECRET: 'j'.repeat(64),
      INTERNAL_API_SECRET: 'i'.repeat(32),
      DEVICE_SECRET: 'd'.repeat(32),
      DATABASE_URL: 'postgresql://scmduser:strongpassword@db:5432/scmd_db?schema=public',
      DIRECT_URL: 'postgresql://scmduser:strongpassword@db:5432/scmd_db?schema=public',
      REDIS_PASSWORD: 'r'.repeat(16),
    });

    expect(() => validateProductionSecrets()).not.toThrow();
  });
});
