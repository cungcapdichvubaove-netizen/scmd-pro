import crypto from 'crypto';

import { db } from '../../../core/db/prisma.js';
import { logger } from '../../../core/logger/index.js';
import type { SubmitContactLeadInput } from '../contact-lead.schema.js';

export interface SubmitContactLeadContext {
  ip?: string;
  userAgent?: string;
}

export class PublicContactLeadRateLimitError extends Error {
  readonly code = 'CONTACT_LEAD_EMAIL_RATE_LIMITED';
  readonly retryAfter = 24 * 60 * 60;

  constructor() {
    super('Too many contact leads for this email in the last 24 hours.');
    this.name = 'PublicContactLeadRateLimitError';
  }
}

export class PublicContactLeadUnavailableError extends Error {
  readonly code = 'CONTACT_LEAD_UNAVAILABLE';

  constructor(message = 'Public contact lead intake is temporarily unavailable.') {
    super(message);
    this.name = 'PublicContactLeadUnavailableError';
  }
}

const TRACKING_CODE_RETRY_LIMIT = 5;
const DUPLICATE_WINDOW_MINUTES = 60;
const EMAIL_DAILY_LIMIT = 3;

function sha256(value: string | undefined | null) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeFingerprintText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function advisoryLockKey(value: string) {
  const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
  const unsigned = BigInt(`0x${hash}`);
  const signedMax = 1n << 63n;
  const unsignedMax = 1n << 64n;
  return unsigned >= signedMax ? unsigned - unsignedMax : unsigned;
}

async function acquireContactLeadLock(tx: { $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> }, key: string) {
  const lockKey = advisoryLockKey(`scmd:contact-lead:${key}`);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;
}

function createTrackingCode(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `CL-${stamp}-${random}`;
}

function normalizeP2002Target(target: unknown) {
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  return [];
}

function isTrackingCodeUniqueConstraintError(err: unknown) {
  const candidate = err as { code?: string; meta?: { target?: unknown } };
  if (candidate?.code !== 'P2002') return false;

  const targets = normalizeP2002Target(candidate.meta?.target);
  return targets.some((target) => target === 'tracking_code' || target === 'trackingCode' || target === 'contact_leads_tracking_code_key');
}

function contentFingerprint(input: SubmitContactLeadInput, normalizedEmail: string) {
  return sha256([
    normalizedEmail,
    normalizeFingerprintText(input.subject),
    normalizeFingerprintText(input.message),
  ].join('\n')) as string;
}

export class SubmitContactLeadUseCase {
  async execute(input: SubmitContactLeadInput, context: SubmitContactLeadContext = {}) {
    const normalizedEmail = normalizeEmail(input.email);
    const emailHash = sha256(normalizedEmail) as string;
    const contentHash = contentFingerprint(input, normalizedEmail);

    if (input.isHoneypotTriggered) {
      const trackingCode = createTrackingCode();
      logger.warn({ trackingCode, ipHash: sha256(context.ip) }, 'contact_lead_honeypot_blocked');
      return { trackingCode, status: 'RECEIVED' as const, deduplicated: false };
    }

    const now = new Date();
    const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
    const emailLimitSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const result = await db.withTenant('SYSTEM', async (tx) => {
      // Serialize all writes for the same normalized email. This makes duplicate suppression
      // and email daily throttle deterministic under burst concurrency without storing raw IP/email counters.
      await acquireContactLeadLock(tx, `email:${emailHash}`);

      const duplicate = await tx.contactLead.findFirst({
        where: {
          emailHash,
          contentHash,
          createdAt: { gte: duplicateSince },
          status: { not: 'SPAM' },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          trackingCode: true,
          createdAt: true,
        },
      });

      if (duplicate) {
        logger.info({ trackingCode: duplicate.trackingCode, emailHash }, 'contact_lead_duplicate_suppressed');
        return {
          trackingCode: duplicate.trackingCode,
          status: 'RECEIVED' as const,
          createdAt: duplicate.createdAt,
          deduplicated: true,
        };
      }

      const emailLeadCount = await tx.contactLead.count({
        where: {
          emailHash,
          createdAt: { gte: emailLimitSince },
          status: { not: 'SPAM' },
        },
      });

      if (emailLeadCount >= EMAIL_DAILY_LIMIT) {
        logger.warn({ emailHash }, 'contact_lead_email_rate_limited');
        throw new PublicContactLeadRateLimitError();
      }

      for (let attempt = 1; attempt <= TRACKING_CODE_RETRY_LIMIT; attempt += 1) {
        const trackingCode = createTrackingCode(now);
        try {
          const contactLead = await tx.contactLead.create({
            data: {
              trackingCode,
              fullName: input.fullName.trim(),
              email: normalizedEmail,
              emailHash,
              contentHash,
              company: input.company?.trim() || null,
              phone: input.phone?.trim() || null,
              subject: input.subject.trim(),
              message: input.message.trim(),
              intent: input.intent,
              source: input.source,
              status: 'NEW',
              ipHash: sha256(context.ip),
              userAgent: context.userAgent?.slice(0, 500) || null,
            },
            select: {
              id: true,
              trackingCode: true,
              status: true,
              createdAt: true,
            },
          });

          logger.info({ contactLeadId: contactLead.id, trackingCode: contactLead.trackingCode, emailHash }, 'contact_lead_received');

          return {
            trackingCode: contactLead.trackingCode,
            status: 'RECEIVED' as const,
            createdAt: contactLead.createdAt,
            deduplicated: false,
          };
        } catch (err) {
          if (isTrackingCodeUniqueConstraintError(err) && attempt < TRACKING_CODE_RETRY_LIMIT) {
            logger.warn({ attempt }, 'contact_lead_tracking_code_collision_retry');
            continue;
          }
          throw err;
        }
      }

      throw new PublicContactLeadUnavailableError('Unable to allocate a unique tracking code.');
    });

    return result;
  }
}
