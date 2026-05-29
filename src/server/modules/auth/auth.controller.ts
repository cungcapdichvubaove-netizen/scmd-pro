import { Request, Response, NextFunction } from 'express';
import cryptoMod from 'crypto';
import { loginSchema, trialRegisterSchema } from './auth.schema.js';
import { logger } from '../../core/logger/index.js';
import { redisClient } from '../../core/redis.js';
import { LoginUseCase } from '../../core/use-cases/auth/login.use-case.js';
import { RegisterTrialUseCase } from '../../core/use-cases/auth/register-trial.use-case.js';
import { RefreshTokenUseCase } from '../../core/use-cases/auth/refresh-token.use-case.js';
import { VerifyTrialUseCase } from '../../core/use-cases/auth/verify-trial.use-case.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { clearAuthCookies, getAuthCookies, getRefreshTokenCookie, hasValidCsrfToken, issueAuthCookies } from './auth.cookies.js';

export class AuthController {
  
  static async getCaptcha(_req: Request, res: Response, next: NextFunction) {
    try {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const captchaId = cryptoMod.randomUUID();
      const answer = (num1 + num2).toString();

      await redisClient.setex(`captcha:${captchaId}`, 300, answer);
      return res.json({ captchaId, num1, num2 });
    } catch (err: any) {
      return next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      
      const useCase = new LoginUseCase();
      const result = await useCase.execute({
        ...validated,
        clientContext: {
          ip: req.headers['x-forwarded-for'] as string || req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      issueAuthCookies(res, result.token, result.refreshToken);

      return res.json({
        user: result.user,
        csrfRequired: true,
      });
    } catch (err: any) {
      if (err.name === 'ZodError') return next(err);

      // FIX BUG-1: DomainError (UnauthorizedError, ForbiddenError, BadRequestError, NotFoundError)
      // có sẵn field `status` và `message` đúng — dùng trực tiếp thay vì map theo string cứng.
      // Trước đây statusMap chỉ map key tiếng Anh ('CAPTCHA_INVALID') nhưng UseCase throw
      // message tiếng Việt ('Mã xác nhận (Captcha) không chính xác.') → không match → 500.
      if (err.isDomainError === true && typeof err.status === 'number') {
        if (err.status >= 500) logger.error({ err }, 'Login domain error in controller');
        return res.status(err.status).json({ error: err.message });
      }

      const statusMap: Record<string, number> = {
        'RECAPTCHA_REQUIRED': 400,
        'RECAPTCHA_INVALID': 400,
        'CAPTCHA_INVALID': 400,
        'TENANT_NOT_FOUND': 404,
        'TENANT_SUSPENDED': 403,
        'TOO_MANY_ATTEMPTS': 429,
        'MISSING_TENANT_CODE': 400,
        'INVALID_CREDENTIALS': 401,
        'SYSTEM_UNAVAILABLE': 503,
        'SYSTEM_ERROR': 500
      };

      const messageMap: Record<string, string> = {
        'RECAPTCHA_REQUIRED': 'Thiếu mã xác thực reCAPTCHA.',
        'RECAPTCHA_INVALID': 'Xác thực reCAPTCHA không hợp lệ.',
        'CAPTCHA_INVALID': 'Captcha không chính xác hoặc đã hết hạn.',
        'TENANT_NOT_FOUND': 'Mã công ty không tồn tại. Vui lòng kiểm tra lại.',
        'TENANT_SUSPENDED': 'Tài khoản doanh nghiệp đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
        'TOO_MANY_ATTEMPTS': 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau 15 phút.',
        'MISSING_TENANT_CODE': 'Thiếu mã công ty.',
        'INVALID_CREDENTIALS': 'Tài khoản hoặc mật khẩu không đúng.',
        'SYSTEM_UNAVAILABLE': 'Hệ thống đang gặp sự cố kết nối. Vui lòng thử lại sau.',
        'SYSTEM_ERROR': 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
      };

      const status = statusMap[err.message] || 500;
      const message = messageMap[err.message] || (status === 500 ? 'Internal Server Error' : err.message);

      if (status === 500) logger.error({ err }, 'Login error in controller');

      return res.status(status).json({ error: message });
    }
  }

  static async trialRegister(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = trialRegisterSchema.parse(req.body);
      
      const useCase = new RegisterTrialUseCase();
      const result = await useCase.execute({
        ...(validatedData as any),
        clientContext: {
          ip: req.headers['x-forwarded-for'] as string || req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      return res.json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') return next(err);

      // DomainError có sẵn field `status` đúng — dùng trực tiếp, không map theo string.
      // Đồng nhất pattern với login handler để tránh 500 khi UseCase throw message tiếng Việt.
      if (err.isDomainError === true && typeof err.status === 'number') {
        if (err.status >= 500) logger.error({ err }, 'Trial registration domain error in controller');
        return res.status(err.status).json({ error: err.message });
      }

      const statusMap: Record<string, number> = {
        'RECAPTCHA_REQUIRED': 400,
        'RECAPTCHA_INVALID': 400,
        'RESERVED_SUBDOMAIN': 400,
        'TRIAL_COOLDOWN_ACTIVE': 429,
        'SUBDOMAIN_ALREADY_EXISTS': 400,
        'SYSTEM_ERROR': 500
      };

      const messageMap: Record<string, string> = {
        'RECAPTCHA_REQUIRED': 'Yêu cầu xác thực bot để đăng ký dùng thử.',
        'RECAPTCHA_INVALID': 'Xác thực bot không thành công. Vui lòng thử lại.',
        'RESERVED_SUBDOMAIN': 'Subdomain này không được phép sử dụng. Vui lòng chọn tên khác.',
        'TRIAL_COOLDOWN_ACTIVE': 'Email hoặc số điện thoại này đã được sử dụng để đăng ký dùng thử gần đây. Vui lòng thử lại sau 90 ngày.',
        'SUBDOMAIN_ALREADY_EXISTS': 'Subdomain này đã được sử dụng.',
        'SYSTEM_ERROR': 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
      };

      const status = statusMap[err.message] || 500;
      const message = messageMap[err.message] || (status === 500 ? 'Internal Server Error' : err.message);

      if (status === 500) logger.error({ err }, 'Trial registration error in controller');

      return res.status(status).json({ error: message });
    }
  }

  static async verifyTrialEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Token không hợp lệ" });
      }

      const useCase = new VerifyTrialUseCase();
      const result = await useCase.execute({ token });

      return res.json(result);
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        return res.status(400).json({ error: "Token đã hết hạn hoặc không tồn tại" });
      }
      logger.error({ err }, 'Trial verification error in controller');
      return next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasValidCsrfToken(req)) {
        logger.warn({ ip: req.ip }, 'CSRF Protection: refresh request rejected.');
        return res.status(403).json({ error: 'Từ chối truy cập: CSRF token không hợp lệ.' });
      }

      const cookies = getAuthCookies(req);
      const refreshToken = req.body?.refreshToken || getRefreshTokenCookie(cookies);
      if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

      const useCase = new RefreshTokenUseCase();
      const result = await useCase.execute({ refreshToken });
      issueAuthCookies(res, result.token, result.refreshToken);

      return res.json({ refreshed: true });
    } catch (err: any) {
      if (err.message === 'INVALID_REFRESH_TOKEN' || err.message === 'SESSION_EXPIRED') {
        const msg = err.message === 'INVALID_REFRESH_TOKEN' ? "Invalid refresh token or revoked" : "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.";
        return res.status(401).json({ error: msg });
      }
      logger.error({ err }, 'Token rotation failure in controller');
      return next(err);
    }
  }

  static async logout(req: Request, res: Response, _next: NextFunction) {
    if (!hasValidCsrfToken(req)) {
      logger.warn({ ip: req.ip }, 'CSRF Protection: logout request rejected.');
      return res.status(403).json({ error: 'Từ chối truy cập: CSRF token không hợp lệ.' });
    }

    const cookies = getAuthCookies(req);
    const refreshToken = req.body?.refreshToken || getRefreshTokenCookie(cookies);
    
    try {
      const ctx = RequestContextResolver.resolve(req);
      if (ctx) {
        await AuditService.log({
          userId: ctx.userId,
          tenantId: ctx.tenantId,
          action: 'LOGOUT',
          resource: 'auth/logout',
          status: 'SUCCESS',
          ip: ctx.clientContext?.ip || 'unknown',
          userAgent: ctx.clientContext?.userAgent || 'unknown'
        });
      }
    } catch (e) {
      logger.debug({ err: e }, 'Logout context not available - continuing');
    }

    if (refreshToken) {
      await redisClient.del(`refresh_token:${refreshToken}`);
    }
    clearAuthCookies(res);
    return res.json({ success: true });
  }
}
