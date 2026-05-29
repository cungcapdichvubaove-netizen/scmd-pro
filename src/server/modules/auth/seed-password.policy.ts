const DEFAULT_SEED_PASSWORDS: Record<string, string> = {
  SEED_SUPERADMIN_PASSWORD: 'Admin@2025!',
  SEED_TENANT_ADMIN_PASSWORD: 'Demo@2025!',
  SEED_GUARD_PASSWORD: 'Guard@2025!',
};

export function resolveSeedPassword(envName: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[envName]?.trim();
  if (value) {
    return value;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(`${envName} is required in production before running seed. Set an explicit strong password and rotate it after first login.`);
  }

  const fallback = DEFAULT_SEED_PASSWORDS[envName];
  if (!fallback) {
    throw new Error(`${envName} is required before running seed.`);
  }

  return fallback;
}

export function shouldResetDemoSeedPasswords(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') {
    return false;
  }

  return env.SEED_RESET_DEMO_PASSWORDS === 'true';
}
