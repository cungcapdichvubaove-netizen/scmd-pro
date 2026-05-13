import { AuthUser as SharedAuthUser } from '../../../lib/contracts.js';

export type AuthUser = SharedAuthUser;

export interface AuthProvider {
  verifyToken(token: string): Promise<AuthUser | null>;
  createToken(user: AuthUser, expiresIn?: string): Promise<string>;
}
