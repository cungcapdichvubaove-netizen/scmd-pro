import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../core/logger/index.js';
import { submitContactLeadSchema } from './contact-lead.schema.js';
import {
  PublicContactLeadRateLimitError,
  PublicContactLeadUnavailableError,
  SubmitContactLeadUseCase,
} from './application/submit-contact-lead.usecase.js';

const trustedProxyCidrs = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function isTrustedProxyAddress(address: string | undefined) {
  if (!address) return false;
  const normalized = address.replace(/^::ffff:/, '');
  return trustedProxyCidrs.has(address) || trustedProxyCidrs.has(normalized);
}

export function getClientIp(req: Request) {
  const socketAddress = req.socket.remoteAddress;
  const forwardedFor = req.headers['x-forwarded-for'];

  if (isTrustedProxyAddress(socketAddress) && typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() || req.ip || socketAddress;
  }

  return req.ip || socketAddress;
}

function publicError(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function isTurnstileRequired() {
  return process.env.CONTACT_LEAD_TURNSTILE_REQUIRED === 'true' || (
    process.env.NODE_ENV === 'production' && process.env.CONTACT_LEAD_TURNSTILE_REQUIRED !== 'false'
  );
}

export function validateContactLeadChallengeConfig() {
  if (!isTurnstileRequired()) return;

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.VITE_TURNSTILE_SITE_KEY;

  if (!secret || !siteKey) {
    throw new PublicContactLeadUnavailableError(
      'Public contact lead challenge is required but Cloudflare Turnstile site key/secret is not configured.',
    );
  }
}

export async function verifyTurnstileToken(token: string | null | undefined, ip?: string) {
  if (!isTurnstileRequired()) return true;

  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.error({ code: 'TURNSTILE_SECRET_MISSING' }, 'Public contact lead challenge is required but secret is not configured');
    throw new PublicContactLeadUnavailableError('Contact lead challenge is not configured.');
  }

  if (!token) return false;

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  if (ip) params.set('remoteip', ip);

  const timeoutMs = Number(process.env.CONTACT_LEAD_TURNSTILE_TIMEOUT_MS || 3000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 3000);

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });

    if (!response.ok) return false;
    const payload = await response.json().catch(() => null) as { success?: boolean } | null;
    return Boolean(payload?.success);
  } catch (err) {
    const candidate = err as { name?: string };
    logger.warn({ name: candidate?.name || 'TurnstileVerificationError' }, 'Public contact lead challenge verification failed');
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function logSanitizedPublicError(err: unknown, message: string) {
  const candidate = err as { name?: string; code?: string; message?: string };
  logger.error({ name: candidate?.name, code: candidate?.code }, message);
}

export class ContactLeadController {
  static async submit(req: Request, res: Response, _next: NextFunction) {
    try {
      const parsed = submitContactLeadSchema.parse(req.body);
      const ip = getClientIp(req);

      const challengeOk = await verifyTurnstileToken(parsed.turnstileToken, ip);
      if (!challengeOk) {
        return res.status(400).json(publicError(
          'CONTACT_LEAD_CHALLENGE_REQUIRED',
          'Vui lòng hoàn tất bước xác minh bảo mật rồi gửi lại yêu cầu.',
        ));
      }

      const useCase = new SubmitContactLeadUseCase();
      const result = await useCase.execute(parsed, {
        ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(202).json(result);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        return res.status(400).json(publicError(
          'INVALID_CONTACT_LEAD_INPUT',
          'Thông tin liên hệ không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.',
          err.errors?.map((issue: any) => ({ path: issue.path, message: issue.message })),
        ));
      }

      if (err instanceof PublicContactLeadRateLimitError || err?.code === 'CONTACT_LEAD_EMAIL_RATE_LIMITED') {
        return res.status(429).json({
          ...publicError('CONTACT_LEAD_RATE_LIMITED', 'Bạn đã gửi quá nhiều yêu cầu trong ngày. Vui lòng thử lại sau.'),
          retryAfter: err.retryAfter || 24 * 60 * 60,
        });
      }

      if (err instanceof PublicContactLeadUnavailableError || err?.code === 'CONTACT_LEAD_UNAVAILABLE') {
        logSanitizedPublicError(err, 'Public contact lead temporarily unavailable');
        return res.status(503).json(publicError(
          'CONTACT_LEAD_UNAVAILABLE',
          'Kênh tiếp nhận liên hệ đang tạm thời gián đoạn. Vui lòng thử lại sau hoặc gửi email support@scmdpro.com.',
        ));
      }

      logSanitizedPublicError(err, 'Public contact lead submit failed');
      return res.status(503).json(publicError(
        'CONTACT_LEAD_UNAVAILABLE',
        'Kênh tiếp nhận liên hệ đang tạm thời gián đoạn. Vui lòng thử lại sau hoặc gửi email support@scmdpro.com.',
      ));
    }
  }
}
