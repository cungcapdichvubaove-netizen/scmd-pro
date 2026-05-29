import bcrypt from 'bcryptjs';
import axios from 'axios';
import { z } from 'zod';
import { logger } from '../../logger/index.js';
import { redisClient } from '../../redis.js';
import { CacheManager } from '../../cache/manager.js';
import { AuthService, type AuthPayload, type AuthTokenSource } from '../../../modules/auth/auth.service.js';
import { TenantRepository } from '../../../modules/tenant/tenant.repository.js';
import { StaffRepository } from '../../../modules/staff/staff.repository.js';
import { AuditService } from '../../audit/audit.service.js';
import { ROLE_PERMISSIONS } from '../../auth/permissions.js';
import { metrics } from '../../metrics.js';
import { loginSchema } from '../../../modules/auth/auth.schema.js';
import { 
  UnauthorizedError, 
  BadRequestError, 
  ForbiddenError,
  InternalServerError,
  ServiceUnavailableError
} from '../../errors/domain.error.js';
import { UserRole } from '../../architecture/types.js';

const MAX_LOGIN_ATTEMPTS_PER_IP = 20;
const MAX_LOGIN_ATTEMPTS_PER_USER = 5;
const ATTEMPT_TIMEOUT_SEC = 15 * 60;

// Internal schema for UseCase entry point including system-provided context
const loginUseCaseSchema = z.object({
  // Spread the base schema for UI fields
  ...loginSchema.shape,
  clientContext: z.object({
    ip: z.string(),
    userAgent: z.string(),
  }),
});

export type LoginInput = z.infer<typeof loginUseCaseSchema>;

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: AuthPayload['role'];
    tenantId: string;
    name: string;
    staffId?: string | null;
    permissions: string[];
    assignedVendorId?: string | null;
    assignedSiteId?: string | null;
    assignedContractId?: string | null;
  };
}

interface AuthenticatedStaff extends AuthTokenSource {
  password: string;
  status: string;
  staffId?: string | null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && Object.values(UserRole).includes(value as UserRole);
}

function isAuthenticatedStaff(value: unknown): value is AuthenticatedStaff {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthenticatedStaff>;
  return typeof user.id === 'string'
    && typeof user.username === 'string'
    && typeof user.password === 'string'
    && typeof user.tenantId === 'string'
    && typeof user.fullName === 'string'
    && typeof user.tokenVersion === 'number'
    && typeof user.status === 'string'
    && isUserRole(user.role);
}

export class LoginUseCase {
  async execute(input: LoginInput): Promise<LoginResponse> {
    // SEC-001: Strict Input Validation at UseCase Boundary (Zero Trust)
    const validated = loginUseCaseSchema.safeParse(input);
    if (!validated.success) {
      const errorDetails = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.warn({ details: errorDetails }, 'Login UseCase input validation failed');
      throw new BadRequestError(`Dữ liệu đăng nhập không hợp lệ: ${errorDetails}`);
    }

    const { 
      tenantCode, 
      username, 
      password, 
      captchaId, 
      captchaAnswer, 
      recaptchaToken,
      clientContext 
    } = validated.data;
    const { ip, userAgent } = clientContext;

    // 0. Verify reCAPTCHA
    const { isDatabaseUnreachable } = await import('../../db/prisma.js');
    const isMockMode = process.env.MOCK_MODE === 'true' || isDatabaseUnreachable();
    await this.verifyRecaptcha(recaptchaToken, isMockMode);

    // 1. Verify Math Captcha
    await this.verifyMathCaptcha(captchaId, captchaAnswer);

    // 2. Identify Tenant
    // RLS-FIX: Khi tenantCode = 'system'/'admin', đây là super-admin login path.
    // KHÔNG gọi resolveTenantId trước — bảng tenants có RLS SYSTEM-only và resolve
    // chạy ngoài transaction context. Super-admin lookup qua getByUsername tự xử lý
    // SYSTEM context đúng cách. Chỉ resolve tenant cho standard tenant login.
    const isSystemLogin = !tenantCode || tenantCode === 'system' || tenantCode === 'admin';
    const resolvedTenantId = isSystemLogin ? null : await this.resolveTenantId(tenantCode);

    // 3. Brute-force checks
    const { ipKey, userKey } = await this.checkBruteForce(tenantCode, username, ip);

    // 4. Authenticate User
    let user: AuthenticatedStaff | null = null;
    try {
      if (isSystemLogin) {
        // Super-admin login: chỉ lookup global, không cần tenant scope
        const superAdminCandidate = await StaffRepository.getByUsername(username, ip);
        if (superAdminCandidate && superAdminCandidate.role === UserRole.SUPER_ADMIN && isAuthenticatedStaff(superAdminCandidate)) {
          user = superAdminCandidate;
        }
        // Nếu không tìm thấy super-admin, để user = null → fail với Unauthorized
      } else if (resolvedTenantId) {
        // Standard tenant login: thử global lookup trước (super-admin có thể login ở bất kỳ workspace nào)
        const superAdminCandidate = await StaffRepository.getByUsername(username, ip);
        if (superAdminCandidate && superAdminCandidate.role === UserRole.SUPER_ADMIN && isAuthenticatedStaff(superAdminCandidate)) {
          user = superAdminCandidate;
        } else {
          // Scoped tenant login
          const tenantScopedCandidate = await StaffRepository.getByUsernameAndTenant(username, resolvedTenantId);
          user = isAuthenticatedStaff(tenantScopedCandidate) ? tenantScopedCandidate : null;
        }
      } else {
        throw new BadRequestError('Mã doanh nghiệp (Tenant Code) là bắt buộc cho tài khoản này.');
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      logger.error({ err: err instanceof Error ? err.message : err, username }, 'Database error during user lookup');
      throw new InternalServerError('Hệ thống đang gặp sự cố, vui lòng thử lại sau.');
    }

    if (!isAuthenticatedStaff(user)) {
      await this.recordFailedAttempt(ipKey, userKey, username, resolvedTenantId || 'system', ip, userAgent);
      throw new UnauthorizedError('Tài khoản hoặc mật khẩu không chính xác.');
    }

    const isAuthenticated = await bcrypt.compare(password, user.password);

    if (!isAuthenticated) {
      await this.recordFailedAttempt(ipKey, userKey, username, resolvedTenantId || 'system', ip, userAgent);
      throw new UnauthorizedError('Tài khoản hoặc mật khẩu không chính xác.');
    }

    // Security Check: Ensure user is active
    if (user.status !== 'active') {
      logger.warn({ username, tenantId: user.tenantId, status: user.status }, 'Access denied: Staff member is not active');
      throw new ForbiddenError('Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.');
    }

    // 5. Success Flow
    await this.handleSuccessfulLogin(user, ipKey, userKey, ip, userAgent);

    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    const { token, refreshToken, payload } = AuthService.generateAuthPayload(user, permissions);

    // Store refresh token with 7-day TTL
    // Wrap in try-catch: nếu Redis fail ở đây, user đã được xác thực thành công.
    // Không nên trả 500 chỉ vì không lưu được refresh token — access token vẫn hoạt động.
    try {
      await redisClient.setex(
        `refresh_token:${refreshToken}`, 
        7 * 24 * 60 * 60, 
        JSON.stringify(payload)
      );
    } catch (redisErr: unknown) {
      logger.error({ err: redisErr instanceof Error ? redisErr.message : redisErr, userId: user.id }, 'Failed to store refresh token in Redis. Login continues with access token only.');
    }

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId,
        name: user.fullName || user.username,
        staffId: user.staffId ?? null,
        permissions,
        assignedVendorId: user.assignedVendorId ?? null,
        assignedSiteId: user.assignedSiteId ?? null,
        assignedContractId: user.assignedContractId ?? null,
      }
    };
  }

  private async verifyRecaptcha(recaptchaToken: string | undefined, isMockMode: boolean) {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;

    if (recaptchaSecret && !isMockMode) {
      if (!recaptchaToken) {
        throw new BadRequestError('Vui lòng hoàn thành xác thực reCAPTCHA.');
      }
      try {
        const response = await axios.post(
          `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${recaptchaToken}`,
          {},
          { timeout: 3000 }
        );

        if (!response.data.success) {
          logger.warn({ 
            category: 'SECURITY',
            reason: response.data['error-codes'],
            action: 'login' 
          }, 'ReCAPTCHA verification failed.');
          throw new UnauthorizedError('Xác thực reCAPTCHA không hợp lệ.');
        }
      } catch (error: unknown) {
        if (error instanceof UnauthorizedError) throw error;

        const errorCode = error instanceof Error && 'code' in error ? String((error as Error & { code?: string }).code || 'service_error') : 'service_error';
        metrics.incrementCounter('recaptcha_failure', {
          action: 'login',
          reason: errorCode
        });

        logger.error({
          err: error instanceof Error ? error.message : error,
          category: 'SECURITY',
          alert_type: 'RECAPTCHA_UNAVAILABLE'
        }, 'ReCAPTCHA service unreachable. Login denied by fail-closed policy.');
        throw new ServiceUnavailableError('Không thể xác thực reCAPTCHA, vui lòng thử lại sau.');
      }
    }
  }

  private async verifyMathCaptcha(captchaId?: string, captchaAnswer?: string) {
    if (captchaId && captchaAnswer) {
      const savedAnswer = await redisClient.get(`captcha:${captchaId}`);
      if (!savedAnswer || savedAnswer !== captchaAnswer.toString()) {
        throw new UnauthorizedError('Mã xác nhận (Captcha) không chính xác.');
      }
      await redisClient.del(`captcha:${captchaId}`);
    }
  }

  private async resolveTenantId(tenantCode?: string): Promise<string | null> {
    if (!tenantCode) return null;
    try {
      const tenant = await TenantRepository.getBySubdomain(tenantCode);
      if (!tenant) throw new BadRequestError('Mã doanh nghiệp không tồn tại.');
      if (tenant.status !== 'active') throw new ForbiddenError('Doanh nghiệp của bạn đang bị tạm ngưng dịch vụ.');
      return tenant.id;
    } catch (err: unknown) {
      if (err instanceof BadRequestError || err instanceof ForbiddenError) throw err;
      logger.warn({ err: err instanceof Error ? err.message : err, tenantCode }, 'Tenant resolution error');
      throw new InternalServerError('Dịch vụ đang bận, vui lòng thử lại sau.');
    }
  }

  private async checkBruteForce(tenantCode: string | undefined, username: string, ip: string) {
    const ipKey = `login_attempts_ip:${ip}`;
    const userKey = `login_attempts_user:${tenantCode || 'system'}:${username}`;
    
    const [ipAttempts, userAttempts] = await Promise.all([
      redisClient.get(ipKey),
      redisClient.get(userKey)
    ]);
    
    if ((ipAttempts && parseInt(ipAttempts) >= MAX_LOGIN_ATTEMPTS_PER_IP) ||
        (userAttempts && parseInt(userAttempts) >= MAX_LOGIN_ATTEMPTS_PER_USER)) {
      logger.error({ ip, username, tenantCode }, 'Brute-force limit reached during login attempt');
      throw new Error('TOO_MANY_ATTEMPTS');
    }

    return { ipKey, userKey };
  }

  private async recordFailedAttempt(ipKey: string, userKey: string, username: string, tenantId: string, ip: string, userAgent: string) {
    await Promise.all([
      redisClient.incr(ipKey).then(() => redisClient.expire(ipKey, ATTEMPT_TIMEOUT_SEC)),
      redisClient.incr(userKey).then(() => redisClient.expire(userKey, ATTEMPT_TIMEOUT_SEC))
    ]);

    await AuditService.log({
      userId: 'anonymous',
      tenantId,
      action: 'LOGIN_FAILURE',
      resource: 'auth/login',
      status: 'FAILURE',
      payload: { username, reason: 'Invalid credentials' },
      ip,
      userAgent
    });
  }

  private async handleSuccessfulLogin(user: AuthenticatedStaff, ipKey: string, userKey: string, ip: string, userAgent: string) {
    await Promise.all([
      redisClient.del(ipKey),
      redisClient.del(userKey),
      CacheManager.set(`auth_metadata:${user.id}`, {
        tokenVersion: user.tokenVersion,
        status: user.status,
        role: user.role,
        tenantStatus: 'active',
        assignedVendorId: user.assignedVendorId ?? null,
        assignedSiteId: user.assignedSiteId ?? null,
        assignedContractId: user.assignedContractId ?? null,
      }, 60), // TTL reduced to 60s as per SCMD Pro v4.38.4 requirements
      CacheManager.set(`tenant:status:${user.tenantId}`, 'active', 3600)
    ]);

    await AuditService.log({
      userId: user.id,
      tenantId: user.tenantId,
      action: 'LOGIN',
      resource: 'auth/login',
      status: 'SUCCESS',
      ip,
      userAgent
    });
  }
}
