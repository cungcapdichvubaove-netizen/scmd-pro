import { describe, expect, it } from 'vitest';
import { resolveSeedPassword, shouldResetDemoSeedPasswords } from './seed-password.policy.js';

describe('seed password policy', () => {
  it('fail-fast khi production thieu SEED_SUPERADMIN_PASSWORD', () => {
    expect(() => resolveSeedPassword('SEED_SUPERADMIN_PASSWORD', {
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv)).toThrow('SEED_SUPERADMIN_PASSWORD is required in production');
  });

  it('fail-fast khi production SEED_SUPERADMIN_PASSWORD bi de trong', () => {
    expect(() => resolveSeedPassword('SEED_SUPERADMIN_PASSWORD', {
      NODE_ENV: 'production',
      SEED_SUPERADMIN_PASSWORD: '   ',
    } as NodeJS.ProcessEnv)).toThrow('SEED_SUPERADMIN_PASSWORD is required in production');
  });

  it('giu fallback tuong thich cho non-production', () => {
    expect(resolveSeedPassword('SEED_SUPERADMIN_PASSWORD', {
      NODE_ENV: 'development',
    } as NodeJS.ProcessEnv)).toBe('Admin@2025!');
  });

  it('production dung explicit SEED_SUPERADMIN_PASSWORD hop le', () => {
    expect(resolveSeedPassword('SEED_SUPERADMIN_PASSWORD', {
      NODE_ENV: 'production',
      SEED_SUPERADMIN_PASSWORD: 'StrongProductionPassword#2026',
    } as NodeJS.ProcessEnv)).toBe('StrongProductionPassword#2026');
  });

  it('khong reset demo password trong production du flag duoc bat', () => {
    expect(shouldResetDemoSeedPasswords({
      NODE_ENV: 'production',
      SEED_RESET_DEMO_PASSWORDS: 'true',
    } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('chi reset demo password o non-production khi bat flag ro rang', () => {
    expect(shouldResetDemoSeedPasswords({
      NODE_ENV: 'development',
      SEED_RESET_DEMO_PASSWORDS: 'true',
    } as NodeJS.ProcessEnv)).toBe(true);

    expect(shouldResetDemoSeedPasswords({
      NODE_ENV: 'development',
    } as NodeJS.ProcessEnv)).toBe(false);
  });
});
