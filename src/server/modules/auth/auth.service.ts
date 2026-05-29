import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../../core/auth/secrets.js';
import { UserRole } from '../../core/architecture/types.js';

const MAX_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AuthPayload {
  id: string;
  username: string;
  role: UserRole;
  tenantId: string;
  tokenVersion: number;
  name: string;
  permissions: string[];
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
}

export interface AuthTokenSource {
  id: string;
  username: string;
  role: UserRole;
  tenantId: string;
  tokenVersion: number;
  fullName: string;
  assignedVendorId?: string | null;
  assignedSiteId?: string | null;
  assignedContractId?: string | null;
}

export class AuthService {
  static signToken(payload: AuthPayload) {
    const configuredTtl = process.env.JWT_EXPIRES_IN || '15m';
    const expiresIn = this.resolveAccessTokenTtl(configuredTtl);
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` });
  }

  private static resolveAccessTokenTtl(configuredTtl: string): string {
    const ttlSeconds = this.parseTtlSeconds(configuredTtl);
    if (ttlSeconds === null || ttlSeconds > MAX_ACCESS_TOKEN_TTL_SECONDS) {
      return '15m';
    }
    return configuredTtl;
  }

  private static parseTtlSeconds(value: string): number | null {
    const match = value.trim().match(/^(\d+)([smhd])$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = (match[2] ?? '').toLowerCase();
    const multiplier = unit === 's'
      ? 1
      : unit === 'm'
        ? 60
        : unit === 'h'
          ? 3600
          : 86400;

    return amount * multiplier;
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
    user: AuthTokenSource,
    permissions: string[]
  ): { token: string; refreshToken: string; payload: AuthPayload } {
    const payload: AuthPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
      name: user.fullName,
      permissions,
      assignedVendorId: user.assignedVendorId ?? null,
      assignedSiteId: user.assignedSiteId ?? null,
      assignedContractId: user.assignedContractId ?? null,
    };

    const token = this.signToken(payload);
    const refreshToken = crypto.randomUUID();

    return { token, refreshToken, payload };
  }
}
