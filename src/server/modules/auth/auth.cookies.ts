import { Request, Response } from 'express';
import crypto from 'crypto';

const SECURE_ACCESS_COOKIE = '__Host-scmd_access';
const SECURE_REFRESH_COOKIE = '__Host-scmd_refresh';
const LOCAL_ACCESS_COOKIE = 'scmd_access';
const LOCAL_REFRESH_COOKIE = 'scmd_refresh';

export const AUTH_CSRF_COOKIE = 'scmd_csrf';
export const AUTH_CSRF_HEADER = 'x-csrf-token';

export const isAuthCookieSecure = () => {
  const explicit = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

export const AUTH_ACCESS_COOKIE = isAuthCookieSecure() ? SECURE_ACCESS_COOKIE : LOCAL_ACCESS_COOKIE;
export const AUTH_REFRESH_COOKIE = isAuthCookieSecure() ? SECURE_REFRESH_COOKIE : LOCAL_REFRESH_COOKIE;

const cookieNameCandidates = (primary: string, fallback: string) => (
  primary === fallback ? [primary] : [primary, fallback]
);

export const AUTH_ACCESS_COOKIE_CANDIDATES = cookieNameCandidates(AUTH_ACCESS_COOKIE, SECURE_ACCESS_COOKIE);
export const AUTH_REFRESH_COOKIE_CANDIDATES = cookieNameCandidates(AUTH_REFRESH_COOKIE, SECURE_REFRESH_COOKIE);

export const getAccessTokenCookie = (cookies: Record<string, string>) => (
  AUTH_ACCESS_COOKIE_CANDIDATES.map((name) => cookies[name]).find(Boolean)
);

export const getRefreshTokenCookie = (cookies: Record<string, string>) => (
  AUTH_REFRESH_COOKIE_CANDIDATES.map((name) => cookies[name]).find(Boolean)
);

const accessMaxAgeMs = () => {
  const raw = process.env.AUTH_ACCESS_COOKIE_MAX_AGE_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000;
};

const refreshMaxAgeMs = () => {
  const raw = process.env.AUTH_REFRESH_COOKIE_MAX_AGE_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7 * 24 * 60 * 60 * 1000;
};

export const parseCookieHeader = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

export const getAuthCookies = (req: Request) => parseCookieHeader(req.headers.cookie);

export const issueAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const secure = isAuthCookieSecure();
  const sameSite = secure ? 'strict' : 'lax';
  const csrfToken = crypto.randomBytes(32).toString('base64url');

  res.cookie(AUTH_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: accessMaxAgeMs(),
  });

  res.cookie(AUTH_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: refreshMaxAgeMs(),
  });

  res.cookie(AUTH_CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
    maxAge: refreshMaxAgeMs(),
  });

  return csrfToken;
};

export const clearAuthCookies = (res: Response) => {
  const secure = isAuthCookieSecure();
  const sameSite = secure ? 'strict' : 'lax';

  for (const name of new Set([...AUTH_ACCESS_COOKIE_CANDIDATES, LOCAL_ACCESS_COOKIE])) {
    res.clearCookie(name, { path: '/', secure, sameSite });
    res.clearCookie(name, { path: '/', secure: true, sameSite: 'strict' });
  }
  for (const name of new Set([...AUTH_REFRESH_COOKIE_CANDIDATES, LOCAL_REFRESH_COOKIE])) {
    res.clearCookie(name, { path: '/', secure, sameSite });
    res.clearCookie(name, { path: '/', secure: true, sameSite: 'strict' });
  }
  res.clearCookie(AUTH_CSRF_COOKIE, { path: '/', secure, sameSite });
  res.clearCookie(AUTH_CSRF_COOKIE, { path: '/', secure: true, sameSite: 'strict' });
};

export const hasValidCsrfToken = (req: Request) => {
  const cookies = getAuthCookies(req);
  const csrfCookie = cookies[AUTH_CSRF_COOKIE];
  const csrfHeader = req.headers[AUTH_CSRF_HEADER];
  const csrfHeaderValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

  return Boolean(csrfCookie && csrfHeaderValue && csrfCookie === csrfHeaderValue);
};
