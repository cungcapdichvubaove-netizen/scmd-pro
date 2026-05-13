import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../../core/auth/secrets.js';

export interface AuthPayload {
  id: string;
  username: string;
  role: string;
  tenantId: string;
  tokenVersion: number;
  name: string;
  permissions: string[];
}

export class AuthService {
  static signToken(payload: AuthPayload) {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as any;
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  // NOTE [BUG #3 REMOVED]: signRefreshToken() đã bị xóa.
  // Lý do: Hệ thống dùng opaque UUID làm refresh token (lưu trong Redis), KHÔNG dùng JWT.
  // Nếu giữ lại hàm này, developer có thể nhầm dùng nó để issue JWT refresh token —
  // điều đó sẽ bypass hoàn toàn cơ chế rotation + revocation của Redis.
  // Xem: AuthController.generateAuthPayload() → crypto.randomUUID() làm refresh token.

  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  /**
   * Single source of truth cho JWT payload.
   * Mọi nơi cần tạo token phải gọi hàm này để đảm bảo payload nhất quán.
   */
  static generateAuthPayload(
    user: {
      id: string;
      username: string;
      role: string;
      tenantId: string;
      tokenVersion: number;
      fullName: string;
    },
    permissions: string[]
  ): { token: string; refreshToken: string; payload: AuthPayload } {
    const payload: AuthPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
      name: user.fullName,
      permissions
    };

    const token = this.signToken(payload);
    const refreshToken = crypto.randomUUID();

    return { token, refreshToken, payload };
  }
}
