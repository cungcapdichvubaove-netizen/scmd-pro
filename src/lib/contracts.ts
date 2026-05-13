import { z } from 'zod';

/**
 * Shared Auth Contracts (Single Source of Truth)
 */

// 1. Login Contract
export const LoginRequestSchema = z.object({
  tenantCode: z.string().optional(),
  username: z.string().min(3, 'Tài khoản phải ít nhất 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
  captchaId: z.string().optional(),
  captchaAnswer: z.string().optional(),
  recaptchaToken: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// 2. Auth Response Contract
export interface AuthUser {
  id: string;
  username: string;
  role: 'guard' | 'supervisor' | 'technician' | 'tenant-admin' | 'super-admin';
  tenantId: string;
  name: string;
  permissions: string[];
  tokenVersion: number;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

// 3. Trial Registration Contract
// FIX [SECURITY]: Thêm recaptchaToken để validate bot protection ở tầng schema.
// Field optional để không breaking change với client chưa cập nhật —
// việc bắt buộc được enforce ở controller khi RECAPTCHA_SECRET_KEY được set.
export const TrialRegisterSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  phoneNumber: z.string().min(10, 'Số điện thoại không hợp lệ'),
  subdomain: z
    .string()
    .regex(
      /^[a-z0-9-]{3,30}$/,
      'Subdomain chỉ được chứa chữ thường, số và dấu gạch ngang (3-30 ký tự)'
    ),
  companyName: z.string().min(2, 'Tên công ty quá ngắn'),
  address: z.string().min(5, 'Địa chỉ không hợp lệ'),
  fullName: z.string().min(2, 'Họ tên quá ngắn'),
  recaptchaToken: z.string().optional(), // FIX: thêm field bot protection
  termsAccepted: z.boolean().refine(
    (val) => val === true,
    { message: 'Bạn phải đồng ý với Điều khoản dịch vụ và EULA của SCMD Pro' }
  ),
});

export type TrialRegisterRequest = z.infer<typeof TrialRegisterSchema>;
