import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../../logger/index.js';
import { redisClient } from '../../redis.js';
import { TenantRepository } from '../../../modules/tenant/tenant.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { metrics } from '../../metrics.js';
import { ServiceUnavailableError } from '../../errors/domain.error.js';

const TRIAL_COOLDOWN_DAYS = 90;
const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'www', 'mail', 'smtp', 'ftp', 'ssh',
  'dashboard', 'console', 'portal', 'system', 'root', 'support',
  'billing', 'status', 'static', 'cdn', 'media', 'assets',
  'auth', 'login', 'signup', 'register', 'verify', 'reset',
  'platform', 'internal', 'backend', 'frontend', 'test', 'dev', 'staging',
]);

export interface RegisterTrialInput {
  email: string;
  phoneNumber: string;
  subdomain: string;
  companyName: string;
  address: string;
  fullName: string;
  recaptchaToken?: string;
  clientContext: {
    ip: string;
    userAgent: string;
  };
}

export interface RegisterTrialResponse {
  success: boolean;
  tenantId: string;
  subdomain: string;
}

export class RegisterTrialUseCase {
  async execute(input: RegisterTrialInput): Promise<RegisterTrialResponse> {
    const { email, phoneNumber, subdomain, companyName, address, fullName, recaptchaToken, clientContext } = input;
    const { ip, userAgent } = clientContext;

    // 0. Verify reCAPTCHA
    const { isDatabaseUnreachable } = await import('../../db/prisma.js');
    const isMockMode = process.env.MOCK_MODE === 'true' || isDatabaseUnreachable();
    await this.verifyRecaptcha(recaptchaToken, ip, isMockMode);

    // 1. Reserved subdomain check
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      throw new Error('RESERVED_SUBDOMAIN');
    }

    // 2. Cooldown check (Atomic SET NX)
    const emailKey = `trial_email:${email}`;
    const phoneKey = `trial_phone:${phoneNumber}`;
    const ttlSeconds = TRIAL_COOLDOWN_DAYS * 24 * 3600;

    const [emailLock, phoneLock] = await Promise.all([
      redisClient.set(emailKey, 'used', 'EX', ttlSeconds, 'NX'),
      redisClient.set(phoneKey, 'used', 'EX', ttlSeconds, 'NX'),
    ]);

    if (!emailLock || !phoneLock) {
      if (emailLock) await redisClient.del(emailKey);
      if (phoneLock) await redisClient.del(phoneKey);
      throw new Error('TRIAL_COOLDOWN_ACTIVE');
    }

    let tenant;
    try {
      // 3. Database consistency checks
      const existingSubdomain = await TenantRepository.getBySubdomain(subdomain);
      if (existingSubdomain) throw new Error('SUBDOMAIN_ALREADY_EXISTS');

      // 4. Create Tenant
      tenant = await TenantRepository.save({
        name: companyName,
        subdomain,
        address,
        plan: 'TRIAL',
        maxEmployees: 2, // SCMD FREE limit: 2 Staff
        contactEmail: email,
        contactPhone: phoneNumber,
        ownerName: fullName,
        status: 'pending'
      });
    } catch (err: any) {
      // Rollback Redis locks
      await Promise.all([redisClient.del(emailKey), redisClient.del(phoneKey)]);
      if (err.message === 'SUBDOMAIN_ALREADY_EXISTS') throw err;
      logger.error({ err: err.message }, 'Trial registration database error');
      throw new Error('SYSTEM_ERROR');
    }

    // 5. Verification Token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await redisClient.setex(`trial_verify:${verifyToken}`, 24 * 3600, tenant.id);
    
    logger.info({ email, verifyToken }, `[EMAIL_MOCK] Verify trial: ${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify-trial?token=${verifyToken}`);

    // 6. Audit Logging
    await AuditService.log({
      userId: 'system/onboarding',
      tenantId: tenant.id,
      action: 'TRIAL_REGISTER',
      resource: `tenants/${tenant.id}`,
      status: 'SUCCESS',
      payload: { subdomain, companyName },
      ip,
      userAgent
    });

    return {
      success: true,
      tenantId: tenant.id,
      subdomain
    };
  }

  private async verifyRecaptcha(recaptchaToken: string | undefined, ip: string, isMockMode: boolean) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

    if (recaptchaSecret && !isMockMode) {
      if (!recaptchaToken) throw new Error('RECAPTCHA_REQUIRED');
      try {
        const response = await axios.post(
          `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`,
          {},
          { timeout: 3000 }
        );
        if (!response.data.success) {
          logger.warn({ ip }, 'Trial reCAPTCHA failed');
          throw new Error('RECAPTCHA_INVALID');
        }
      } catch (e: any) {
        if (e.message === 'RECAPTCHA_INVALID') throw e;

        metrics.incrementCounter('recaptcha_failure', { action: 'trial_register', reason: e.code || 'timeout' });
        logger.error({ 
          err: e.message, 
          category: 'SECURITY',
          alert_type: 'RECAPTCHA_UNAVAILABLE',
          action: 'trial_register'
        }, 'ReCAPTCHA service unreachable during trial register. Request denied by fail-closed policy.');
        throw new ServiceUnavailableError('Không thể xác thực reCAPTCHA, vui lòng thử lại sau.');
      }
    }
  }
}
