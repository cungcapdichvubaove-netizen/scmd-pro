const PLACEHOLDER_PATTERN = /replace_me|changeme|change_me|default_secret|fallback_secret/i;

const REQUIRED_PRODUCTION_SECRETS = [
  { key: 'JWT_SECRET', minLength: 64 },
  { key: 'INTERNAL_API_SECRET', minLength: 32 },
  { key: 'DEVICE_SECRET', minLength: 32 },
  { key: 'DATABASE_URL', minLength: 20 },
  { key: 'DIRECT_URL', minLength: 20 },
  { key: 'REDIS_PASSWORD', minLength: 16 },
] as const;

function isLocalProductionProfile() {
  const appUrl = process.env.APP_URL || '';
  const appEnv = process.env.APP_ENV || process.env.VITE_APP_ENV || '';
  const isLocalUrl = appUrl.startsWith('http://localhost') || appUrl.startsWith('http://127.0.0.1');
  const isExplicitLocalEnv = appEnv === 'local' || appEnv === 'development' || appEnv === 'desktop';
  const isLocalHttpCookieProfile = isLocalUrl && process.env.AUTH_COOKIE_SECURE === 'false';

  return process.env.NODE_ENV !== 'production' || isExplicitLocalEnv || isLocalHttpCookieProfile;
}

export function validateProductionSecrets() {
  if (isLocalProductionProfile()) {
    return;
  }

  const failures: string[] = [];

  if (process.env.AUTH_COOKIE_SECURE !== 'true') {
    failures.push('AUTH_COOKIE_SECURE: must be true for non-local production');
  }

  const appUrl = process.env.APP_URL || '';
  if (!appUrl || appUrl.startsWith('http://localhost') || appUrl.startsWith('http://127.0.0.1')) {
    failures.push('APP_URL: public production URL is required');
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS || '';
  if (!allowedOrigins || allowedOrigins.split(',').every((origin) => origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    failures.push('ALLOWED_ORIGINS: public production origin is required');
  }

  for (const { key, minLength } of REQUIRED_PRODUCTION_SECRETS) {
    const value = process.env[key] || '';
    if (!value) {
      failures.push(`${key}: missing`);
      continue;
    }

    if (value.length < minLength) {
      failures.push(`${key}: shorter than ${minLength} characters`);
    }

    if (PLACEHOLDER_PATTERN.test(value)) {
      failures.push(`${key}: placeholder/default value is not allowed`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`CRITICAL_PRODUCTION_SECRET_VALIDATION_FAILED: ${failures.join('; ')}`);
  }
}
